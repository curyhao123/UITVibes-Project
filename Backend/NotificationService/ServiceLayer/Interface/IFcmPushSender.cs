using NotificationService.DTOs;

namespace NotificationService.ServiceLayer.Interface
{
    public interface IFcmPushSender
    {
        Task SendAsync(List<string> tokens, PushPayload payload, CancellationToken ct = default);

    }
}
