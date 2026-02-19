using System.ComponentModel.DataAnnotations;

namespace PostService.DTOs;

public class UpdatePostRequest
{
    [Required]
    [MaxLength(5000)]
    public string Content { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Location { get; set; }

    public PostVisibilityDto Visibility { get; set; } = PostVisibilityDto.Public;
}