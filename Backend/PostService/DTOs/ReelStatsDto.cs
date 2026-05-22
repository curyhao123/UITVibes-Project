namespace PostService.DTOs
{
    public class ReelStatsDto
    {
        public Guid ReelId { get; set; }
        public int LikeCount { get; set; }
        public int CommentCount { get; set; }
        public int ShareCount { get; set; }
        public int ViewCount { get; set; }
    }
}
