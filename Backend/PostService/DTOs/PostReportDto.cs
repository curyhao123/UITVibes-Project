using PostService.Models;

namespace PostService.DTOs
{
    public class PostReportDto
    {
        public Guid Id { get; set; }

        // Bài đăng bị report
        public Guid PostId { get; set; }

        public UserProfileRpcResponse? ReporterProfile { get; set; }

        // Người thực hiện report
        public Guid ReporterId { get; set; }
        public string ReporterDisplayName { get; set; } = string.Empty;

        // Nội dung report
        public string Reason { get; set; } = string.Empty;

        // Trạng thái xử lý
        public ReportStatus Status { get; set; }

        // Ghi chú của Admin khi xử lý
        public string? AdminNote { get; set; }

        // Thời gian
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}
