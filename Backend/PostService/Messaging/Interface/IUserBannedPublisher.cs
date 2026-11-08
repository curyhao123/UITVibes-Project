using PostService.DTOs;

namespace PostService.Messaging.Interface;

/// <summary>
/// Publish event khoá tài khoản sang AuthService (queue "user.banned").
///
/// Được dùng bởi hệ thống strike (Phase 3.5) khi user vượt ngưỡng vi phạm.
/// </summary>
public interface IUserBannedPublisher
{
    /// <summary>
    /// Gửi event khoá/gỡ khoá tài khoản.
    /// </summary>
    Task PublishAsync(UserBannedEvent evt, CancellationToken ct = default);
}
