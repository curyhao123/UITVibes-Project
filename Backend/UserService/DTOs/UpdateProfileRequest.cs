namespace UserService.DTOs;

public class UpdateProfileRequest
{
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Location { get; set; }
    public string? Website { get; set; }
    public string? FullName { get; set; }
    public string? Gender { get; set; }
    public List<SocialLinkDto>? SocialLinks { get; set; }
}