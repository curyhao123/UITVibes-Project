using FirebaseAdmin.Messaging;
using NotificationService.DTOs;
using NotificationService.ServiceLayer.Interface;

namespace NotificationService.ServiceLayer.Implementation
{
    public class FcmPushSender : IFcmPushSender
    {
        private const string DefaultAndroidChannelId = "uitvibes_default_channel";
        private readonly FirebaseMessaging _messaging;
        private readonly IDeviceTokenService _deviceService;
        private readonly ILogger<FcmPushSender> _logger;

        public FcmPushSender(IDeviceTokenService deviceService, ILogger<FcmPushSender> logger)
        {
            _deviceService = deviceService;
            _logger = logger;
            _messaging = FirebaseMessaging.DefaultInstance;
        }

        public async Task SendAsync(List<string> tokens, PushPayload payload, CancellationToken ct = default)
        {
            var data = new Dictionary<string, string>
            {
                ["type"] = payload.Type,
                ["entityId"] = payload.EntityId,
            };

            if (!string.IsNullOrWhiteSpace(payload.NotificationId))
                data["notificationId"] = payload.NotificationId;

            var message = new MulticastMessage
            {
                Tokens = tokens,
                Notification = new FirebaseAdmin.Messaging.Notification
                {
                    Title = payload.Title,
                    Body = payload.Body,
                },
                Data = data,
                Android = new AndroidConfig
                {
                    Priority = Priority.High,
                    Notification = new AndroidNotification
                    {
                        ChannelId = DefaultAndroidChannelId,
                        Sound = "default"
                    }
                },
                Apns = new ApnsConfig
                {
                    Aps = new Aps { Sound = "default" }
                }
            };

            var result = await _messaging.SendEachForMulticastAsync(message, ct);

            _logger.LogInformation("FCM sent {Success}/{Total}", result.SuccessCount, tokens.Count);

            // Deactivate token không còn hiệu lực
            var invalidTokens = tokens
                .Zip(result.Responses)
                .Where(x => !x.Second.IsSuccess &&
                            x.Second.Exception?.MessagingErrorCode == MessagingErrorCode.Unregistered)
                .Select(x => x.First)
                .ToList();

            if (invalidTokens.Any())
                await _deviceService.DeactivateAsync(invalidTokens, ct);
        }
    }

}
