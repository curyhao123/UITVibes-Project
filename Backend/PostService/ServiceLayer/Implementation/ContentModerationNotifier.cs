using PostService.DTOs;
using PostService.Enums;
using PostService.Messaging.Interface;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Gửi thông báo kiểm duyệt cho tác giả qua RabbitMQ.
///
/// Mọi lỗi publish đều bị log và nuốt — thông báo là thông tin phụ, không được
/// phép làm hỏng luồng kiểm duyệt chính (worker vẫn phải cập nhật trạng thái
/// content đúng dù RabbitMQ chết).
/// </summary>
public class ContentModerationNotifier : IContentModerationNotifier
{
    /// <summary>
    /// Event types — phải khớp với NotificationType ở NotificationService.
    /// </summary>
    public const string EventTypeRejected = "ContentRejected";
    public const string EventTypeNeedsReview = "ContentNeedsReview";
    public const string EventTypeAppealResolved = "AppealResolved";

    private readonly IContentModeratedPublisher _publisher;
    private readonly ILogger<ContentModerationNotifier> _logger;

    public ContentModerationNotifier(
        IContentModeratedPublisher publisher,
        ILogger<ContentModerationNotifier> logger)
    {
        _publisher = publisher;
        _logger = logger;
    }

    public Task NotifyRejectedAsync(
        Guid userId,
        Guid targetId,
        ModerationTargetType targetType,
        string? reason,
        CancellationToken cancellationToken = default)
        => PublishSafeAsync(
            userId, targetId, targetType, ModerationStatus.Rejected.ToString(),
            reason, EventTypeRejected, cancellationToken);

    public Task NotifyNeedsReviewAsync(
        Guid userId,
        Guid targetId,
        ModerationTargetType targetType,
        string? reason,
        CancellationToken cancellationToken = default)
        => PublishSafeAsync(
            userId, targetId, targetType, ModerationStatus.NeedsReview.ToString(),
            reason, EventTypeNeedsReview, cancellationToken);

    public Task NotifyAppealResolvedAsync(
        Guid userId,
        Guid targetId,
        ModerationTargetType targetType,
        bool approved,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        // Trạng thái sau khi admin xử lý khiếu nại.
        var status = approved
            ? ModerationStatus.Approved.ToString()
            : ModerationStatus.Rejected.ToString();

        return PublishSafeAsync(
            userId, targetId, targetType, status, reason,
            EventTypeAppealResolved, cancellationToken);
    }

    private async Task PublishSafeAsync(
        Guid userId,
        Guid targetId,
        ModerationTargetType targetType,
        string status,
        string? reason,
        string eventType,
        CancellationToken cancellationToken)
    {
        try
        {
            await _publisher.PublishAsync(
                new ContentModeratedEvent(
                    userId,
                    targetId,
                    targetType.ToString(),
                    status,
                    reason,
                    eventType),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Không ném lại — thông báo là best-effort.
            _logger.LogError(ex,
                "Failed to publish moderation notification {EventType} for user {UserId} target {TargetId}",
                eventType, userId, targetId);
        }
    }
}
