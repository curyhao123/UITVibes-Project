

using UserService.Enums;

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

        // Chi tiết bổ sung từ người report
        public string? AdditionalDetails { get; set; }

        // Trạng thái xử lý
        public ReportStatus Status { get; set; } = ReportStatus.Pending;

        // Ghi chú của Admin khi xử lý (tuỳ chọn)
        public string? AdminNote { get; set; }

        // Thời gian
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }

}
