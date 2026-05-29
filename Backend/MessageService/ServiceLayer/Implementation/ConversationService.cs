using MessageService.DTOs;
using MessageService.Models;
using MessageService.ServiceLayer.Interface;
using Microsoft.EntityFrameworkCore;

namespace MessageService.ServiceLayer.Implementation
{
    public class ConversationService : IConversationService
    {
        private readonly MessageDbContext _context;
        private readonly ILogger<ConversationService> _logger;
        private readonly IUserProfileRpcClient _userProfileRpcClient;
        private readonly IFriendListRpcClient _friendListRpcClient;

        public ConversationService(
            MessageDbContext context,
            ILogger<ConversationService> logger,
            IUserProfileRpcClient userProfileRpcClient,
            IFriendListRpcClient friendListRpcClient)
        {
            _context = context;
            _logger = logger;
            _userProfileRpcClient = userProfileRpcClient;
            _friendListRpcClient = friendListRpcClient;
        }

        public async Task AddMemberToGroupAsync(Guid conversationId, Guid userId, Guid targetUserId)
        {
            // Load conversation just for validation, then detach to avoid EF tracking conflicts
            var conversation = await _context.Conversations
                .AsNoTracking()
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted);

            if (conversation == null)
                throw new KeyNotFoundException("Conversation not found");

            if (conversation.Type != ConversationType.Group)
                throw new InvalidOperationException("Cannot add members to private conversation");

            var currentMember = conversation.Members.FirstOrDefault(m => m.UserId == userId && m.LeftAt == null);
            if (currentMember == null || currentMember.Role == MemberRole.Member)
                throw new UnauthorizedAccessException("Only admins/owners can add members");

            if (targetUserId == userId)
                throw new ArgumentException("Cannot add yourself to the group");

            if (conversation.Members.Any(m => m.UserId == targetUserId && m.LeftAt == null))
                throw new InvalidOperationException("User is already a member");

            await EnsureFriendsAsync(userId, new[] { targetUserId });

            // Detach conversation so EF won't try to UPDATE it when we add a member
            _context.Entry(conversation).State = EntityState.Detached;

            // Check if user is already an active member
            var existingMember = await _context.ConversationMembers
                .FirstOrDefaultAsync(m => m.ConversationId == conversationId && m.UserId == targetUserId);

            if (existingMember != null)
            {
                if (existingMember.LeftAt == null)
                {
                    throw new InvalidOperationException("User is already a member");
                }
                // Re-add a previously removed member
                existingMember.LeftAt = null;
                existingMember.JoinedAt = DateTime.UtcNow;
                existingMember.Role = MemberRole.Member;
                existingMember.LastReadAt = DateTime.UtcNow;
            }
            else
            {
                // New member - create fresh record
                var newMember = new ConversationMember
                {
                    Id = Guid.NewGuid(),
                    ConversationId = conversationId,
                    UserId = targetUserId,
                    Role = MemberRole.Member,
                    JoinedAt = DateTime.UtcNow,
                    LastReadAt = DateTime.UtcNow,
                };
                _context.ConversationMembers.Add(newMember);
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                throw new InvalidOperationException("Failed to add member due to a conflict. Please try again.");
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("duplicate") == true ||
                                              ex.InnerException?.Message.Contains("unique") == true)
            {
                throw new InvalidOperationException("Failed to add member due to a conflict. Please try again.");
            }

            _logger.LogInformation("User {TargetUserId} added to conversation {ConversationId} by {UserId}",
                targetUserId, conversationId, userId);
        }

        public async Task<ConversationDto> CreateGroupConversationAsync(Guid userId, CreateGroupConversationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Group name is required");

            var invitedMemberIds = request.MemberUserIds
                .Where(memberId => memberId != Guid.Empty && memberId != userId)
                .Distinct()
                .ToList();

            if (invitedMemberIds.Count < 2)
                throw new ArgumentException("Group chat must include at least 3 members");

            await EnsureFriendsAsync(userId, invitedMemberIds);

            var conversation = new Conversation
            {
                Id = Guid.NewGuid(),
                Type = ConversationType.Group,
                Name = request.Name,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                LastUpdatedAt = DateTime.UtcNow
            };

            // Add creator as Owner
            conversation.Members.Add(new ConversationMember
            {
                Id = Guid.NewGuid(),
                ConversationId = conversation.Id,
                UserId = userId,
                Role = MemberRole.Admin,
                JoinedAt = DateTime.UtcNow,
                LastReadAt = DateTime.UtcNow,
            });

            // Add other members
            foreach (var memberId in invitedMemberIds)
            {
                conversation.Members.Add(new ConversationMember
                {
                    Id = Guid.NewGuid(),
                    ConversationId = conversation.Id,
                    UserId = memberId,
                    Role = MemberRole.Member,
                    JoinedAt = DateTime.UtcNow,
                    LastReadAt = DateTime.UtcNow,
                });
            }

            _context.Conversations.Add(conversation);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Group conversation {ConversationId} created by {UserId} with {MemberCount} members",
                conversation.Id, userId, conversation.Members.Count);

