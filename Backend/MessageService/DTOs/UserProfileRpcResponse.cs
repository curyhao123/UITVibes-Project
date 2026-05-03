namespace MessageService.DTOs
{
    // DTOs/UserProfileRpcResponse.cs
    public class UserProfileRpcResponse
    {
        public Guid UserId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public bool Found { get; set; }
    }
}
