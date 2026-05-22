namespace PostService.Models
{
    public class ReelShare
    {
        public Guid Id { get; set; }
        public Guid ReelId { get; set; }
        public Reel Reel { get; set; } = null!;
        public Guid UserId { get; set; }        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
