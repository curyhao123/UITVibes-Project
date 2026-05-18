namespace PostService.DTOs
{
    public class RepostResponse
    {
        public Guid RepostId { get; set; }
        public Guid OriginalPostId { get; set; }
        public Guid UserId { get; set; }
        public int TotalReposts { get; set; }
        public DateTime CreatedAt { get; set; }
    }

}
