using NotificationService.DTOs;

namespace NotificationService.ServiceLayer.Interface
{
    public interface INotificationService
    {
        Task CreateAsync(NotificationInput input, CancellationToken ct = default);
    }
}
