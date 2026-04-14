namespace UserService.DTOs
{
    public class SearchUserProfileDto
    {
        public Guid UserId { get; set; }
        public string? DisplayName { get; set; }
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
        public string? AvatarPublicId { get; set; }
        public int? FollowersCount { get; set; }
    }
}
