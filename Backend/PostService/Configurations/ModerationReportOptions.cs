namespace PostService.Configurations;

/// <summary>
/// Cấu hình liên kết report ↔ kiểm duyệt (Phase 3.6).
///
/// Hai cơ chế:
///   1. <see cref="AutoQueueThreshold"/>: số report tối đa để tự đẩy nội dung vào
///      hàng đợi kiểm duyệt (moderation) mà không cần admin bấm.
///   2. <see cref="PriorityBoostPerReport"/>: mỗi report cộng thêm điểm ưu tiên,
///      để nội dung bị report nhiều được admin xét trước.
///
/// Bind từ section "Moderation:Reports".
/// </summary>
public class ModerationReportOptions
{
    public const string SectionName = "Moderation:Reports";

    /// Bật/tắt cơ chế liên kết report.
    public bool Enabled { get; set; } = false;

    /// Số report tối đa để tự đẩy nội dung vào hàng đợi kiểm duyệt.
    /// Đặt 0 để tắt auto-queue (chỉ dùng boost ưu tiên).
    public int AutoQueueThreshold { get; set; } = 3;

    /// Số điểm ưu tiên cộng thêm cho mỗi report đang mở.
    public int PriorityBoostPerReport { get; set; } = 10;

    /// Số điểm ưu tiên cộng thêm cho mỗi điểm severity.
    public int PriorityBoostPerSeverity { get; set; } = 1;

    /// Số report tối đa được tính vào ưu tiên (tránh bị spam report làm nghẽn queue).
    public int MaxReportsForPriority { get; set; } = 20;
}
