using PostService.DTOs;
using PostService.Enums;
using PostService.Messaging.Interface;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Gửi thông báo cho tác giả khi nội dung của họ bị kiểm duyệt.
///
/// Tách riêng khỏi worker / admin service để:
///   - Quy tắc "loại sự kiện nào thì thông báo gì" chỉ nằm ở một chỗ.
///   - Việc publish lỗi không bao giờ làm hỏng luồng kiểm duyệt chính.
/// </summary>
public interface IContentModerationNotifier
{
    /// <summary>
    /// Thông báo cho tác giả khi AI từ chối nội dung.
    /// </summary>
    Task NotifyRejectedAsync(
        Guid userId,
        Guid targetId,
        ModerationTargetType targetType,
        string? reason,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Thông báo cho tác giả khi nội dung chuyển sang vùng xám (chờ admin xem xét).
    /// </summary>
    Task NotifyNeedsReviewAsync(
        Guid userId,
        Guid targetId,
        ModerationTargetType targetType,
        string? reason,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Thông báo cho tác giả khi admin đã xử lý xong khiếu nại.
    /// </summary>
    Task NotifyAppealResolvedAsync(
        Guid userId,
        Guid targetId,
        ModerationTargetType targetType,
        bool approved,
        string? reason,
        CancellationToken cancellationToken = default);
}
