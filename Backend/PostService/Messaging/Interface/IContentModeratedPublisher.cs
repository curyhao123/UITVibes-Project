using PostService.DTOs;

namespace PostService.Messaging.Interface
{
    /// <summary>
    /// Publish sự kiện kiểm duyệt nội dung sang NotificationService.
    /// </summary>
    public interface IContentModeratedPublisher
    {
        Task PublishAsync(ContentModeratedEvent evt, CancellationToken ct = default);
    }
}
