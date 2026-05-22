using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

public class HighlightService : IHighlightService
{
    private readonly PostDbContext _context;
    private readonly ILogger<HighlightService> _logger;

    public HighlightService(PostDbContext context, ILogger<HighlightService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<HighlightGroupDto> CreateGroupAsync(Guid userId, CreateHighlightGroupRequest request)
    {
        var group = new HighlightGroup
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = request.Title.Trim(),
            CoverImage = request.CoverImage,
            CreatedAt = DateTime.UtcNow
        };

        _context.HighlightGroups.Add(group);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Created highlight group {GroupId} for user {UserId}",
            group.Id, userId);

        return MapGroupToDto(group);
    }

    public async Task<HighlightGroupDto> AddItemToGroupAsync(Guid userId, Guid groupId, AddHighlightItemRequest request)
    {
        var group = await _context.HighlightGroups
            .Include(g => g.Items)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            throw new KeyNotFoundException("Highlight group not found");

        if (group.UserId != userId)
            throw new UnauthorizedAccessException("You can only add items to your own highlight groups");

        // Check for duplicate
        var alreadyExists = group.Items.Any(i => i.StoryItemId == request.StoryItemId);
        if (alreadyExists)
        {
            _logger.LogWarning(
                "Story item {StoryItemId} already exists in highlight group {GroupId}",
                request.StoryItemId, groupId);
            // Return existing group without adding duplicate
            return MapGroupToDto(group);
        }

        // Verify story item exists
        var storyItemExists = await _context.StoryItems.AnyAsync(i => i.Id == request.StoryItemId);
        if (!storyItemExists)
            throw new KeyNotFoundException("Story item not found");

        var highlightItem = new HighlightItem
        {
            Id = Guid.NewGuid(),
            HighlightGroupId = groupId,
            StoryItemId = request.StoryItemId,
            CreatedAt = DateTime.UtcNow
        };

        _context.HighlightItems.Add(highlightItem);
        group.Items.Add(highlightItem);

        // Auto-set cover image from first item if no cover is set
        if (string.IsNullOrEmpty(group.CoverImage))
        {
            var firstItem = await _context.StoryItems
                .Where(i => i.Id == request.StoryItemId)
                .Select(i => new { i.Url, i.ThumbnailUrl })
                .FirstOrDefaultAsync();

            if (firstItem != null)
            {
                group.CoverImage = firstItem.ThumbnailUrl ?? firstItem.Url;
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Added story item {StoryItemId} to highlight group {GroupId} for user {UserId}",
            request.StoryItemId, groupId, userId);

        // Reload to get full group with items
        return await GetGroupDetailAsync(groupId) ?? MapGroupToDto(group);
    }

    public async Task<List<HighlightGroupSummaryDto>> GetUserHighlightsAsync(Guid userId)
    {
        var groups = await _context.HighlightGroups
            .Include(g => g.Items)
            .Where(g => g.UserId == userId)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();

        return groups.Select(g => new HighlightGroupSummaryDto
        {
            Id = g.Id,
            Title = g.Title,
            CoverImage = g.CoverImage,
            ItemCount = g.Items.Count
        }).ToList();
    }

    public async Task<HighlightGroupDto?> GetGroupDetailAsync(Guid groupId)
    {
        var group = await _context.HighlightGroups
            .Include(g => g.Items.OrderBy(i => i.CreatedAt))
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            return null;

        return await MapGroupToDetailDto(group);
    }

    public async Task DeleteGroupAsync(Guid groupId, Guid userId)
    {
        var group = await _context.HighlightGroups
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            throw new KeyNotFoundException("Highlight group not found");

        if (group.UserId != userId)
            throw new UnauthorizedAccessException("You can only delete your own highlight groups");

        _context.HighlightGroups.Remove(group);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Deleted highlight group {GroupId} for user {UserId}",
            groupId, userId);
    }

    public async Task RemoveItemAsync(Guid groupId, Guid itemId, Guid userId)
    {
        var group = await _context.HighlightGroups
            .Include(g => g.Items)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            throw new KeyNotFoundException("Highlight group not found");

        if (group.UserId != userId)
            throw new UnauthorizedAccessException("You can only modify your own highlight groups");

        var item = group.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
            throw new KeyNotFoundException("Highlight item not found");

        _context.HighlightItems.Remove(item);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Removed highlight item {ItemId} from group {GroupId}",
            itemId, groupId);
    }

    // ============================================================
    // MAPPING HELPERS
    // ============================================================

    private static HighlightGroupDto MapGroupToDto(HighlightGroup group)
    {
        return new HighlightGroupDto
        {
            Id = group.Id,
            UserId = group.UserId,
            Title = group.Title,
            CoverImage = group.CoverImage,
            ItemCount = group.Items?.Count ?? 0,
            CreatedAt = group.CreatedAt,
            Items = new List<HighlightItemDto>()
        };
    }

    private async Task<HighlightGroupDto> MapGroupToDetailDto(HighlightGroup group)
    {
        var groupItemIds = group.Items.Select(i => i.StoryItemId).ToList();

        // Fetch story items to resolve media URLs (handles expired stories gracefully)
        var storyItems = await _context.StoryItems
            .Where(si => groupItemIds.Contains(si.Id))
            .ToDictionaryAsync(si => si.Id);

        var items = group.Items.Select(hi =>
        {
            var resolved = storyItems.TryGetValue(hi.StoryItemId, out var si)
                ? si
                : null;

            return new HighlightItemDto
            {
                Id = hi.Id,
                StoryItemId = hi.StoryItemId,
                MediaUrl = resolved?.Url,
                ThumbnailUrl = resolved?.ThumbnailUrl,
                MediaType = resolved != null ? (int)resolved.Type : 0,
                CreatedAt = hi.CreatedAt
            };
        }).ToList();

        return new HighlightGroupDto
        {
            Id = group.Id,
            UserId = group.UserId,
            Title = group.Title,
            CoverImage = group.CoverImage,
            ItemCount = items.Count,
            CreatedAt = group.CreatedAt,
            Items = items
        };
    }
}
