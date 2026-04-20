namespace PostService.Models
{
    public class StoryGroup
    {
        public Guid Id { get; set; }

        /// Chủ sở hữu story
        public Guid UserId { get; set; }

        /// Denormalized display name để tránh gọi UserService khi hiển thị
        public string OwnerDisplayName { get; set; } = string.Empty;

        /// Denormalized avatar URL
        public string OwnerAvatarUrl { get; set; } = string.Empty;

        /// Story hết hạn sau 24h (tự động ẩn khỏi feed)
        public DateTime ExpiresAt { get; set; }

        /// Tổng số lượt xem của tất cả items trong group
        public int TotalViews { get; set; }

        public DateTime CreatedAt { get; set; }

        /// Các item media trong story
        public List<StoryItem> Items { get; set; } = new();
    }

}
