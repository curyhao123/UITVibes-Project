using PostService.DTOs.Moderation;
using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Orchestrates một lần kiểm duyệt content qua LLM:
///   Build prompt → Gọi DeepSeek API → Parse response → Evaluate decision.
///
/// Không biết về DB, không biết về ModerationResult entity — chỉ nhận content,
/// trả về ModerationDecisionResult. Caller (worker) tự quyết định lưu kết quả như thế nào.
///
/// Mọi lỗi (network, timeout, parse fail, LLM trả rác) đều được bắt nội bộ và trả về
/// ModerationDecisionResult với Source = Fallback và Status = NeedsReview thay vì throw.
/// </summary>
public interface ILlmModerationService
{
    /// <param name="content">Nội dung cần kiểm duyệt. Không được null/empty.</param>
    /// <param name="targetType">Loại content: Post / Comment / Reel / Story.</param>
    /// <param name="cancellationToken">Token hủy từ caller (thường là worker host).</param>
    /// <returns>
    /// Kết quả quyết định. Không bao giờ throw — lỗi trả về dưới dạng
    /// <see cref="ModerationDecisionResult"/> với <see cref="ModerationSource.Fallback"/>.
    /// </returns>
    Task<ModerationDecisionResult> ModerateAsync(
        string content,
        ModerationTargetType targetType,
        CancellationToken cancellationToken = default);
}
