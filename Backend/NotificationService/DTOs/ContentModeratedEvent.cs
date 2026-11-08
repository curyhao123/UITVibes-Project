namespace NotificationService.DTOs
{
    /// <summary>
    /// Event phát ra từ PostService khi hệ thống kiểm duyệt có quyết định
    /// về nội dung của tác giả.
    ///
    /// Phải khớp với <c>ContentModeratedEvent</c> ở PostService.
    /// </summary>
    public record ContentModeratedEvent(
        Guid UserId,
        Guid TargetId,
        string TargetType,
        string Status,
        string? Reason,
        string EventType
    );
}
