namespace PostService.Enums;

/// <summary>
/// Trạng thái khiếu nại của tác giả đối với một quyết định kiểm duyệt.
///
/// Luồng:
///   None    → tác giả chưa khiếu nại (mặc định)
///   Pending → tác giả đã gửi khiếu nại, đang chờ admin xem xét
///   Resolved→ admin đã xử lý khiếu nại (duyệt hoặc từ chối lại)
///
/// Khiếu nại KHÔNG tự động đảo ngược quyết định của AI — nó chỉ chuyển nội dung
/// vào vùng xám để một con người quyết định lần cuối.
/// </summary>
public enum ModerationAppealStatus
{
    None = 0,
    Pending = 1,
    Resolved = 2
}
