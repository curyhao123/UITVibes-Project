using UserService.Models;

namespace UserService.DTOs
{
    public class UserReportDto
    {
        public Guid Id { get; set; }
        public Guid ReporterUserId { get; set; }
        public Guid ReportedUserId { get; set; }
        public string ReporterDisplayName { get; set; } = null!;
        public string ReportedDisplayName { get; set; } = null!;
        public string Reason { get; set; } = null!;
        public string? AdditionalDetails { get; set; }
 
        public DateTime CreatedAt { get; set; }
        public ReportStatus Status { get; set; }
        public string? AdminNote { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}
