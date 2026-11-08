using PostService.DTOs.Moderation;
using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Luồng khiếu nại (appeal) dành cho TÁC GIẢ nội dung.
///
/// Khi bài bị AI từ chối, tác giả có 2 đường:
///   1. Sửa nội dung rồi resubmit (đã có ở Phase 1 — <see cref="IModerationEnqueuer.ResubmitAsync"/>).
///   2. Khiếu nại: cho biết nội dung vẫn sai nhưng xin admin xem lại.
///
/// Khiếu nại KHÔNG tự đảo ngược quyết định của AI. Nó chỉ chuyển bản ghi sang
/// vùng xám (NeedsReview) để một con người quyết định lần cuối.
/// </summary>
public interface IModerationAppealService
{
    /// <summary>
    /// Tác giả gửi khiếu nại cho một bản ghi kiểm duyệt đã bị từ chối.
    ///
    /// Quy tắc:
    ///   - Chỉ tác giả của nội dung mới được khiếu nại.
    ///   - Chỉ khiếu nại được khi bản ghi đang ở trạng thái Rejected.
    ///   - Mỗi bản ghi chỉ có một khiếu nại đang chờ xử lý.
    /// </summary>
    Task<ModerationAppealResultDto> SubmitAppealAsync(
        Guid moderationResultId,
        Guid userId,
        string reason);

    /// <summary>
    /// Lấy trạng thái khiếu nại của một bản ghi (dùng cho tác giả xem trạng thái).
    /// Trả về null nếu bản ghi không tồn tại.
    /// </summary>
    Task<ModerationAppealResultDto?> GetAppealAsync(Guid moderationResultId, Guid userId);
}
