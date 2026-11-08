using PostService.Enums;
using PostService.Models;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Ghi nhật ký quyết định kiểm duyệt (Phase 3.2).
///
/// Bảng <see cref="ModerationDecisionLog"/> là append-only: mỗi lần có quyết định
/// mới (rule chặn, LLM ra quyết định, admin xử lý, khiếu nại) → ghi một dòng.
/// Nhờ vậy có thể tính tỉ lệ đồng thuận giữa AI và admin, và đề xuất lại ngưỡng
/// dựa trên dữ liệu thật.
/// </summary>
public interface IModerationDecisionLogger
{
    /// <summary>
    /// Ghi một quyết định vào nhật ký.
    ///
    /// Hàm này KHÔNG được ném exception — ghi log thất bại không được làm hỏng
    /// nghiệp vụ kiểm duyệt chính.
    /// </summary>
    Task LogAsync(
        ModerationResult result,
        ModerationStatus decision,
        ModerationSource source,
        string stage,
        Guid? actorId = null,
        string? actorRole = null,
        string? note = null,
        CancellationToken cancellationToken = default);
}
