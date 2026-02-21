namespace PostService.DTOs
{
    public class BookmarkDto
    {
        public Guid Id { get; set; }
        public Guid PostId { get; set; }
        public Guid UserId { get; set; }
        public string? Collection { get; set; }
        public DateTime CreatedAt { get; set; }
        // Include full post details
        public PostDto? Post { get; set; }
    }
}
