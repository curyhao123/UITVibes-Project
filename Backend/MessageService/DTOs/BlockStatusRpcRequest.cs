namespace MessageService.DTOs
{
    public class BlockStatusRpcRequest
    {
        public Guid CurrentUserId { get; set; }
        public Guid OtherUserId { get; set; }
    }
}
