namespace UserService.DTOs
{
    public class BlockListDto
    {
        public Guid BlockedUserId { get; set; }
        public string? DisplayName { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime BlockedAt { get; set; }
    }
}
