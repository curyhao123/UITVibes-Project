using NotificationService.DTOs;

namespace NotificationService.ServiceLayer.Interface
{
    public interface INotificationService
    {
        Task CreateAsync(NotificationInput input, CancellationToken ct = default);
        Task MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default);
        Task MarkAllAsReadAsync(Guid userId, CancellationToken ct = default);
        Task<PagedResult<NotificationDto>> GetByUserAsync(
       Guid userId, int page, int pageSize, CancellationToken ct = default);
        Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default);

    }
}
