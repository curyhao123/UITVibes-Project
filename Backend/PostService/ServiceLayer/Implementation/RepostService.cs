using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation
{
    public class RepostService : IRepostService
    {
        private readonly PostDbContext _context;
        private readonly ILogger<RepostService> _logger;

        public RepostService(
            PostDbContext context,
            ILogger<RepostService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<RepostResponse> CreateRepostAsync(Guid originalPostId, Guid userId)
        {
            // 1. Kiểm tra bài gốc có tồn tại không
            var originalPost = await _context.Posts
                .FirstOrDefaultAsync(p => p.Id == originalPostId && !p.IsDeleted);

            if (originalPost == null)
                throw new KeyNotFoundException("Post not found");

            // 2. Không cho repost chính bài của mình
            if (originalPost.UserId == userId)
                throw new InvalidOperationException("You cannot repost your own post");

            // 3. Không cho repost một bài đã là repost — luôn trỏ về bài gốc
            var rootPostId = originalPost.OriginalPostId ?? originalPostId;

            // 4. Kiểm tra đã repost chưa (dùng rootPostId để tránh duplicate)
            var alreadyReposted = await _context.Posts
                .AnyAsync(p => p.UserId == userId
                            && p.OriginalPostId == rootPostId
                            && p.PostType == PostType.Repost
                            && !p.IsDeleted);

            if (alreadyReposted)
                throw new InvalidOperationException("You have already reposted this post");

            // 5. Tạo repost
            var repost = new Post
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                PostType = PostType.Repost,
                OriginalPostId = rootPostId,
                Visibility = originalPost.Visibility,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Posts.Add(repost);

            // 6. Tăng RepostCount trên bài gốc (rootPost)
            var rootPost = rootPostId == originalPostId
                ? originalPost
                : await _context.Posts.FirstOrDefaultAsync(p => p.Id == rootPostId);

            if (rootPost != null)
            {
                rootPost.RepostCount++;
                rootPost.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} reposted post {OriginalPostId} as {RepostId}",
                userId, rootPostId, repost.Id);

            return new RepostResponse
            {
                RepostId = repost.Id,
                OriginalPostId = rootPostId,
                UserId = userId,
                TotalReposts = rootPost?.RepostCount ?? 0,
                CreatedAt = repost.CreatedAt
            };
        }

        public async Task UndoRepostAsync(Guid originalPostId, Guid userId)
        {
            var rootPostId = originalPostId;
            // Tìm repost của user này cho bài gốc
            var repost = await _context.Posts
                .FirstOrDefaultAsync(p => p.UserId == userId
                                        && p.OriginalPostId == rootPostId
                                        && p.PostType == PostType.Repost
                                        && !p.IsDeleted);
            if (repost == null)
                throw new KeyNotFoundException("Repost not found");
            // Xóa repost (soft delete)
            repost.IsDeleted = true;
            repost.UpdatedAt = DateTime.UtcNow;
            // Giảm RepostCount trên bài gốc
            var rootPost = await _context.Posts.FirstOrDefaultAsync(p => p.Id == rootPostId);
            if (rootPost != null && rootPost.RepostCount > 0)
            {
                rootPost.RepostCount--;
                rootPost.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            _logger.LogInformation("User {UserId} undid repost of post {OriginalPostId}",
                userId, rootPostId);
        }

        public async Task<bool> HasRepostedAsync(Guid originalPostId, Guid userId)
        {
            var rootPostId = originalPostId;
            return await _context.Posts
                .AnyAsync(p => p.UserId == userId
                            && p.OriginalPostId == rootPostId
                            && p.PostType == PostType.Repost
                            && !p.IsDeleted);
        }
        public async Task<List<PostDto>> GetUserRepostsAsync(
        Guid userId,
        Guid? currentUserId = null,
        int skip = 0,
        int take = 20)
        {
            var reposts = await _context.Posts
                .Where(p => p.UserId == userId
                         && p.PostType == PostType.Repost
                         && !p.IsDeleted)
                .Include(p => p.OriginalPost).ThenInclude(op => op!.Media)
                .Include(p => p.OriginalPost).ThenInclude(op => op!.Hashtags).ThenInclude(ph => ph.Hashtag)
                .Include(p => p.OriginalPost).ThenInclude(op => op!.Mentions)
                .OrderByDescending(p => p.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            var result = new List<PostDto>();

            foreach (var repost in reposts)
            {
                if (repost.OriginalPost == null || repost.OriginalPost.IsDeleted)
                    continue;

                var dto = MapRepostToDto(repost, currentUserId);

                if (currentUserId.HasValue)
                {
                    dto.IsRepostedByCurrentUser = await HasRepostedAsync(repost.OriginalPostId!.Value, currentUserId.Value);

                    dto.IsLikedByCurrentUser = await _context.Likes
                        .AnyAsync(l => l.PostId == repost.OriginalPostId && l.UserId == currentUserId.Value);

                    dto.IsBookmarkedByCurrentUser = await _context.Bookmarks
                        .AnyAsync(b => b.PostId == repost.OriginalPostId && b.UserId == currentUserId.Value);
                }

                result.Add(dto);
            }

            return result;
        }

        // ---------------------------------------------------------------
        // Private helpers
        // ---------------------------------------------------------------

        private static PostDto MapRepostToDto(Post repost, Guid? currentUserId)
        {
            var op = repost.OriginalPost!;

            return new PostDto
            {
                // Thông tin của bản repost
                Id = repost.Id,
                UserId = repost.UserId,
                PostType = repost.PostType,
                OriginalPostId = repost.OriginalPostId,
                CreatedAt = repost.CreatedAt,
                UpdatedAt = repost.UpdatedAt,

                // Nội dung hiển thị lấy từ bài gốc
                Content = op.Content,
                Location = op.Location,
                Visibility = (PostVisibilityDto)op.Visibility,
                LikesCount = op.LikesCount,
                CommentsCount = op.CommentsCount,
                SharesCount = op.SharesCount,
                ViewsCount = op.ViewsCount,
                RepostCount = op.RepostCount,

                Media = op.Media.OrderBy(m => m.DisplayOrder).Select(m => new PostMediaDto
                {
                    Id = m.Id,
                    Type = (MediaTypeDto)m.Type,
                    Url = m.Url,
                    ThumbnailUrl = m.ThumbnailUrl,
                    DisplayOrder = m.DisplayOrder,
                    Width = m.Width,
                    Height = m.Height,
                    Duration = m.Duration
                }).ToList(),

                Hashtags = op.Hashtags.Select(ph => ph.Hashtag.Name).ToList(),
                MentionedUserIds = op.Mentions.Select(m => m.MentionedUserId).ToList()
            };
        }
    }
}
