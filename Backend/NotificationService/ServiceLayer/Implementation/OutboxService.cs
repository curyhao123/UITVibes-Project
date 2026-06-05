using Microsoft.EntityFrameworkCore;
using NotificationService.DTOs;
using NotificationService.Models;
using System.Text.Json;

namespace NotificationService.ServiceLayer.Implementation
{
    public class OutboxService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<OutboxService> _logger;

        public OutboxService(IServiceScopeFactory scopeFactory, ILogger<OutboxService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                try { await ProcessBatchAsync(ct); }
                catch (Exception ex) { _logger.LogError(ex, "Outbox processing failed"); }

                await Task.Delay(TimeSpan.FromSeconds(5), ct);
            }
        }

        private async Task ProcessBatchAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
            var pushSender = scope.ServiceProvider.GetRequiredService<global::NotificationService.ServiceLayer.Interface.IFcmPushSender>();
            var deviceService = scope.ServiceProvider.GetRequiredService<global::NotificationService.ServiceLayer.Interface.IDeviceTokenService>();

            var pending = await db.OutboxMessages
                .Where(x => x.Status == OutboxStatus.Pending)
                .OrderBy(x => x.CreatedAt)
                .Take(50)
                .ToListAsync(ct);

            if (!pending.Any()) return;

            foreach (var message in pending)
            {
                try
                {
                    var payload = JsonSerializer.Deserialize<PushPayload>(message.Payload)!;

                    // Lấy NotificationId → UserId → tokens
                    var notification = await db.Notifications
                        .FirstOrDefaultAsync(x => x.Id == message.NotificationId, ct);

                    if (notification is null) { message.MarkSuccess(); continue; }

                    var tokens = await deviceService.GetActiveTokensAsync(notification.UserId, ct);

                    if (tokens.Count > 0)
                        await pushSender.SendAsync(tokens, payload, ct);

                    message.MarkSuccess();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to process OutboxMessage {Id}", message.Id);
                    message.MarkFailed(ex.Message);
                }
            }

            await db.SaveChangesAsync(ct);
        }
    }
}
