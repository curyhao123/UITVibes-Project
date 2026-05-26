using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PostService.Models;

/// <summary>
/// Represents a story item saved into a highlight group.
/// References an existing StoryItem. If the story expires, the highlight entry remains
/// but the media URL may be null/empty.
/// </summary>
public class HighlightItem
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid HighlightGroupId { get; set; }

    [Required]
    public Guid StoryItemId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(HighlightGroupId))]
    public HighlightGroup HighlightGroup { get; set; } = null!;

    [ForeignKey(nameof(StoryItemId))]
    public StoryItem StoryItem { get; set; } = null!;
}
