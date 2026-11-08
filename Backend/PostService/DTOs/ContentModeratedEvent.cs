namespace PostService.DTOs
{
    /// <summary>
    /// Event phát ra khi hệ thống kiểm duyệt có quyết định về nội dung của tác giả.
    ///
    /// Được publish bởi worker (quyết định của AI) và bởi admin service
    /// (quyết định của con người). NotificationService nhận event này để báo
    /// cho tác giả biết nội dung của họ đã bị từ chối / cần xem xét / khiếu nại
    /// đã được xử lý.
    /// </summary>
    public record ContentModeratedEvent(
        /// Tác giả của nội dung — người sẽ nhận thông báo.
        Guid UserId,

        /// Id của nội dung bị kiểm duyệt (PostId / CommentId / ReelId).
        Guid TargetId,

        /// Loại nội dung: "Post" | "Comment" | "Reel".
        string TargetType,

        /// Trạng thái sau khi kiểm duyệt: "Approved" | "Rejected" | "NeedsReview" | "Pending".
        string Status,

        /// Lý do gửi cho tác giả (có thể null khi được duyệt).
        string? Reason,

        /// Loại sự kiện: "ContentRejected" | "ContentNeedsReview" | "AppealResolved".
        string EventType
    );
}
