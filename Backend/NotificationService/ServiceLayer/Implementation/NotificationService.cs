using Microsoft.EntityFrameworkCore;
using NotificationService.DTOs;
using NotificationService.Enums;
using NotificationService.Models;
using NotificationService.ServiceLayer.Interface;

namespace NotificationService.ServiceLayer.Implementation
{
    public class NotificationService : INotificationService
    {
        private readonly ILogger<NotificationService> _logger;
        private readonly NotificationDbContext _db;
        private readonly OutboxService _outboxService;
        private readonly INotificationHubClient _hubClient;

        public NotificationService(
            ILogger<NotificationService> logger,
            NotificationDbContext dbContext,
            OutboxService outboxService,
            INotificationHubClient hubClient)
        {
            _logger = logger;
            _db = dbContext;
            _outboxService = outboxService;
            _hubClient = hubClient;
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

            // 2. Special case: NewMessage — gộp các tin nhắn cùng conv trong 5 phút
            //    (X đã gửi N tin nhắn cho bạn) thay vì tạo 1 notification/tin
            if (input.Type == NotificationType.NewMessage)
            {
                await CreateOrMergeMessageNotificationAsync(input, ct);
                return;
            }

            // 3. Các loại khác: dedup đơn giản trong 5 phút
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

            // 4. Tạo notification
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

            // 5. Tạo OutboxMessage trong cùng transaction
            var outboxMessage = OutboxMessage.Create(
                notification.Id,
                DeliveryChannel.Push,
                new PushPayload(body, body, input.Type.ToString(), input.EntityId.ToString()));

            _db.OutboxMessages.Add(outboxMessage);

            await _db.SaveChangesAsync(ct);

            // 6. Push realtime tới client
            var unread = await GetUnreadCountAsync(input.UserId, ct);
            var dto = NotificationDto.From(notification);
            await _hubClient.SendNewNotificationAsync(input.UserId, dto, ct);
            await _hubClient.SendUnreadCountAsync(input.UserId, unread, ct);
        }

        /// <summary>
        /// NewMessage-specific flow: gộp các tin nhắn cùng actor + cùng conversation
        /// trong cửa sổ 5 phút thành 1 notification với content "... đã gửi N tin nhắn cho bạn."
        /// </summary>
        private async Task CreateOrMergeMessageNotificationAsync(
            NotificationInput input, CancellationToken ct)
        {
            const int MERGE_WINDOW_MINUTES = 5;

            // Tìm notification cùng (UserId, NewMessage, EntityId=Conv, ActorId=Sender)
            // còn trong cửa sổ 5 phút
            var existing = await _db.Notifications
                .Where(x => x.UserId == input.UserId
                            && x.Type == NotificationType.NewMessage
                            && x.ActorId == input.ActorId
                            && x.EntityId == input.EntityId
                            && x.CreatedAt >= DateTime.UtcNow.AddMinutes(-MERGE_WINDOW_MINUTES))
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(ct);

            if (existing != null)
            {
                // Merge: tăng count, update content, refresh CreatedAt
                var newCount = existing.AggregateCount + 1;
                var newContent = RenderMessageAggregateContent(input.ActorName, newCount);
                existing.MergeWith(newContent, incrementBy: 1);

                // Đánh lại unread (vì user có thể đã đọc rồi — vẫn nổi bật lại)
                if (existing.IsRead)
                {
                    // Đã đọc rồi — KHÔNG tính lại là unread (chỉ update content + timestamp)
                }

                await _db.SaveChangesAsync(ct);

                // Push realtime — gửi notification đã update + unread count
                var unread = await GetUnreadCountAsync(input.UserId, ct);
                var dto = NotificationDto.From(existing);
                await _hubClient.SendNewNotificationAsync(input.UserId, dto, ct);
                await _hubClient.SendUnreadCountAsync(input.UserId, unread, ct);
                return;
            }

            // Chưa có → tạo mới
            var body = RenderMessageAggregateContent(input.ActorName, 1);
            var notification = new Notification
            {
                UserId = input.UserId,
                ActorId = input.ActorId,
                EntityId = input.EntityId,
                Type = NotificationType.NewMessage,
                Content = body,
            };

            _db.Notifications.Add(notification);

            // OutboxMessage cho push notification
            var outboxMessage = OutboxMessage.Create(
                notification.Id,
                DeliveryChannel.Push,
                new PushPayload("Tin nhắn mới", body, NotificationType.NewMessage.ToString(), input.EntityId.ToString()));

            _db.OutboxMessages.Add(outboxMessage);

            await _db.SaveChangesAsync(ct);

            var newUnread = await GetUnreadCountAsync(input.UserId, ct);
            var newDto = NotificationDto.From(notification);
            await _hubClient.SendNewNotificationAsync(input.UserId, newDto, ct);
            await _hubClient.SendUnreadCountAsync(input.UserId, newUnread, ct);
        }

        /// <summary>
        /// Render content cho NewMessage với số lượng aggregate.
        /// </summary>
        private static string RenderMessageAggregateContent(string actorName, int count)
        {
            return count switch
            {
                1 => $"{actorName} đã gửi 1 tin nhắn cho bạn.",
                _ => $"{actorName} đã gửi {count} tin nhắn cho bạn."
            };
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

            var wasUnread = !notification.IsRead;
            notification.MarkAsRead();
            await _db.SaveChangesAsync(ct);

            // Push update unread count nếu thực sự vừa mark
            if (wasUnread)
            {
                var unread = await GetUnreadCountAsync(userId, ct);
                await _hubClient.SendUnreadCountAsync(userId, unread, ct);
            }
        }

        public async Task MarkAllAsReadAsync(Guid userId, CancellationToken ct = default)
        {
            var affected = await _db.Notifications
                .Where(x => x.UserId == userId && !x.IsRead)
                .ExecuteUpdateAsync(x => x
                    .SetProperty(n => n.IsRead, true)
                    .SetProperty(n => n.ReadAt, DateTime.UtcNow), ct);

            if (affected > 0)
            {
                await _hubClient.SendUnreadCountAsync(userId, 0, ct);
                await _hubClient.SendAllReadAsync(userId, ct);
            }
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
