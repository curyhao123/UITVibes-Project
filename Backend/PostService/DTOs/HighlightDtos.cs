using System.ComponentModel.DataAnnotations;

namespace PostService.DTOs;

// ============================================================
// REQUEST DTOs
// ============================================================

/// <summary>
/// Request to create a new highlight group.
/// </summary>
public class CreateHighlightGroupRequest
{
    [Required]
    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Optional: provide a specific cover image URL. If not provided,
    /// the cover defaults to the first story item's media.
    /// </summary>
    public string? CoverImage { get; set; }
}

/// <summary>
/// Request to add a story item to an existing highlight group.
/// </summary>
public class AddHighlightItemRequest
{
    [Required]
    public Guid StoryItemId { get; set; }
}

// ============================================================
// RESPONSE DTOs
// ============================================================

/// <summary>
/// A single highlight item in a group (references a story item).
/// </summary>
public class HighlightItemDto
{
    public Guid Id { get; set; }
    public Guid StoryItemId { get; set; }
    public string? MediaUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int MediaType { get; set; } // 0=image, 1=video
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// A highlight group with its items and story media resolved.
/// </summary>
public class HighlightGroupDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? CoverImage { get; set; }
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<HighlightItemDto> Items { get; set; } = new();
}

/// <summary>
/// Lightweight version for profile listing (without items).
/// </summary>
public class HighlightGroupSummaryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? CoverImage { get; set; }
    public int ItemCount { get; set; }
}
