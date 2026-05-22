namespace PostService.Models
{
    public class ReelCommentLike
    {
        public Guid Id { get; set; }
        public Guid ReelCommentId { get; set; }
        public ReelComment ReelComment { get; set; } = null!;
        public Guid UserId { get; set; }          // UserId từ AuthService
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
