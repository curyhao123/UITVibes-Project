namespace UserService.DTOs
{
    public class PostCountRpcResponse
    {
        public Guid UserId { get; set; }
        public int PostsCount { get; set; }
        public bool Found { get; set; }
    }
}
