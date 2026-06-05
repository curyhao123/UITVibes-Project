using Microsoft.EntityFrameworkCore;
using NotificationService.DTOs;
using NotificationService.Models;
using NotificationService.ServiceLayer.Interface;

namespace NotificationService.ServiceLayer.Implementation
{
    public class NotificationService : INotificationService
    {
        private readonly ILogger<NotificationService> _logger;
        private readonly NotificationDbContext _db;
        private readonly OutboxService _outboxService;
        public NotificationService(ILogger<NotificationService> logger, NotificationDbContext dbContext, OutboxService outboxService)
        {
            _logger = logger;
            _db = dbContext;
            _outboxService = outboxService;
        }

        public async Task CreateAsync(NotificationInput input, CancellationToken ct = default)
        {
            // 1. Kiểm tra user có tắt thông báo không
            var setting = await _db.UserNotificationSettings
                .FirstOrDefaultAsync(x => x.UserId == input.UserId, ct);

            if (setting is { IsEnabled: false })
            {
                _logger.LogDebug("Notifications disabled for user {UserId}", input.UserId);
                return;
            }

            // 2. Dedup — tránh spam cùng loại trong 5 phút
            var isDuplicate = await _db.Notifications.AnyAsync(x =>
                x.UserId == input.UserId &&
                x.Type == input.Type &&
                x.EntityId == input.EntityId &&
                x.CreatedAt >= DateTime.UtcNow.AddMinutes(-5), ct);

            if (isDuplicate)
            {
                _logger.LogDebug("Duplicate notification suppressed for user {UserId}", input.UserId);
                return;
            }

            // 3. Tạo notification
            var (_, body) = NotificationTemplates.Render(input.Type, input.ActorName, input.Extra);
            var notification = new Notification
            {
                UserId = input.UserId,
                ActorId = input.ActorId,
                EntityId = input.EntityId,
                Type = input.Type,
                Content = body,
            };

            _db.Notifications.Add(notification);

            // 4. Tạo OutboxMessage trong cùng transaction
            var outboxMessage = OutboxMessage.Create(
                notification.Id,
                DeliveryChannel.Push,
                new PushPayload(
                    body,
                    body,
                    input.Type.ToString(),
                    input.EntityId.ToString(),
                    notification.Id.ToString()));

            _db.OutboxMessages.Add(outboxMessage);

            await _db.SaveChangesAsync(ct);
        }

        public async Task MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default)
        {
            var notification = await _db.Notifications
                .FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId, ct);
            
            if (notification == null)
            {
                _logger.LogWarning("Notification {NotificationId} not found for user {UserId}", notificationId, userId);
                return;
            }

            notification.MarkAsRead();
            await _db.SaveChangesAsync(ct);
        }

        public async Task MarkAllAsReadAsync(Guid userId, CancellationToken ct = default)
        {
            await _db.Notifications
                .Where(x => x.UserId == userId && !x.IsRead)
                .ExecuteUpdateAsync(x => x
                    .SetProperty(n => n.IsRead, true)
                    .SetProperty(n => n.ReadAt, DateTime.UtcNow), ct);
        }

        public async Task<PagedResult<NotificationDto>> GetByUserAsync(
       Guid userId, int page, int pageSize, CancellationToken ct = default)
        {
            var query = _db.Notifications
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt);

            var total = await query.CountAsync(ct);
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => NotificationDto.From(x))
                .ToListAsync(ct);

            return new PagedResult<NotificationDto>(items, total, page, pageSize);
        }

        public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default)
            => await _db.Notifications
                .CountAsync(x => x.UserId == userId && !x.IsRead, ct);
    }
}
