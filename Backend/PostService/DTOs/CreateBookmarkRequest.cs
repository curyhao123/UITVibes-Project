namespace PostService.DTOs
{
    public class CreateBookmarkRequest
    {
        public Guid PostId { get; set; }
        public string? Collection { get; set; }
        public Guid UserId { get; set; }

    }
}
