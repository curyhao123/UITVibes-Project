namespace PostService.DTOs
{
    public class UserProfileRpcRequest
    {
        public Guid UserId { get; set; }
        public string? DisplayName { get; set; }
    }
}
