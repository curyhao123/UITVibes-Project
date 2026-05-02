namespace UserService.DTOs
{
    public class FriendListOnlineDto
    {
        public Guid UserId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }

    }
}
