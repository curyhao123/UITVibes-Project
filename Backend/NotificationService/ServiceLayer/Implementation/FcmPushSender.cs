using NotificationService.DTOs;
using NotificationService.ServiceLayer.Interface;

namespace NotificationService.ServiceLayer.Implementation
{
    /// <summary>
    /// Dummy FCM push sender - Firebase removed.
    /// Replace with actual FCM implementation when ready.
    /// </summary>
    public class FcmPushSender : IFcmPushSender
    {
        private readonly IDeviceTokenService _deviceService;
        private readonly ILogger<FcmPushSender> _logger;

        public FcmPushSender(IDeviceTokenService deviceService, ILogger<FcmPushSender> logger)
        {
            _deviceService = deviceService;
            _logger = logger;
        }

        public async Task SendAsync(List<string> tokens, PushPayload payload, CancellationToken ct = default)
        {
            _logger.LogInformation(
                "[DUMMY FCM] Would send push notification to {Count} devices - Title: {Title}, Body: {Body}",
                tokens.Count, payload.Title, payload.Body);

            // TODO: Implement actual push notification (e.g., OneSignal, Expo, etc.)
            await Task.CompletedTask;
        }
    }
}
