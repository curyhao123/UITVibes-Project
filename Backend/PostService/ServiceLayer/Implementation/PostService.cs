using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Models;
using PostService.ServiceLayer.Interface;
using System.Text.RegularExpressions;

namespace PostService.ServiceLayer.Implementation;

public class PostService : IPostService
{
    private readonly PostDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ILogger<PostService> _logger;

    public PostService(
        PostDbContext context,
        ICloudinaryService cloudinaryService,
        ILogger<PostService> logger)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
        _logger = logger;
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
            UpdatedAt = DateTime.UtcNow
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
            .Where(p => p.UserId == userId && !p.IsDeleted)
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
        // Simplified feed: posts from user + public posts
        // In production: fetch following list from UserService and filter
        var posts = await _context.Posts
            .Where(p => !p.IsDeleted && (p.UserId == userId || p.Visibility == PostVisibility.Public))
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
        foreach (var username in usernames)
        {
            var mention = new PostMention
            {
                Id = Guid.NewGuid(),
                PostId = post.Id,
                MentionedUserId = Guid.Empty, // TODO: Resolve from UserService
                StartPosition = 0,
                Length = username.Length,
                CreatedAt = DateTime.UtcNow
            };
            post.Mentions.Add(mention);
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
            Visibility = (PostVisibilityDto)post.Visibility,
            Location = post.Location,
            LikesCount = post.LikesCount,
            CommentsCount = post.CommentsCount,
            SharesCount = post.SharesCount,
            ViewsCount = post.ViewsCount,
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
            .Select(l => new LikeDto
            {
                LikeId = l.Id,
                PostId = l.PostId,
                UserId = l.UserId,
                CreatedAt = l.CreatedAt
            })
            .ToListAsync();

        return likes;
    }
}