using System.ComponentModel.DataAnnotations;

namespace PostService.DTOs;

public class CreatePostRequest
{
    [Required]
    [MaxLength(5000, ErrorMessage = "Content cannot exceed 5000 characters")]
    public string Content { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Location { get; set; }

    public PostVisibilityDto Visibility { get; set; } = PostVisibilityDto.Public;

    /// List of media items to attach to post
    public List<PostMediaRequest>? Media { get; set; }
}

public enum PostVisibilityDto
{
    Public = 0,
    Followers = 1,
    Private = 2
}