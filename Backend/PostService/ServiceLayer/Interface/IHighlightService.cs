using PostService.DTOs;

namespace PostService.ServiceLayer.Interface;

public interface IHighlightService
{
    /// <summary>
    /// Create a new highlight group, optionally with the first story item.
    /// </summary>
    Task<HighlightGroupDto> CreateGroupAsync(Guid userId, CreateHighlightGroupRequest request);

    /// <summary>
    /// Add an existing story item to a highlight group.
    /// </summary>
    Task<HighlightGroupDto> AddItemToGroupAsync(Guid userId, Guid groupId, AddHighlightItemRequest request);

    /// <summary>
    /// Get all highlight groups for a user (for profile page).
    /// </summary>
    Task<List<HighlightGroupSummaryDto>> GetUserHighlightsAsync(Guid userId);

    /// <summary>
    /// Get full highlight group detail (with items resolved).
    /// </summary>
    Task<HighlightGroupDto?> GetGroupDetailAsync(Guid groupId);

    /// <summary>
    /// Delete a highlight group (only by owner).
    /// </summary>
    Task DeleteGroupAsync(Guid groupId, Guid userId);

    /// <summary>
    /// Remove an item from a highlight group (only by owner).
    /// </summary>
    Task RemoveItemAsync(Guid groupId, Guid itemId, Guid userId);
}
