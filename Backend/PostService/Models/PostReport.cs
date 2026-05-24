namespace PostService.Models
{
    public class PostReport
    {
        public Guid Id { get; set; }

        // Bài đăng bị report
        public Guid PostId { get; set; }
        public Post Post { get; set; } = null!;

        // Người thực hiện report
        public Guid ReporterId { get; set; }

        // Nội dung report
        public string Reason { get; set; } = string.Empty;

        // Chi tiết bổ sung từ người report
        public string? AdditionalDetails { get; set; }

        // Trạng thái xử lý
        public ReportStatus Status { get; set; } = ReportStatus.Pending;

        // Ghi chú của Admin khi xử lý
        public string? AdminNote { get; set; }

        // Thời gian
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }

    public enum ReportStatus
    {
        Pending = 0,    // Chờ xử lý
        Resolved = 1,   // Đã xử lý (ẩn bài)
        Dismissed = 2   // Bỏ qua
    }
}
