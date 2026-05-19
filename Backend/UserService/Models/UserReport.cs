namespace UserService.Models
{
    public class UserReport
    {
        public Guid Id { get; set; }

        // Người bị report
        public Guid TargetUserId { get; set; }

        // Người thực hiện report
        public Guid ReporterId { get; set; }

        // Nội dung report
        public string Reason { get; set; } = string.Empty;

        // Trạng thái xử lý
        public ReportStatus Status { get; set; } = ReportStatus.Pending;

        // Ghi chú của Admin khi xử lý (tuỳ chọn)
        public string? AdminNote { get; set; }

        // Thời gian
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }

    public enum ReportStatus
    {
        Pending = 0,    // Chờ xử lý
        Resolved = 1,   // Đã ghi nhận
        Dismissed = 2   // Bỏ qua
    }
}
