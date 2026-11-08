using PostService.Enums;

namespace PostService.Models
{
    public class StoryItem
    {
        public Guid Id { get; set; }

        public Guid StoryGroupId { get; set; }

        /// Loại media: 0 = Image, 1 = Video
        public MediaType Type { get; set; }

        /// URL Cloudinary
        public string Url { get; set; } = string.Empty;

        /// PublicId để xóa khỏi Cloudinary
        public string? PublicId { get; set; }

        /// Ảnh thumbnail (cho video)
        public string? ThumbnailUrl { get; set; }

        /// Vị trí hiển thị trong story group
        public int DisplayOrder { get; set; }

        /// Thời lượng (cho video, tính bằng giây)
        public int? Duration { get; set; }

        public DateTime CreatedAt { get; set; }

        // ===== Kiểm duyệt AI (Phase 3.0) =====
        // Story trước đây chỉ có media nên không đi qua pipeline text.
        // Sau khi bổ sung OCR, story cũng được kiểm duyệt như các loại nội dung khác.
        public ModerationStatus ModerationStatus { get; set; } = ModerationStatus.Pending;

        /// Thời điểm story được kiểm duyệt xong.
        public DateTime? ModeratedAt { get; set; }

        /// Navigation
        public StoryGroup StoryGroup { get; set; } = null!;

        /// Ai đã xem item này
        public List<StoryView> Views { get; set; } = new();
    }
}
