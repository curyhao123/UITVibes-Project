namespace UserService.DTOs;

public class UserFollowStatsDto
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public int FollowersCount { get; set; }
    public int FollowingCount { get; set; }
    public bool IsFollowing { get; set; } // Current user follows this user
    public bool IsFollowedBy { get; set; } // This user follows current user
}