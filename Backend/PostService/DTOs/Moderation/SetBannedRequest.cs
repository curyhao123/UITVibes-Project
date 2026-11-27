namespace PostService.DTOs.Moderation;

/// <summary>
/// Request đổi trạng thái ban của một tài khoản (Phase 3.5).
/// Dùng khi admin khoá/gỡ khoá thủ công từ Strike Manager.
/// </summary>
public class SetBannedRequest
{
    /// true = khoá tài khoản, false = gỡ khoá.
    public bool IsBanned { get; set; }

    /// Lý do (ghi lại để audit và hiển thị cho user).
    public string? Reason { get; set; }
}
