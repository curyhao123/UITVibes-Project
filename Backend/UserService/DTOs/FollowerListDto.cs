namespace UserService.DTOs;

public class FollowerListDto
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime FollowedAt { get; set; }
}