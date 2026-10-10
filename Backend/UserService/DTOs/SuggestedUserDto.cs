namespace UserService.DTOs
{
    /// <summary>
    /// DTO trả về cho FE trong màn hình "Suggested users" (Instagram-style).
    /// </summary>
    public class SuggestedUserDto
    {
        public Guid UserId { get; set; }
        public string? DisplayName { get; set; }
        public string? AvatarUrl { get; set; }
        public int FollowersCount { get; set; }
        public bool IsFollowing { get; set; }
    }
}
