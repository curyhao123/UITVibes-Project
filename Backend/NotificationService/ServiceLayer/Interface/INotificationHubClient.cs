using Microsoft.AspNetCore.SignalR;
using NotificationService.DTOs;
using NotificationService.Hubs;

namespace NotificationService.ServiceLayer.Interface;

/// <summary>
/// Client abstraction cho SignalR — dùng để push events từ background services.
/// </summary>
public interface INotificationHubClient
{
    /// <summary>
    /// Push notification mới tới user (qua group user-{userId}).
    /// </summary>
    Task SendNewNotificationAsync(Guid userId, NotificationDto notification, CancellationToken ct = default);

    /// <summary>
    /// Push update số lượng unread.
    /// </summary>
    Task SendUnreadCountAsync(Guid userId, int unreadCount, CancellationToken ct = default);

    /// <summary>
    /// Push event "all read" khi user mark tất cả.
    /// </summary>
    Task SendAllReadAsync(Guid userId, CancellationToken ct = default);
}

public class NotificationHubClient : INotificationHubClient
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<NotificationHubClient> _logger;

    public NotificationHubClient(
        IHubContext<NotificationHub> hubContext,
        ILogger<NotificationHubClient> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task SendNewNotificationAsync(Guid userId, NotificationDto notification, CancellationToken ct = default)
    {
        try
        {
            var group = NotificationHub.GetUserGroup(userId);
            await _hubContext.Clients
                .Group(group)
                .SendAsync("NewNotification", notification, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to push NewNotification to user {UserId}", userId);
        }
    }

    public async Task SendUnreadCountAsync(Guid userId, int unreadCount, CancellationToken ct = default)
    {
        try
        {
            var group = NotificationHub.GetUserGroup(userId);
            await _hubContext.Clients
                .Group(group)
                .SendAsync("UnreadCountChanged", unreadCount, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to push UnreadCount to user {UserId}", userId);
        }
    }

    public async Task SendAllReadAsync(Guid userId, CancellationToken ct = default)
    {
        try
        {
            var group = NotificationHub.GetUserGroup(userId);
            await _hubContext.Clients
                .Group(group)
                .SendAsync("AllNotificationsRead", ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to push AllRead to user {UserId}", userId);
        }
    }
}
