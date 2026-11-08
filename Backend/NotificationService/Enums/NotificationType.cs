namespace NotificationService.Enums;

public enum NotificationType
{
    NewMessage,
    MessageRead,
    PostLiked,
    PostCommented,
    NewFollower,
    Mentioned,
    Tagged,

    // ── Moderation (AI kiểm duyệt nội dung) ──────────────────────────────
    /// Nội dung của tác giả bị AI từ chối.
    ContentRejected,

    /// Nội dung của tác giả chuyển sang vùng xám, đang chờ admin xem xét.
    ContentNeedsReview,

    /// Admin đã xử lý xong khiếu nại của tác giả.
    AppealResolved
}
