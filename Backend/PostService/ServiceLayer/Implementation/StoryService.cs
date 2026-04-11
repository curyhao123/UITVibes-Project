using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

public class StoryService : IStoryService
{
    private readonly PostDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ILogger<StoryService> _logger;

    /// Thời gian story tồn tại trước khi hết hạn (24 giờ)
    private static readonly TimeSpan StoryDuration = TimeSpan.FromHours(24);

    public StoryService(
        PostDbContext context,
        ICloudinaryService cloudinaryService,
        ILogger<StoryService> logger)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
        _logger = logger;
    }

    public async Task<StoryDto> CreateStoryAsync(Guid userId, CreateStoryRequest request)
    {
        // Tìm story group hiện tại của user (chưa hết hạn)
        var existingGroup = await _context.StoryGroups
            .Include(g => g.Items)
            .FirstOrDefaultAsync(g =>
                g.UserId == userId &&
                g.ExpiresAt > DateTime.UtcNow);

        if (existingGroup != null)
        {
            // Cập nhật display name/avatar nếu user thay đổi
            if (!string.IsNullOrEmpty(request.OwnerDisplayName))
                existingGroup.OwnerDisplayName = request.OwnerDisplayName;
            if (!string.IsNullOrEmpty(request.OwnerAvatarUrl))
                existingGroup.OwnerAvatarUrl = request.OwnerAvatarUrl;

            // Thêm items vào group hiện tại
            foreach (var media in request.Media)
            {
                existingGroup.Items.Add(new StoryItem
                {
                    Id = Guid.NewGuid(),
                    StoryGroupId = existingGroup.Id,
                    Type = (MediaType)media.Type,
                    Url = media.Url,
                    PublicId = media.PublicId,
                    ThumbnailUrl = media.ThumbnailUrl,
                    DisplayOrder = media.DisplayOrder,
                    Duration = media.Duration,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Extend expiry time về 24h từ now
            existingGroup.ExpiresAt = DateTime.UtcNow.Add(StoryDuration);
            existingGroup.CreatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Added {Count} items to existing story group {GroupId} for user {UserId}",
                request.Media.Count, existingGroup.Id, userId);

            return await MapGroupToDto(existingGroup);
        }

        // Tạo story group mới
        var group = new StoryGroup
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            OwnerDisplayName = request.OwnerDisplayName,
            OwnerAvatarUrl = request.OwnerAvatarUrl,
            ExpiresAt = DateTime.UtcNow.Add(StoryDuration),
            CreatedAt = DateTime.UtcNow,
            Items = request.Media.Select(m => new StoryItem
            {
                Id = Guid.NewGuid(),
                Type = (MediaType)m.Type,
                Url = m.Url,
                PublicId = m.PublicId,
                ThumbnailUrl = m.ThumbnailUrl,
                DisplayOrder = m.DisplayOrder,
                Duration = m.Duration,
                CreatedAt = DateTime.UtcNow
            }).ToList()
        };

        _context.StoryGroups.Add(group);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Created new story group {GroupId} with {Count} items for user {UserId}",
            group.Id, group.Items.Count, userId);

        return await MapGroupToDto(group);
    }

    public async Task<List<StoryFeedDto>> GetActiveStoriesAsync(Guid currentUserId, int limit = 20)
    {
        var now = DateTime.UtcNow;

        // Lấy tất cả story groups đang hoạt động
        var groups = await _context.StoryGroups
            .Include(g => g.Items.OrderBy(i => i.DisplayOrder))
            .Where(g => g.ExpiresAt > now)
            .OrderByDescending(g => g.CreatedAt)
            .Take(limit)
            .ToListAsync();

        // Lấy tất cả view records của current user cho các story này
        var groupIds = groups.Select(g => g.Id).ToList();

        // Lấy viewed item IDs của current user cho các story groups này
        var allViewsForGroups = new List<Guid>();
        if (groupIds.Any())
        {
            // Lấy tất cả StoryItem IDs thuộc các group này
            var itemIdsInGroups = await _context.StoryItems
                .Where(item => groupIds.Contains(item.StoryGroupId))
                .Select(item => item.Id)
                .ToListAsync();

            // Lấy view records của user cho các items đó
            allViewsForGroups = await _context.StoryViews
                .Where(v => v.UserId == currentUserId && itemIdsInGroups.Contains(v.StoryItemId))
                .Select(v => v.StoryItemId)
                .ToListAsync();
        }

        var result = groups.Select(group => {
            var allViewed = group.Items.All(item => allViewsForGroups.Contains(item.Id));
            return MapGroupToFeedDto(group, allViewed).Result;
        }).ToList();
        return result;
    }

    public async Task MarkStoryViewedAsync(Guid storyItemId, Guid userId)
    {
        var existing = await _context.StoryViews
            .FirstOrDefaultAsync(v => v.StoryItemId == storyItemId && v.UserId == userId);

        if (existing != null) return;

        var view = new StoryView
        {
            Id = Guid.NewGuid(),
            StoryItemId = storyItemId,
            UserId = userId,
            ViewedAt = DateTime.UtcNow
        };

        _context.StoryViews.Add(view);

        // Tăng tổng views của group bằng cách tìm group thông qua item
        var item = await _context.StoryItems
            .Include(i => i.StoryGroup)
            .FirstOrDefaultAsync(i => i.Id == storyItemId);

        if (item?.StoryGroup != null)
        {
            item.StoryGroup.TotalViews++;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} viewed story item {ItemId}", userId, storyItemId);
    }

    public async Task DeleteStoryAsync(Guid storyGroupId, Guid userId)
    {
        var group = await _context.StoryGroups
            .Include(g => g.Items)
            .FirstOrDefaultAsync(g => g.Id == storyGroupId);

        if (group == null)
            throw new KeyNotFoundException("Story not found");

        if (group.UserId != userId)
            throw new UnauthorizedAccessException("You can only delete your own stories");

        // Xóa media khỏi Cloudinary
        foreach (var item in group.Items)
        {
            if (!string.IsNullOrEmpty(item.PublicId))
            {
                await _cloudinaryService.DeleteMediaAsync(item.PublicId);
            }
        }

        _context.StoryGroups.Remove(group);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted story group {GroupId} for user {UserId}", storyGroupId, userId);
    }

    public async Task<StoryMediaUploadResponse> UploadStoryMediaAsync(IFormFile file)
    {
        var contentType = file.ContentType.ToLower();
        var isVideo = contentType.StartsWith("video/");

        if (isVideo)
        {
            var (url, thumbnailUrl, publicId, duration) =
                await _cloudinaryService.UploadVideoAsync(file, "uitvibes/stories");

            return new StoryMediaUploadResponse
            {
                Url = url,
                PublicId = publicId,
                ThumbnailUrl = thumbnailUrl,
                Type = 1, // Video
                Duration = duration
            };
        }
        else
        {
            var (url, publicId, width, height) =
                await _cloudinaryService.UploadImageAsync(file, "uitvibes/stories");

            return new StoryMediaUploadResponse
            {
                Url = url,
                PublicId = publicId,
                Type = 0, // Image
                Width = width,
                Height = height
            };
        }
    }

    private Task<StoryDto> MapGroupToDto(StoryGroup group)
    {
        var dto = new StoryDto
        {
            Id = group.Id,
            UserId = group.UserId,
            ExpiresAt = group.ExpiresAt,
            CreatedAt = group.CreatedAt,
            Items = group.Items.OrderBy(i => i.DisplayOrder).Select(i => new StoryItemDto
            {
                Id = i.Id,
                Type = (int)i.Type,
                Url = i.Url,
                ThumbnailUrl = i.ThumbnailUrl,
                DisplayOrder = i.DisplayOrder,
                Duration = i.Duration,
                CreatedAt = i.CreatedAt
            }).ToList()
        };
        return Task.FromResult(dto);
    }

    private Task<StoryFeedDto> MapGroupToFeedDto(StoryGroup group, bool isViewed)
    {
        var firstItem = group.Items.OrderBy(i => i.DisplayOrder).FirstOrDefault();
        var dto = new StoryFeedDto
        {
            Id = group.Id,
            UserId = group.UserId,
            DisplayName = group.OwnerDisplayName,
            AvatarUrl = group.OwnerAvatarUrl,
            ExpiresAt = group.ExpiresAt,
            CreatedAt = group.CreatedAt,
            IsViewed = isViewed,
            PreviewUrl = firstItem?.Url ?? "",
            TotalItems = group.Items.Count
        };
        return Task.FromResult(dto);
    }
}