            return await GetConversationByIdAsync(conversation.Id, userId);
        }

        public async Task<ConversationDto> CreatePrivateConversationAsync(Guid userId, CreatePrivateConversationRequest request)
        {
            if (request.OtherUserId == Guid.Empty)
                throw new ArgumentException("OtherUserId cannot be empty");
            if (userId == request.OtherUserId)
                throw new ArgumentException("Cannot create conversation with yourself");

            // Check if private conversation already exists between these users
            var existingConversation = await _context.Conversations
                .Include(c => c.Members)
                .Where(c => c.Type == ConversationType.Private && !c.IsDeleted)
                .Where(c => c.Members.Any(m => m.UserId == userId) &&
                            c.Members.Any(m => m.UserId == request.OtherUserId))
                .FirstOrDefaultAsync();

            if (existingConversation != null)
                return await GetConversationByIdAsync(existingConversation.Id, userId);

            var conversation = new Conversation
            {
                Id = Guid.NewGuid(),
                Type = ConversationType.Private,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                LastUpdatedAt = DateTime.UtcNow,
                Name = null,
                AvatarUrl = null
            };

            conversation.Members.Add(new ConversationMember
            {
                Id = Guid.NewGuid(),
                ConversationId = conversation.Id,
                UserId = userId,
                Role = MemberRole.Member,
                JoinedAt = DateTime.UtcNow,
                LastReadAt = DateTime.UtcNow,
            });

            // Add other member
            conversation.Members.Add(new ConversationMember
            {
                Id = Guid.NewGuid(),
                ConversationId = conversation.Id,
                UserId = request.OtherUserId,
                Role = MemberRole.Member,
                JoinedAt = DateTime.UtcNow,
                LastReadAt = DateTime.UtcNow,
            });

            _context.Conversations.Add(conversation);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Private conversation {ConversationId} created between {User1} and {User2}",
                 conversation.Id, userId, request.OtherUserId);

            return await GetConversationByIdAsync(conversation.Id, userId);
        }

        public async Task<ConversationDto> GetConversationByIdAsync(Guid conversationId, Guid userId)
        {
            var conversation = await _context.Conversations
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted);

            if (conversation == null)
                throw new KeyNotFoundException("Conversation not found");

            // Check user is a member
            if (!conversation.Members.Any(m => m.UserId == userId && m.LeftAt == null))
                throw new UnauthorizedAccessException("You are not a member of this conversation");

            return await MapToDtoAsync(conversation, userId);
        }

        public async Task<List<ConversationDto>> GetUserConversationsAsync(Guid userId, int skip = 0, int take = 20)
        {
            var conversationIds = await _context.ConversationMembers
                .Where(cm => cm.UserId == userId && cm.LeftAt == null)
                .Select(cm => cm.ConversationId)
                .ToListAsync();

            var result = await _context.Conversations
                .Where(c => conversationIds.Contains(c.Id) && !c.IsDeleted)
                .Include(c => c.Members)
                .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            // Collect ALL member userIds from both private and group conversations
            var allMemberUserIds = result
                .SelectMany(c => c.Members.Where(m => m.LeftAt == null))
                .Select(m => m.UserId)
                .Distinct()
                .ToList();

            // Batch RPC — fetch profiles for every member in one shot
            var profileCache = new Dictionary<Guid, UserProfileRpcResponse?>();
            if (allMemberUserIds.Any())
            {
                var profileTasks = allMemberUserIds.ToDictionary(
                    id => id,
                    id => _userProfileRpcClient.GetUserProfileAsync(id)
                );

                await Task.WhenAll(profileTasks.Values);

                foreach (var (id, task) in profileTasks)
                    profileCache[id] = task.Result;
            }

            // Map all conversations using the shared profileCache
            var dtos = new List<ConversationDto>();
            foreach (var conversation in result)
                dtos.Add(await MapToDtoAsync(conversation, userId, profileCache));

            return dtos;
        }

        public async Task LeaveGroupAsync(Guid conversationId, Guid userId)
        {
            var member = await _context.ConversationMembers
                .FirstOrDefaultAsync(m => m.ConversationId == conversationId && m.UserId == userId && m.LeftAt == null);

            if (member == null)
                throw new KeyNotFoundException("You are not a member of this conversation");

            
            member.LeftAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} left conversation {ConversationId}", userId, conversationId);
        }

        public async Task DeleteConversationAsync(Guid conversationId, Guid userId)
        {
            var conversation = await _context.Conversations
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted);

            if (conversation == null)
                throw new KeyNotFoundException("Conversation not found");

            var member = await _context.ConversationMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.ConversationId == conversationId && m.UserId == userId && m.LeftAt == null);

            if (member == null)
                throw new UnauthorizedAccessException("You are not a member of this conversation");

            var conversationToDelete = await _context.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId);
            if (conversationToDelete != null)
            {
                conversationToDelete.IsDeleted = true;
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation("Conversation {ConversationId} deleted by user {UserId}", conversationId, userId);
        }

        public async Task RemoveMemberFromGroupAsync(Guid conversationId, Guid userId, Guid targetUserId)
        {
            var conversation = await _context.Conversations
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted);

            if (conversation == null)
                throw new KeyNotFoundException("Conversation not found");

            if (conversation.Type != ConversationType.Group)
                throw new InvalidOperationException("Cannot remove members from private conversation");

            var currentMember = conversation.Members.FirstOrDefault(m => m.UserId == userId && m.LeftAt == null);
            if (currentMember == null || currentMember.Role == MemberRole.Member)
                throw new UnauthorizedAccessException("Only admins/owners can remove members");

            var targetMember = conversation.Members.FirstOrDefault(m => m.UserId == targetUserId && m.LeftAt == null);
            if (targetMember == null)
                throw new KeyNotFoundException("Target user is not a member");


            targetMember.LeftAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("User {TargetUserId} removed from conversation {ConversationId} by {UserId}",
                targetUserId, conversationId, userId);
        }

        private async Task EnsureFriendsAsync(Guid userId, IEnumerable<Guid> targetUserIds)
        {
            var requestedIds = targetUserIds.Distinct().ToList();
            if (requestedIds.Count == 0) return;

            var friends = await _friendListRpcClient.GetFriendListAsync(userId, 0, 5000);
            if (friends == null)
            {
                _logger.LogWarning("Friend list RPC returned null for user {UserId}, assuming no friends", userId);
                throw new UnauthorizedAccessException("Unable to verify friend status. Please try again.");
            }
            var friendIds = friends.Select(f => f.UserId).ToHashSet();
            var nonFriendIds = requestedIds.Where(id => !friendIds.Contains(id)).ToList();

            if (nonFriendIds.Count > 0)
                throw new UnauthorizedAccessException("Group members must be friends of the current user");
        }

        private async Task<ConversationDto> MapToDtoAsync(
                Conversation conversation,
                Guid currentUserId,
                Dictionary<Guid, UserProfileRpcResponse?>? profileCache = null)
        {
            string? displayName = conversation.Name;
            string? avatarUrl = conversation.AvatarUrl;

            // Private conversation — lấy info từ cache, không RPC lại
            if (conversation.Type == ConversationType.Private)
            {
                var otherMember = conversation.Members
                    .FirstOrDefault(m => m.UserId != currentUserId && m.LeftAt == null);

                if (otherMember != null)
                {
                    UserProfileRpcResponse? profile = null;

                    if (profileCache != null && profileCache.TryGetValue(otherMember.UserId, out var cached))
                    {
                        // Lấy từ cache — không RPC thêm
                        profile = cached;
                    }
                    else
                    {
                        // Fallback — gọi RPC đơn lẻ (dùng cho GetConversationByIdAsync)
                        profile = await _userProfileRpcClient
                            .GetUserProfileAsync(otherMember.UserId);
                    }

                    if (profile?.Found == true)
                    {
                        displayName = profile.DisplayName;
                        avatarUrl = profile.AvatarUrl;
                    }
                }
            }

            // Tính unread count
            var currentMember = conversation.Members
                .FirstOrDefault(m => m.UserId == currentUserId);
            var unreadCount = 0;

            if (currentMember?.LastReadAt != null)
            {
                unreadCount = await _context.Messages
                    .CountAsync(m => m.ConversationId == conversation.Id &&
                                     !m.IsDeleted &&
                                     m.CreatedAt > currentMember.LastReadAt &&
                                     m.SenderId != currentUserId);
            }
            else
            {
                unreadCount = await _context.Messages
                    .CountAsync(m => m.ConversationId == conversation.Id &&
                                     !m.IsDeleted &&
                                     m.SenderId != currentUserId);
            }

            return new ConversationDto
            {
                Id = conversation.Id,
                Type = conversation.Type.ToString(),
                Name = displayName,
                AvatarUrl = avatarUrl,
                LastMessageContent = conversation.LastMessageContent,
                LastMessageSenderId = conversation.LastMessageSenderId,
                LastMessageAt = conversation.LastMessageAt,
                UnreadCount = unreadCount,
                CreatedAt = conversation.CreatedAt,
                Members = conversation.Members
                    .Where(m => m.LeftAt == null)
                    .Select(m =>
                    {
                        UserProfileRpcResponse? profile = null;

                        if (profileCache != null && profileCache.TryGetValue(m.UserId, out var cached))
                        {
                            profile = cached;
                        }
                        else
                        {
                            // profileCache is null when called from CreatePrivateConversationAsync.
                            // Fallback: call RPC directly for this member so members always have
                            // displayName and avatarUrl populated, even for brand-new conversations.
                            profile = _userProfileRpcClient
                                .GetUserProfileAsync(m.UserId).Result;
                        }

                        return new ConversationMemberDto
                        {
                            UserId = m.UserId,
                            Role = m.Role.ToString(),
                            Nickname = m.Nickname,
                            LastReadAt = m.LastReadAt,
                            JoinedAt = m.JoinedAt,
                            DisplayName = profile?.Found == true ? profile.DisplayName : null,
                            AvatarUrl = profile?.Found == true ? profile.AvatarUrl : null,
                        };
                    }).ToList()
            };
        }
    }
}
