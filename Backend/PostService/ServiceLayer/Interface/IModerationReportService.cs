using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Liên kết report của người dùng với hàng đợi kiểm duyệt AI (Phase 3.6).
///
/// Cơ chế:
///   - Nội dung bị report đủ ngưỡng → tự đẩy vào hàng đợi kiểm duyệt để AI
///     đánh giá lại (nội dung có thể đã lọt qua lúc đăng).
///   - Nội dung bị report nhiều → tăng điểm ưu tiên để admin xét trước.
/// </summary>
public interface IModerationReportService
{
    /// <summary>
    /// Xử lý khi có report mới cho một nội dung: cập nhật số report, đẩy vào
    /// queue nếu đạt ngưỡng, và cập nhật điểm ưu tiên.
    /// </summary>
    /// <returns>true nếu nội dung vừa được đẩy vào hàng đợi kiểm duyệt.</returns>
    Task<bool> HandleReportAsync(
        Guid targetId,
        ModerationTargetType targetType,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Điểm ưu tiên hiện tại của một nội dung (report × boost + severity × boost).
    /// </summary>
    Task<int> ComputePriorityAsync(
        Guid targetId,
        ModerationTargetType targetType,
        CancellationToken cancellationToken = default);
}
