namespace PostService.Models
{
    public class ReelComment
    {
        public Guid Id { get; set; }
        public Guid ReelId { get; set; }
        public Reel Reel { get; set; } = null!;
        public Guid UserId { get; set; }        
        public string Content { get; set; } = string.Empty;
        public int LikeCount { get; set; } = 0;
        public int ReplyCount { get; set; } = 0;

        // Hỗ trợ reply comment
        public Guid? ParentCommentId { get; set; }
        public ReelComment? ParentComment { get; set; }
        public ICollection<ReelComment> Replies { get; set; } = new List<ReelComment>();
        public ICollection<ReelCommentLike> Likes { get; set; } = new List<ReelCommentLike>();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
