using System.ComponentModel.DataAnnotations;

namespace PostService.DTOs;

public class CreateCommentRequest
{
    /// <summary>
    /// Comment text content. Can be empty if ImageUrl is provided.
    /// </summary>
    [MaxLength(2000, ErrorMessage = "Comment cannot exceed 2000 characters")]
    public string? Content { get; set; }

    /// <summary>
    /// Optional image URL for comment attachment.
    /// If provided, must also have at least some content or this is ignored.
    /// </summary>
    public string? ImageUrl { get; set; }

    public Guid? ParentCommentId { get; set; }
}