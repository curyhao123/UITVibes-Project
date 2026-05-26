using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using PostService.DTOs;
using PostService.Messaging.Interface;
using PostService.Models;
using PostService.ServiceLayer.Interface;
using System.Text.RegularExpressions;

namespace PostService.ServiceLayer.Implementation
{
    public class ReelService : IReelService
    {
        private readonly PostDbContext _context;
        private readonly ILogger<ReelService> _logger;
        private readonly IUserProfileRpcClient _userProfileRpcClient;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly IPostLikedPublisher _postLikedPublisher;
        private readonly IPostCommentedPublisher _postCommentedPublisher;
        private readonly ICommentMentionedPublisher _commentMentionedPublisher;
     

        public ReelService(PostDbContext context, ILogger<ReelService> logger, 
            IUserProfileRpcClient userProfileRpcClient, ICloudinaryService cloudinaryService,
            IPostLikedPublisher postLikedPublisher, IPostCommentedPublisher postCommentedPublisher,
            ICommentMentionedPublisher commentMentionedPublisher)
        {
            _context = context;
            _logger = logger;
            _userProfileRpcClient = userProfileRpcClient;
            _cloudinaryService = cloudinaryService;
            _postLikedPublisher = postLikedPublisher;
            _postCommentedPublisher = postCommentedPublisher;
            _commentMentionedPublisher = commentMentionedPublisher;
        }

        // CRUD
        // Upload video — gọi trước khi tạo Reel
        public async Task<ReelMediaUploadResponse> UploadVideoAsync(IFormFile file)
        {
            // Dùng folder riêng cho reels để dễ quản lý trên Cloudinary
            var (videoUrl, thumbnailUrl, publicId, duration) =
                await _cloudinaryService.UploadVideoAsync(file, folder: "reels");

            return new ReelMediaUploadResponse
            {
                VideoUrl = videoUrl,
                VideoPublicId = publicId,
                ThumbnailUrl = thumbnailUrl,
                Duration = duration ?? 0
            };
        }

