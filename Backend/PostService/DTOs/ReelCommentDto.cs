namespace PostService.DTOs
{
    public class ReelCommentDto
    {
        public Guid Id { get; set; }
        public Guid ReelId { get; set; }
        public Guid UserId { get; set; }

        // Thông tin người comment — lấy từ UserService qua RPC
        public string UserDisplayName { get; set; } = string.Empty;
        public string? UserAvatarUrl { get; set; }

        // Nội dung
        public string Content { get; set; } = string.Empty;

        // Reply
        public Guid? ParentCommentId { get; set; }
        public int ReplyCount { get; set; }

        // Thống kê
        public int LikeCount { get; set; }

        // Trạng thái người dùng hiện tại
        public bool IsLiked { get; set; }
        public bool IsOwner { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
