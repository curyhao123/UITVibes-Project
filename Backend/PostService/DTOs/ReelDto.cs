namespace PostService.DTOs
{
    public class ReelDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }

        // Thông tin chủ Reel — lấy từ UserService qua RPC
        public string OwnerDisplayName { get; set; } = string.Empty;
        public string? OwnerAvatarUrl { get; set; }

        // Nội dung
        public string VideoUrl { get; set; } = string.Empty;
        public string? ThumbnailUrl { get; set; }
        public string? Caption { get; set; }
        public int Duration { get; set; }

        // Thống kê
        public int LikeCount { get; set; }
        public int CommentCount { get; set; }
        public int ShareCount { get; set; }
        public int ViewCount { get; set; }

        // Trạng thái của người dùng hiện tại
        public bool IsLiked { get; set; }       // currentUser đã like chưa
        public bool IsOwner { get; set; }        // currentUser có phải chủ không

        public DateTime CreatedAt { get; set; }
    }
}