        public async Task<ReelDto> CreateReelAsync(Guid userId, CreateReelRequest request)
        {
            var userProfile = await _userProfileRpcClient.GetProfileAsync(userId);
            if (userProfile == null)
            {
                _logger.LogWarning("User profile not found for userId: {UserId}", userId);
                throw new Exception("User profile not found");
            }

            // Create reel entity
            var reel = new Reel
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                VideoUrl = request.VideoUrl,
                VideoPublicId = request.VideoPublicId,
                ThumbnailUrl = request.ThumbnailUrl,
                ThumbnailPublicId = request.ThumbnailPublicId,
                Caption = request.Caption,
                Duration = request.Duration,
                CreatedAt = DateTime.UtcNow
            };
            // Save to database
            _context.Reels.Add(reel);
            await _context.SaveChangesAsync();

            
            // Map to DTO
            var reelDto = new ReelDto
            {
                Id = reel.Id,
                UserId = reel.UserId,
                OwnerDisplayName = userProfile?.DisplayName ?? "Someone",
                OwnerAvatarUrl = userProfile?.AvatarUrl,
                VideoUrl = reel.VideoUrl,
                ThumbnailUrl = reel.ThumbnailUrl,
                Caption = reel.Caption,
                Duration = reel.Duration,
                LikeCount = 0,
                CommentCount = 0,
                ShareCount = 0,
                ViewCount = 0,
                IsLiked = false,
                IsOwner = true,
                CreatedAt = reel.CreatedAt
            };
            return reelDto;
        }
        // Xóa Reel — xóa cả video trên Cloudinary
        public async Task DeleteReelAsync(Guid reelId, Guid userId)
        {
            var reel = await _context.Reels
                .FirstOrDefaultAsync(r => r.Id == reelId);

            if (reel == null)
                throw new KeyNotFoundException("Reel not found");

            if (reel.UserId != userId)
                throw new UnauthorizedAccessException("You are not the owner of this reel");

            // Xóa video trên Cloudinary trước
            await _cloudinaryService.DeleteMediaAsync(reel.VideoPublicId);

            // Xóa thumbnail nếu có
            if (!string.IsNullOrEmpty(reel.ThumbnailPublicId))
                await _cloudinaryService.DeleteMediaAsync(reel.ThumbnailPublicId);

            _context.Reels.Remove(reel);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Reel deleted: ReelId={ReelId}, OwnerId={OwnerId}",
                reelId, userId);
        }

        public async Task<ReelDto> GetReelByIdAsync(Guid reelId, Guid? currentUserId)
        {
            var reel = await _context.Reels
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == reelId);
            if (reel == null)
                throw new KeyNotFoundException("Reel not found");


            // Chạy song song để tăng hiệu năng
            var userProfileTask = _userProfileRpcClient.GetProfileAsync(reel.UserId);
            var likeCountTask = _context.ReelLikes.CountAsync(l => l.ReelId == reelId);
            var commentCountTask = _context.ReelComments.CountAsync(c => c.ReelId == reelId);
            var shareCountTask = _context.ReelShares.CountAsync(s => s.ReelId == reelId);
            var isLikedTask = currentUserId.HasValue
                ? _context.ReelLikes.AnyAsync(l => l.ReelId == reelId && l.UserId == currentUserId.Value)
                : Task.FromResult(false);

            await Task.WhenAll(userProfileTask, likeCountTask, commentCountTask, shareCountTask, isLikedTask);

            var userProfile = await userProfileTask;
            if (userProfile == null)
                _logger.LogWarning("User profile not found for UserId: {UserId}", reel.UserId);

            // Map to DTO
            var reelDto = new ReelDto
            {
                Id = reel.Id,
                UserId = reel.UserId,
                OwnerDisplayName = userProfile?.DisplayName ?? "Someone",
                OwnerAvatarUrl = userProfile?.AvatarUrl,
                VideoUrl = reel.VideoUrl,
                ThumbnailUrl = reel.ThumbnailUrl,
                Caption = reel.Caption,
                Duration = reel.Duration,
                LikeCount = likeCountTask.Result,
                CommentCount = commentCountTask.Result,
                ShareCount = shareCountTask.Result,
                ViewCount = reel.ViewCount,
                IsLiked = isLikedTask.Result,
                IsOwner = currentUserId.HasValue && currentUserId.Value == reel.UserId,
                CreatedAt = reel.CreatedAt
            };
            return reelDto;
        }

        public async Task<List<ReelDto>> GetReelsAsync(int skip, int take, Guid? currentUserId)
        {
            var reels = await _context.Reels
                .AsNoTracking()
                .OrderBy(r => Guid.NewGuid()) // Random order for discover feed
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            return await MapReelsAsync(reels, currentUserId);
        }

        public async Task<List<ReelDto>> GetReelsByUserAsync(Guid userId, int skip, int take, Guid? currentUserId)
        {
            var reels = await _context.Reels
                .AsNoTracking()
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            return await MapReelsAsync(reels, currentUserId);
        }

        // Tương tác
        public async Task LikeReelAsync(Guid reelId, Guid userId)
        {
            var reel = await _context.Reels.FirstOrDefaultAsync(r => r.Id == reelId);
            if (reel == null)
                throw new KeyNotFoundException("Reel not found");

            var existingLike = await _context.ReelLikes
                .FirstOrDefaultAsync(l => l.ReelId == reelId && l.UserId == userId);
            if (existingLike != null)
                return; // Đã like rồi, không làm gì
            var like = new ReelLike
            {
                Id = Guid.NewGuid(),
                ReelId = reelId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            _context.ReelLikes.Add(like);
            await _context.SaveChangesAsync();

            var likerProfile = await _userProfileRpcClient.GetProfileAsync(userId);
            var likerName = likerProfile.Found ? likerProfile.DisplayName : "Someone";

            try
            {
                await _postLikedPublisher.PublishAsync(new PostLikedEvent(
                    reel.UserId,
                    userId,
                    likerName,
                    reelId));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish PostLikedevent for reel {reelId}", reelId);
            }

        }
        public async Task UnlikeReelAsync(Guid reelId, Guid userId)
        {
            var existingLike = await _context.ReelLikes
                .FirstOrDefaultAsync(l => l.ReelId == reelId && l.UserId == userId);
            if (existingLike == null)
                return; // Chưa like, không làm gì
            _context.ReelLikes.Remove(existingLike);
            await _context.SaveChangesAsync();
        }
        public async Task IncrementViewCountAsync(Guid reelId)
        {
            var reel = await _context.Reels
                .FirstOrDefaultAsync(r => r.Id == reelId);
            if (reel == null)
                throw new KeyNotFoundException("Reel not found");
            reel.ViewCount += 1;
            await _context.SaveChangesAsync();
        }
        public async Task ShareReelAsync(Guid reelId, Guid userId)
        {
            var share = new ReelShare
            {
                Id = Guid.NewGuid(),
                ReelId = reelId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            _context.ReelShares.Add(share);
            await _context.SaveChangesAsync();
        }

        private List<string> ExtractMentions(string content)
        {
            if (string.IsNullOrWhiteSpace(content))
            {
                return [];
            }
            var regex = new Regex(@"@(\w+)", RegexOptions.IgnoreCase);
            var matches = regex.Matches(content);
            return matches.Select(m => m.Groups[1].Value.ToLower()).Distinct().ToList();
        }

        private async Task ProcessMentionsAsync(Reel reel, ReelComment comment, List<string> usernames)
        {
            if (usernames.Count == 0)
                return;
            var mentionerProfile = await _userProfileRpcClient.GetProfileAsync(comment.UserId);
            var mentionerName = mentionerProfile?.Found == true ? mentionerProfile.DisplayName : "Someone";
            var commentPreview = comment.Content.Length <= 100
                ? comment.Content
                : comment.Content[..100];


            foreach (var username in usernames)
            {
                var mentionedUserResult = await _userProfileRpcClient.GetProfileAsync(username);
                if (mentionedUserResult?.Found != true || mentionedUserResult.UserId == Guid.Empty)
                {
                    continue;
                }

                if (mentionedUserResult.UserId == comment.UserId)
                {
                    continue;
                }

                try
                {
                    await _commentMentionedPublisher.PublishAsync(new CommentMentionedEvent(
                        mentionedUserResult.UserId,
                        comment.UserId,
                        mentionerName,
                        reel.Id,
                        comment.Id,
                        commentPreview));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to publish CommentMentioned event for comment {CommentId}", comment.Id);
                }
            }
        }

        // Comment
        public async Task<ReelCommentDto> CreateCommentAsync(Guid reelId, Guid userId, CreateReelCommentRequest request)
        {
            var reel = await _context.Reels
                .FirstOrDefaultAsync(r => r.Id == reelId);
            if (reel == null)
                throw new KeyNotFoundException("Reel not found");

            var userProfile = await _userProfileRpcClient.GetProfileAsync(userId);
            if (userProfile == null)
            {
                _logger.LogWarning("User profile not found for UserId: {UserId}", userId);
                throw new Exception("User profile not found");
            }


            // If replying to a comment, flatten to root (flattened threading)
            Guid? rootCommentId = null;
            if (request.ParentCommentId.HasValue)
            {
                var parentComment = await _context.ReelComments
                    .FirstOrDefaultAsync(c => c.Id == request.ParentCommentId.Value);

                if (parentComment == null)
                    throw new KeyNotFoundException("Parent comment not found");

                // Find root comment (could be parent itself if already top-level)
                var rootComment = parentComment.ParentCommentId == null
                    ? parentComment
                    : await _context.ReelComments
                        .FirstOrDefaultAsync(c => c.Id == parentComment.ParentCommentId);

                if (rootComment == null)
                    throw new KeyNotFoundException("Root comment not found");

                // All replies point to root comment
                rootCommentId = rootComment.Id;
                rootComment.ReplyCount += 1; // Increment reply count on root comment
            }

            // Create comment — ParentCommentId always points to root
            var comment = new ReelComment
            {
                Id = Guid.NewGuid(),
                ReelId = reelId,
                UserId = userId,
                Content = request.Content,
                ParentCommentId = rootCommentId,
                CreatedAt = DateTime.UtcNow
            };

            _context.ReelComments.Add(comment);
            await _context.SaveChangesAsync();
            var isOwner = comment.UserId == userId ? true : false;

            var mentionedUsernames = ExtractMentions(comment.Content);
            await ProcessMentionsAsync(reel, comment, mentionedUsernames);

            var commenterProfile = await _userProfileRpcClient.GetProfileAsync(userId);
            var commenterName = commenterProfile?.DisplayName ?? string.Empty;
            var commentPreview = request.Content.Length <= 100
                ? request.Content
                : request.Content[..100];

            try
            {
                await _postCommentedPublisher.PublishAsync(new PostCommentedEvent(
                    reel.UserId,
                    userId,
                    commenterName,
                    reelId,
                    commentPreview));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish PostCommented event for reel {ReelId}", reelId);
            }


            return new ReelCommentDto
            {
                Id = comment.Id,
                ReelId = comment.ReelId,
                UserId = comment.UserId,
                UserDisplayName = userProfile.DisplayName,
                UserAvatarUrl = userProfile.AvatarUrl,
                Content = comment.Content,
                ParentCommentId = comment.ParentCommentId,
                CreatedAt = comment.CreatedAt,
                ReplyCount = comment.ReplyCount,
                LikeCount = comment.LikeCount,
                IsOwner = isOwner
            };
        }

        public async Task<List<ReelCommentDto>> GetCommentsAsync(Guid reelId, int skip, int take)
        {
            var reel = await _context.Reels
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == reelId);
            if (reel == null)
                throw new KeyNotFoundException("Reel not found");

            var comments = await _context.ReelComments
                .AsNoTracking()
                .Where(c => c.ReelId == reelId && c.ParentCommentId == null) // Chỉ lấy comment gốc
                .OrderByDescending(c => c.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();
            var commentDtos = new List<ReelCommentDto>();
            foreach (var comment in comments)
            {
                var userProfile = await _userProfileRpcClient.GetProfileAsync(comment.UserId);
                if (userProfile == null)
                    _logger.LogWarning("User profile not found for UserId: {UserId}", comment.UserId);
                commentDtos.Add(new ReelCommentDto
                {
                    Id = comment.Id,
                    ReelId = comment.ReelId,
                    UserId = comment.UserId,
                    UserDisplayName = userProfile?.DisplayName ?? "Someone",
                    UserAvatarUrl = userProfile?.AvatarUrl,
                    Content = comment.Content,
                    ParentCommentId = comment.ParentCommentId,
                    CreatedAt = comment.CreatedAt,
                    ReplyCount = comment.ReplyCount,
                    LikeCount = comment.LikeCount,
                });
            }
            return commentDtos;
        }

        public async Task<List<ReelCommentDto>> GetRepliesAsync(Guid commentId, int skip, int take)
        {
            var rootComment = await _context.ReelComments
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == commentId);
            if (rootComment == null)
                throw new KeyNotFoundException("Comment not found");

            var replies = await _context.ReelComments
                .AsNoTracking()
                .Where(c => c.ParentCommentId == rootComment.Id) // Lấy tất cả comment có ParentCommentId trỏ đến root
                .OrderByDescending(c => c.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();
            var replyDtos = new List<ReelCommentDto>();
            foreach (var reply in replies)
            {
                var userProfile = await _userProfileRpcClient.GetProfileAsync(reply.UserId);
                if (userProfile == null)
                    _logger.LogWarning("User profile not found for UserId: {UserId}", reply.UserId);
                replyDtos.Add(new ReelCommentDto
                {
                    Id = reply.Id,
                    ReelId = reply.ReelId,
                    UserId = reply.UserId,
                    UserDisplayName = userProfile?.DisplayName ?? "Someone",
                    UserAvatarUrl = userProfile?.AvatarUrl,
                    Content = reply.Content,
                    ParentCommentId = reply.ParentCommentId,
                    CreatedAt = reply.CreatedAt,
                    ReplyCount = reply.ReplyCount,
                    LikeCount = reply.LikeCount,
                });
            }
            return replyDtos;
        }

        public async Task DeleteCommentAsync(Guid commentId, Guid userId)
        {
            var comment = await _context.ReelComments
                .FirstOrDefaultAsync(c => c.Id == commentId);
            if (comment == null)
                throw new KeyNotFoundException("Comment not found");
            if (comment.UserId != userId)
                throw new UnauthorizedAccessException("You are not the owner of this comment");
            // Nếu comment có reply, không xóa mà chỉ đánh dấu nội dung đã bị xóa
            if (comment.ReplyCount > 0)
            {
                comment.Content = "[Deleted]";
                comment.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return;
            }
            // Nếu là comment gốc và có reply, cần cập nhật lại ReplyCount của root comment
            if (comment.ParentCommentId.HasValue)
            {
                var rootComment = await _context.ReelComments
                    .FirstOrDefaultAsync(c => c.Id == comment.ParentCommentId.Value);
                if (rootComment != null)
                {
                    rootComment.ReplyCount -= 1;
                }
            }
            _context.ReelComments.Remove(comment);
            await _context.SaveChangesAsync();
        }

        public async Task LikeCommentAsync(Guid commentId, Guid userId)
        {
            var comment = await _context.ReelComments
                .FirstOrDefaultAsync(c => c.Id == commentId);
            if (comment == null)
                throw new KeyNotFoundException("Comment not found");

            var existingLike = await _context.ReelCommentLikes
                .FirstOrDefaultAsync(l => l.ReelCommentId == commentId && l.UserId == userId);
            if (existingLike != null)
                return; // Đã like rồi, không làm gì
            var like = new ReelCommentLike
            {
                Id = Guid.NewGuid(),
                ReelCommentId = commentId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            comment.LikeCount += 1; // Increment like count on comment

            _context.ReelCommentLikes.Add(like);
            await _context.SaveChangesAsync();
        }

        public async Task UnlikeCommentAsync(Guid commentId, Guid userId)
        {
            var comment = await _context.ReelComments
                .FirstOrDefaultAsync(c => c.Id == commentId);
            if (comment == null)
                throw new KeyNotFoundException("Comment not found");

            var existingLike = await _context.ReelCommentLikes
                .FirstOrDefaultAsync(l => l.ReelCommentId == commentId && l.UserId == userId);
            if (existingLike == null)
                return; // Chưa like, không làm gì

            comment.LikeCount -= 1; // Decrement like count on comment
            _context.ReelCommentLikes.Remove(existingLike);
            await _context.SaveChangesAsync();
        }

        private async Task<List<ReelDto>> MapReelsAsync(List<Reel> reels, Guid? currentUserId)
        {
            if (reels.Count == 0)
            {
                return new List<ReelDto>();
            }

            var reelIds = reels.Select(r => r.Id).ToList();

            var likeCounts = await _context.ReelLikes
                .Where(l => reelIds.Contains(l.ReelId))
                .GroupBy(l => l.ReelId)
                .Select(g => new { ReelId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ReelId, x => x.Count);

            var commentCounts = await _context.ReelComments
                .Where(c => reelIds.Contains(c.ReelId))
                .GroupBy(c => c.ReelId)
                .Select(g => new { ReelId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ReelId, x => x.Count);

            var shareCounts = await _context.ReelShares
                .Where(s => reelIds.Contains(s.ReelId))
                .GroupBy(s => s.ReelId)
                .Select(g => new { ReelId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ReelId, x => x.Count);

            var likedReelIds = currentUserId.HasValue
                ? await _context.ReelLikes
                    .Where(l => reelIds.Contains(l.ReelId) && l.UserId == currentUserId.Value)
                    .Select(l => l.ReelId)
                    .ToListAsync()
                : new List<Guid>();

            var likedReelSet = likedReelIds.ToHashSet();

            var userIds = reels.Select(r => r.UserId).Distinct().ToList();
            var profileTasks = userIds.Select(async id => new
            {
                UserId = id,
                Profile = await _userProfileRpcClient.GetProfileAsync(id)
            });

            var profiles = await Task.WhenAll(profileTasks);
            var profileMap = profiles.ToDictionary(x => x.UserId, x => x.Profile);

            var reelDtos = new List<ReelDto>();
            foreach (var reel in reels)
            {
                profileMap.TryGetValue(reel.UserId, out var profile);

                var displayName = profile?.Found == true ? profile.DisplayName : "Someone";
                var avatarUrl = profile?.Found == true ? profile.AvatarUrl : null;

                reelDtos.Add(new ReelDto
                {
                    Id = reel.Id,
                    UserId = reel.UserId,
                    OwnerDisplayName = displayName,
                    OwnerAvatarUrl = avatarUrl,
                    VideoUrl = reel.VideoUrl,
                    ThumbnailUrl = reel.ThumbnailUrl,
                    Caption = reel.Caption,
                    Duration = reel.Duration,
                    LikeCount = likeCounts.GetValueOrDefault(reel.Id, 0),
                    CommentCount = commentCounts.GetValueOrDefault(reel.Id, 0),
                    ShareCount = shareCounts.GetValueOrDefault(reel.Id, 0),
                    ViewCount = reel.ViewCount,
                    IsLiked = likedReelSet.Contains(reel.Id),
                    IsOwner = currentUserId.HasValue && currentUserId.Value == reel.UserId,
                    CreatedAt = reel.CreatedAt
                });
            }

            return reelDtos;
        }
    }
}
