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

        public ConversationService(MessageDbContext context, ILogger<ConversationService> logger, IUserProfileRpcClient userProfileRpcClient)
        {
            _context = context;
            _logger = logger;
            _userProfileRpcClient = userProfileRpcClient;
        }

        public async Task AddMemberToGroupAsync(Guid conversationId, Guid userId, Guid targetUserId)
        {
            var conversation = await _context.Conversations
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted);

            if (conversation == null)
                throw new KeyNotFoundException("Conversation not found");

            if (conversation.Type != ConversationType.Group)
                throw new InvalidOperationException("Cannot add members to private conversation");

            var currentMember = conversation.Members.FirstOrDefault(m => m.UserId == userId && m.LeftAt == null);
            if (currentMember == null || currentMember.Role == MemberRole.Member)
                throw new UnauthorizedAccessException("Only admins/owners can add members");

            if (conversation.Members.Any(m => m.UserId == targetUserId && m.LeftAt == null))
                throw new InvalidOperationException("User is already a member");

            conversation.Members.Add(new ConversationMember
            {
                Id = Guid.NewGuid(),
                ConversationId = conversationId,
                UserId = targetUserId,
                Role = MemberRole.Member,
                JoinedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            _logger.LogInformation("User {TargetUserId} added to conversation {ConversationId} by {UserId}",
                targetUserId, conversationId, userId);
        }

        public async Task<ConversationDto> CreateGroupConversationAsync(Guid userId, CreateGroupConversationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Group name is required");

            if (request.MemberUserIds.Count < 1)
                throw new ArgumentException("Group must have at least one other member");

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
                JoinedAt = DateTime.UtcNow
            });

            // Add other members
            foreach (var memberId in request.MemberUserIds.Distinct())
            {
                if (memberId == userId) continue;

                conversation.Members.Add(new ConversationMember
                {
                    Id = Guid.NewGuid(),
                    ConversationId = conversation.Id,
                    UserId = memberId,
                    Role = MemberRole.Member,
                    JoinedAt = DateTime.UtcNow
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
                JoinedAt = DateTime.UtcNow
            });

            conversation.Members.Add(new ConversationMember
            {
                Id = Guid.NewGuid(),
                ConversationId = conversation.Id,
                UserId = request.OtherUserId,
                Role = MemberRole.Member,
                JoinedAt = DateTime.UtcNow
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

            // Lấy tất cả otherUserId của private conversations
            var privateOtherUserIds = result
                .Where(c => c.Type == ConversationType.Private)
                .Select(c => c.Members
                    .FirstOrDefault(m => m.UserId != userId && m.LeftAt == null)?.UserId)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToList();

            // Batch RPC — gọi song song, không tuần tự
            var profileCache = new Dictionary<Guid, UserProfileRpcResponse?>();
            if (privateOtherUserIds.Any())
            {
                var profileTasks = privateOtherUserIds.ToDictionary(
                    id => id,
                    id => _userProfileRpcClient.GetUserProfileAsync(id)
                );

                await Task.WhenAll(profileTasks.Values);

                foreach (var (id, task) in profileTasks)
                    profileCache[id] = task.Result;
            }

            // Map tất cả conversations với profileCache đã có sẵn
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
                    .Select(m => new ConversationMemberDto
                    {
                        UserId = m.UserId,
                        Role = m.Role.ToString(),
                        Nickname = m.Nickname,
                        LastReadAt = m.LastReadAt,
                        JoinedAt = m.JoinedAt
                    }).ToList()
            };
        }
    }
}
