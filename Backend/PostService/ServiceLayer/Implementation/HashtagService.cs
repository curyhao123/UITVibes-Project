using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

public class HashtagService : IHashtagService
{
    private readonly PostDbContext _context;
    private readonly ILogger<HashtagService> _logger;

    public HashtagService(PostDbContext context, ILogger<HashtagService> logger)
    {
        _context = context;
        _logger = logger;
    }

   
    /// Get trending hashtags sorted by usage count and recency
    public async Task<List<HashtagDto>> GetTrendingHashtagsAsync(int skip = 0, int take = 20)
    {
        var hashtags = await _context.Hashtags
            .Where(h => h.UsageCount > 0)
            .OrderByDescending(h => h.UsageCount)
            .ThenByDescending(h => h.LastUsedAt)
            .Skip(skip)
            .Take(take)
            .Select(h => new HashtagDto
            {
                Id = h.Id,
                Name = h.Name,
                NormalizedName = h.NormalizedName,
                UsageCount = h.UsageCount,
                CreatedAt = h.CreatedAt,
                LastUsedAt = h.LastUsedAt
            })
            .ToListAsync();

        return hashtags;
    }

   
    /// Search hashtags by name (autocomplete)
    public async Task<List<HashtagDto>> SearchHashtagsAsync(string query, int skip = 0, int take = 20)
    {
        if (string.IsNullOrWhiteSpace(query))
            return new List<HashtagDto>();

        var normalizedQuery = query.ToLower().TrimStart('#');

        var hashtags = await _context.Hashtags
            .Where(h => h.NormalizedName.Contains(normalizedQuery))
            .OrderByDescending(h => h.UsageCount)
            .Skip(skip)
            .Take(take)
            .Select(h => new HashtagDto
            {
                Id = h.Id,
                Name = h.Name,
                NormalizedName = h.NormalizedName,
                UsageCount = h.UsageCount,
                CreatedAt = h.CreatedAt,
                LastUsedAt = h.LastUsedAt
            })
            .ToListAsync();

        return hashtags;
    }

  
    /// Get all posts that contain a specific hashtag
    public async Task<List<PostDto>> GetPostsByHashtagAsync(string hashtagName, Guid? currentUserId = null, int skip = 0, int take = 20)
    {
        var normalizedName = hashtagName.ToLower().TrimStart('#');

        var hashtag = await _context.Hashtags
            .FirstOrDefaultAsync(h => h.NormalizedName == normalizedName);

        if (hashtag == null)
            return new List<PostDto>();

        // ✅ Get postIds first, then query posts with Include
        var postIds = await _context.PostHashtags
            .Where(ph => ph.HashtagId == hashtag.Id)
            .OrderByDescending(ph => ph.CreatedAt)
            .Select(ph => ph.PostId)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        if (!postIds.Any())
            return new List<PostDto>();

        // ✅ Include BEFORE any Select/projection
        var posts = await _context.Posts
            .Where(p => postIds.Contains(p.Id) && !p.IsDeleted && p.Visibility == PostVisibility.Public)
            .Include(p => p.Media)
            .Include(p => p.Hashtags).ThenInclude(ph => ph.Hashtag)
            .Include(p => p.Mentions)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var postDtos = new List<PostDto>();
        foreach (var post in posts)
        {
            postDtos.Add(await MapToPostDto(post, currentUserId));
        }

        return postDtos;
    }

    private async Task<PostDto> MapToPostDto(Post post, Guid? currentUserId)
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

        return dto;
    }
}