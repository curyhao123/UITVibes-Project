using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Messaging.Interface;
using PostService.Models;
using PostService.ServiceLayer.Interface;
using System.Text.RegularExpressions;

namespace PostService.ServiceLayer.Implementation;

public class PostService : IPostService
{
    private readonly PostDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IUserFollowRpcClient _userFollowRpcClient;
    private readonly ILogger<PostService> _logger;
    private readonly IPostLikedPublisher _postLikedPublisher;
    private readonly IUserProfileRpcClient _userProfileRpcClient;
    private readonly IRepostService _repostService;
    private readonly IPostMentionedPublisher _postMentionedPublisher;
    public PostService(
        PostDbContext context,
        ICloudinaryService cloudinaryService,
        IUserFollowRpcClient userFollowRpcClient,
        ILogger<PostService> logger,
        IPostLikedPublisher postLikedPublisher,
        IUserProfileRpcClient userProfileRpcClient,
        IRepostService repostService,
        IPostMentionedPublisher postMentionedPublisher)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
        _userFollowRpcClient = userFollowRpcClient;
        _logger = logger;
        _postLikedPublisher = postLikedPublisher;
        _userProfileRpcClient = userProfileRpcClient;
        _repostService = repostService;
        _userProfileRpcClient = userProfileRpcClient;
        _postLikedPublisher = postLikedPublisher;
        _postMentionedPublisher = postMentionedPublisher;
    }

    public async Task<PostDto> CreatePostAsync(Guid userId, CreatePostRequest request)
    {
        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Content = request.Content,
            Location = request.Location,
            Visibility = (PostVisibility)request.Visibility,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PostType = PostType.Original
        };

        _context.Posts.Add(post);

        // ✅ Add media to post
        if (request.Media != null && request.Media.Any())
        {
            foreach (var mediaRequest in request.Media)
            {
                var postMedia = new PostMedia
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id, // ✅ Set FK
                    Type = (MediaType)mediaRequest.Type,
                    Url = mediaRequest.Url,
                    PublicId = mediaRequest.PublicId,
                    ThumbnailUrl = mediaRequest.ThumbnailUrl,
                    DisplayOrder = mediaRequest.DisplayOrder,
                    Width = mediaRequest.Width,
                    Height = mediaRequest.Height,
                    Duration = mediaRequest.Duration,
                    CreatedAt = DateTime.UtcNow
                };

                post.Media.Add(postMedia);
            }
        }

        // Extract and save hashtags
        var hashtags = ExtractHashtags(request.Content);
        await ProcessHashtagsAsync(post, hashtags);

        // Extract and save mentions
        var mentions = ExtractMentions(request.Content);
        await ProcessMentionsAsync(post, mentions);

        await _context.SaveChangesAsync();

        _logger.LogInformation("Created post {PostId} with {MediaCount} media items by user {UserId}",
            post.Id, post.Media.Count, userId);

        return await GetPostByIdAsync(post.Id, userId);
    }

    public async Task<PostDto> GetPostByIdAsync(Guid postId, Guid? currentUserId = null)
    {
        var post = await _context.Posts
            .Include(p => p.Media)
            .Include(p => p.Hashtags).ThenInclude(ph => ph.Hashtag)
            .Include(p => p.Mentions)
            .Include(p => p.OriginalPost).ThenInclude(op => op!.Media)
            .FirstOrDefaultAsync(p => p.Id == postId && !p.IsDeleted);

        if (post == null)
            throw new KeyNotFoundException("Post not found");

        return await MapToDto(post, currentUserId);
    }

    public async Task<List<PostDto>> GetUserPostsAsync(Guid userId, Guid? currentUserId = null, int skip = 0, int take = 20)
    {
        var posts = await _context.Posts
            .Where(p => p.UserId == userId && !p.IsDeleted && p.PostType == PostType.Original)
            .Include(p => p.Media)
            .Include(p => p.Hashtags).ThenInclude(ph => ph.Hashtag)
            .Include(p => p.Mentions)
            .OrderByDescending(p => p.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var postDtos = new List<PostDto>();
        foreach (var post in posts)
        {
            postDtos.Add(await MapToDto(post, currentUserId));
        }

        return postDtos;
    }

    public async Task<List<PostDto>> GetFeedAsync(Guid userId, int skip = 0, int take = 20)
    {
        // Get IDs of users the current user follows
        var followingIds = await _userFollowRpcClient.GetFollowingIdsAsync(userId);

        // Always include own posts + posts from followed users
        followingIds.Add(userId);

        var posts = await _context.Posts
            .Where(p => !p.IsDeleted
                     && p.PostType == PostType.Original
                     && followingIds.Contains(p.UserId))
            .Include(p => p.Media)
            .Include(p => p.Hashtags).ThenInclude(ph => ph.Hashtag)
            .Include(p => p.Mentions)
            .OrderByDescending(p => p.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var postDtos = new List<PostDto>();
        foreach (var post in posts)
        {
            postDtos.Add(await MapToDto(post, userId));
        }

        return postDtos;
    }

    public async Task<PostDto> UpdatePostAsync(Guid postId, Guid userId, UpdatePostRequest request)
    {
        var post = await _context.Posts
            .Include(p => p.Hashtags)
            .Include(p => p.Mentions)
            .Include(p => p.Media)
            .FirstOrDefaultAsync(p => p.Id == postId && !p.IsDeleted);

        if (post == null)
            throw new KeyNotFoundException("Post not found");

        if (post.UserId != userId)
            throw new UnauthorizedAccessException("You can only edit your own posts");

        post.Content = request.Content;
        post.Location = request.Location;
        post.Visibility = (PostVisibility)request.Visibility;
        post.UpdatedAt = DateTime.UtcNow;

        // Update hashtags
        _context.PostHashtags.RemoveRange(post.Hashtags);
        var hashtags = ExtractHashtags(request.Content);
        await ProcessHashtagsAsync(post, hashtags);

        // Update mentions
        _context.PostMentions.RemoveRange(post.Mentions);
        var mentions = ExtractMentions(request.Content);
        await ProcessMentionsAsync(post, mentions);

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated post {PostId}", postId);

        return await GetPostByIdAsync(postId, userId);
    }

    public async Task DeletePostAsync(Guid postId, Guid userId)
    {
        var post = await _context.Posts
            .Include(p => p.Media)
            .FirstOrDefaultAsync(p => p.Id == postId && !p.IsDeleted);

        if (post == null)
            throw new KeyNotFoundException("Post not found");

        if (post.UserId != userId)
            throw new UnauthorizedAccessException("You can only delete your own posts");

        // ✅ Delete media from Cloudinary
        foreach (var media in post.Media)
        {
            if (!string.IsNullOrEmpty(media.PublicId))
            {
                await _cloudinaryService.DeleteMediaAsync(media.PublicId);
            }
        }

        post.IsDeleted = true;
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted post {PostId} and {MediaCount} media items", postId, post.Media.Count);
    }

    /// <summary>
    /// Upload media to Cloudinary and return metadata (doesn't save to DB)
    /// Client will include this metadata in CreatePostRequest
    /// </summary>
    public async Task<MediaUploadResponse> UploadMediaAsync(IFormFile file)
    {
        var contentType = file.ContentType.ToLower();
        var isVideo = contentType.StartsWith("video/");

        if (isVideo)
        {
            var (url, thumbnailUrl, publicId, duration) = await _cloudinaryService.UploadVideoAsync(file, "uitvibes/posts");

            return new MediaUploadResponse
            {
                Url = url,
                PublicId = publicId,
                ThumbnailUrl = thumbnailUrl,
                Type = MediaTypeDto.Video,
                Duration = duration
            };
        }
        else
        {
            var (url, publicId, width, height) = await _cloudinaryService.UploadImageAsync(file, "uitvibes/posts");

            return new MediaUploadResponse
            {
                Url = url,
                PublicId = publicId,
                Type = MediaTypeDto.Image,
                Width = width,
                Height = height
            };
        }
    }

    // Helper methods
    private List<string> ExtractHashtags(string content)
    {
        var regex = new Regex(@"#(\w+)", RegexOptions.IgnoreCase);
        var matches = regex.Matches(content);
        return matches.Select(m => m.Groups[1].Value.ToLower()).Distinct().ToList();
    }

    private List<string> ExtractMentions(string content)
    {
        var regex = new Regex(@"@(\w+)", RegexOptions.IgnoreCase);
        var matches = regex.Matches(content);
        return matches.Select(m => m.Groups[1].Value.ToLower()).Distinct().ToList();
    }

    private async Task ProcessHashtagsAsync(Post post, List<string> hashtagNames)
    {
        foreach (var name in hashtagNames)
        {
            var normalizedName = name.ToLower();
            var hashtag = await _context.Hashtags.FirstOrDefaultAsync(h => h.NormalizedName == normalizedName);

            if (hashtag == null)
            {
                hashtag = new Hashtag
                {
                    Id = Guid.NewGuid(),
                    Name = name,
                    NormalizedName = normalizedName,
                    UsageCount = 1,
                    CreatedAt = DateTime.UtcNow,
                    LastUsedAt = DateTime.UtcNow
                };
                _context.Hashtags.Add(hashtag);
            }
            else
            {
                hashtag.UsageCount++;
                hashtag.LastUsedAt = DateTime.UtcNow;
            }

            post.Hashtags.Add(new PostHashtag
            {
                PostId = post.Id,
                HashtagId = hashtag.Id,
                CreatedAt = DateTime.UtcNow
            });
        }
    }

    private async Task ProcessMentionsAsync(Post post, List<string> usernames)
    {
        if (usernames.Count == 0)
        {
            return;
        }

        var mentionerProfile = await _userProfileRpcClient.GetProfileAsync(post.UserId);
        var mentionerName = mentionerProfile?.Found == true ? mentionerProfile.DisplayName : "Someone";


        foreach (var username in usernames)
        {
            var mentionedUserResult = await _userProfileRpcClient.GetProfileAsync(username);
            if (mentionedUserResult?.Found != true || mentionedUserResult.UserId == Guid.Empty)
            {
                continue;
            }

            if (mentionedUserResult.UserId == post.UserId)
            {
                continue;
            }

            var mention = new PostMention
            {
                Id = Guid.NewGuid(),
                PostId = post.Id,
                MentionedUserId = mentionedUserResult.UserId,
                StartPosition = 0,
                Length = username.Length,
                CreatedAt = DateTime.UtcNow
            };

            post.Mentions.Add(mention);

            await _postMentionedPublisher.PublishAsync(new PostMentionedEvent(
                mentionedUserResult.UserId,
                post.UserId,
                mentionerName,
                post.Id));
        }

        await Task.CompletedTask;
    }

    private async Task<PostDto> MapToDto(Post post, Guid? currentUserId)
    {
        var dto = new PostDto
        {
            Id = post.Id,
            UserId = post.UserId,
            Content = post.Content,
            PostType = post.PostType,
            Visibility = (PostVisibilityDto)post.Visibility,
            Location = post.Location,
            LikesCount = post.LikesCount,
            CommentsCount = post.CommentsCount,
            SharesCount = post.SharesCount,
            ViewsCount = post.ViewsCount,
            RepostCount = post.RepostCount,
            OriginalPostId = post.OriginalPostId,
            CreatedAt = post.CreatedAt,
            UpdatedAt = post.UpdatedAt,
            Media = post.Media.OrderBy(m => m.DisplayOrder).Select(m => new PostMediaDto
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
            Hashtags = post.Hashtags.Select(ph => ph.Hashtag.Name).ToList(),
            MentionedUserIds = post.Mentions.Select(m => m.MentionedUserId).ToList()
        };

        if (currentUserId.HasValue)
        {
            dto.IsLikedByCurrentUser = await _context.Likes
                .AnyAsync(l => l.PostId == post.Id && l.UserId == currentUserId.Value);

            dto.IsBookmarkedByCurrentUser = await _context.Bookmarks
                .AnyAsync(b => b.PostId == post.Id && b.UserId == currentUserId.Value);

            // ✅ Check repost status: user đã repost bài này chưa?
            dto.IsRepostedByCurrentUser = await _repostService.HasRepostedAsync(post.Id, currentUserId.Value);
        }

        if (post.OriginalPost != null)
        {
            dto.OriginalPost = await MapToDto(post.OriginalPost, currentUserId);
        }

        return dto;
    }
    public async Task<LikeResponse> LikePostAsync(Guid postId, Guid userId)
    {
        // Check if post exists
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId && !p.IsDeleted);

        if (post == null)
            throw new KeyNotFoundException("Post not found");

        // Check if already liked
        var existingLike = await _context.Likes
            .FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);

        if (existingLike != null)
            throw new InvalidOperationException("Post already liked");

        // Create like
        var like = new Like
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Likes.Add(like);

        // Increment likes count
        post.LikesCount++;
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} liked post {PostId}", userId, postId);

        var likerProfile = await _userProfileRpcClient.GetProfileAsync(userId);
        var likerName = likerProfile.Found ? likerProfile.DisplayName : "Someone";

        try
        {
            await _postLikedPublisher.PublishAsync(new PostLikedEvent(
                post.UserId,
                userId,
                likerName,
                postId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish PostLikedevent for post {PostId}", postId);
        }

        return new LikeResponse
        {
            LikeId = like.Id,
            PostId = postId,
            UserId = userId,
            TotalLikes = post.LikesCount,
            CreatedAt = like.CreatedAt
        };
    }

    public async Task UnlikePostAsync(Guid postId, Guid userId)
    {
        // Find the like
        var like = await _context.Likes
            .FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);

        if (like == null)
            throw new KeyNotFoundException("Like not found");

        // Get post to decrement count
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId);

        if (post == null)
            throw new KeyNotFoundException("Post not found");

        // Remove like
        _context.Likes.Remove(like);

        // Decrement likes count
        if (post.LikesCount > 0)
        {
            post.LikesCount--;
            post.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} unliked post {PostId}", userId, postId);
    }

    public async Task<List<LikeDto>> GetPostLikesAsync(Guid postId, int skip = 0, int take = 50)
    {
        // Check if post exists
        var postExists = await _context.Posts.AnyAsync(p => p.Id == postId && !p.IsDeleted);

        if (!postExists)
            throw new KeyNotFoundException("Post not found");

        var likes = await _context.Likes
            .Where(l => l.PostId == postId)
            .OrderByDescending(l => l.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var userIds = likes.Select(l => l.UserId).Distinct().ToList();

        var profileResults = await Task.WhenAll(
            userIds.Select(id => _userProfileRpcClient.GetProfileAsync(id)));

        var profileLookup = userIds
            .Zip(profileResults, (id, profile) => new { id, profile })
            .ToDictionary(x => x.id, x => x.profile);

        return likes.Select(l =>
        {
            profileLookup.TryGetValue(l.UserId, out var profile);
            var displayName = profile?.Found == true ? profile.DisplayName : "Someone";

            return new LikeDto
            {
                LikeId = l.Id,
                PostId = l.PostId,
                UserId = l.UserId,
                DisplayName = displayName,
                AvatarUrl = profile?.Found == true ? profile.AvatarUrl ?? "" : "",
                CreatedAt = l.CreatedAt
            };
        }).ToList();
    }

    public async Task<List<PostReportDto>> GetPostReportsAsync(int skip = 0, int take = 20, ReportStatus? status = null)
    {
        var query = _context.PostReports
            .Include(r => r.Post)
            .AsQueryable();
        if (status.HasValue)
        {
            query = query.Where(r => r.Status == (Models.ReportStatus)status.Value);
        }

        var reportEntities = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var reporterIds = reportEntities
        .Select(r => r.ReporterId)
        .Distinct()
        .ToList();

        var profileResults = await Task.WhenAll(
            reporterIds.Select(id => _userProfileRpcClient.GetProfileAsync(id)));

        var profileLookup = reporterIds
           .Zip(profileResults, (id, profile) => new { id, profile })
           .ToDictionary(x => x.id, x => x.profile);

        return reportEntities
            .Select(r =>
            {
                profileLookup.TryGetValue(r.ReporterId, out var profile);
                var displayName = profile?.Found == true ? profile.DisplayName : "Someone";

                return new PostReportDto
                {
                    Id = r.Id,
                    PostId = r.PostId,
                    ReporterId = r.ReporterId,
                    ReporterDisplayName = displayName,
                    ReporterProfile = profile?.Found == true ? profile : null,
                    Reason = r.Reason,
                    Status = r.Status,
                    AdminNote = r.AdminNote,
                    CreatedAt = r.CreatedAt,
                    ResolvedAt = r.ResolvedAt
                };
            })
            .ToList();
    }
    public async Task<PostReportDto> CreatePostReportAsync(Guid userId, ReportPostRequest request)
    {
        // Check if post exists
        var postExists = await _context.Posts.AnyAsync(p => p.Id == request.PostId && !p.IsDeleted);
        if (!postExists)
            throw new KeyNotFoundException("Post not found");

        var existingReport = await _context.PostReports
            .FirstOrDefaultAsync(r => r.PostId == request.PostId && r.ReporterId == userId && r.Status == Models.ReportStatus.Pending);
        if (existingReport != null)
            throw new InvalidOperationException("You have already reported this post and it's still pending review");

        var report = new PostReport
        {
            Id = Guid.NewGuid(),
            PostId = request.PostId,
            ReporterId = userId,
            Reason = request.Reason,
            Status = ReportStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.PostReports.Add(report);
        await _context.SaveChangesAsync();

        var reporterProfileResult = await _userProfileRpcClient.GetProfileAsync(userId);
        var reporterDisplayName = reporterProfileResult.Found ? reporterProfileResult.DisplayName : "Someone";
        return new PostReportDto
        {
            Id = report.Id,
            PostId = report.PostId,
            ReporterId = report.ReporterId,
            ReporterDisplayName = reporterDisplayName,
            ReporterProfile = reporterProfileResult.Found ? reporterProfileResult : null,
            Reason = report.Reason,
            Status = report.Status,
            CreatedAt = report.CreatedAt
        };
    }

    public async Task<PostDto> ChangePostVisibilityAsync(Guid postId, Guid userId, PostVisibility postVisibility)
    {
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId && !p.IsDeleted);
        if (post == null)
            throw new KeyNotFoundException("Post not found");

        if (post.UserId != userId && postVisibility != PostVisibility.Hidden)
            throw new UnauthorizedAccessException("You can only change visibility of your own posts");

        post.Visibility = postVisibility;
        post.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        _logger.LogInformation("Changed visibility of post {PostId} to {Visibility}", postId, postVisibility);
        return await GetPostByIdAsync(postId, userId);
    }
}
