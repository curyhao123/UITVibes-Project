using System.ComponentModel.DataAnnotations;

namespace PostService.DTOs;

public class CreateCommentRequest
{
    [Required]
    [MaxLength(2000, ErrorMessage = "Comment cannot exceed 2000 characters")]
    public string Content { get; set; } = string.Empty;

    public Guid? ParentCommentId { get; set; }
}