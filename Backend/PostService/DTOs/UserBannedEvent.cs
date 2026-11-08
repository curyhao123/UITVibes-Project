namespace PostService.DTOs;

/// <summary>
/// Event khoá tài khoản do kiểm duyệt AI phát ra (Phase 3.5).
///
/// Định dạng phải khớp với <c>UserBannedEvent</c> mà AuthService/UserService
/// consume trên queue "user.banned".
///
/// Lưu ý: <c>UserService.UserBannedEvent</c> có property <c>IsBanned</c> — event
/// này dùng <c>IsBanned = true</c> để khoá. Gửi <c>IsBanned = false</c> để gỡ khoá.
/// </summary>
public class UserBannedEvent
{
    public Guid UserId { get; set; }

    /// true = khoá tài khoản, false = gỡ khoá.
    public bool IsBanned { get; set; }

    /// Lý do khoá (hiển thị cho user).
    public string? Reason { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
