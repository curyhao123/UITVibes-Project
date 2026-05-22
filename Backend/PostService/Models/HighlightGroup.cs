using System.ComponentModel.DataAnnotations;

namespace PostService.Models;

/// <summary>
/// Represents a highlight group on a user's profile (like Instagram Highlights).
/// Contains a collection of saved story items.
/// </summary>
public class HighlightGroup
{
    [Key]
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? CoverImage { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<HighlightItem> Items { get; set; } = new List<HighlightItem>();
}
