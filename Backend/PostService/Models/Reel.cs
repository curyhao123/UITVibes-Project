namespace PostService.Models
{
    public class Reel
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; } 

        // Nội dung
        public string VideoUrl { get; set; } = string.Empty;
        public string VideoPublicId { get; set; } = string.Empty;
        public string? ThumbnailUrl { get; set; }
        public string? ThumbnailPublicId { get; set; }
        public string? Caption { get; set; }      // Mô tả ngắn
        public int Duration { get; set; }         // Thời lượng video (giây)

        // Thống kê
        public int ViewCount { get; set; } = 0;

        // Thời gian
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public ICollection<ReelLike> Likes { get; set; } = new List<ReelLike>();
        public ICollection<ReelComment> Comments { get; set; } = new List<ReelComment>();
        public ICollection<ReelShare> Shares { get; set; } = new List<ReelShare>();
    }
}
