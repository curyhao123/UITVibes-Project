namespace PostService.DTOs
{
    public class UserProfileRpcResponse
    {
        public Guid UserId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public bool Found { get; set; }
    }
}
