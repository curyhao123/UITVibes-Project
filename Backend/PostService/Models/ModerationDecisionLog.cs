using PostService.Enums;

namespace PostService.Models;

/// <summary>
/// Nhật ký append-only của MỌI quyết định kiểm duyệt (Phase 3.2).
///
/// Vì sao cần bảng này khi đã có <see cref="ModerationResult"/>:
///   - <see cref="ModerationResult"/> chỉ giữ TRẠNG THÁI HIỆN TẠI → lịch sử bị ghi đè.
///     Không biết "trước khi admin sửa, AI đã nói gì".
///   - Bảng này giữ mọi lần quyết định theo thứ tự thời gian → đo được
///     tỉ lệ đồng thuận (LLM vs Admin) và tỉ lệ admin đảo quyết định.
///   - Đây là nền tảng để đề xuất lại ngưỡng ApproveMinConfidence / RejectMinConfidence
///     dựa trên dữ liệu thật thay vì đoán.
///
/// Bản ghi KHÔNG BAO GIỜ được sửa hay xoá (trừ khi xoá cùng nội dung).
/// </summary>
public class ModerationDecisionLog
{
    public Guid Id { get; set; }

    /// Id bản ghi kiểm duyệt liên quan (ModerationResult.Id).
    public Guid ModerationResultId { get; set; }

    /// Id của nội dung bị quyết định (PostId, CommentId, ReelId...).
    public Guid TargetId { get; set; }

    public ModerationTargetType TargetType { get; set; }

    /// Trạng thái sau khi quyết định này được áp dụng.
    public ModerationStatus Decision { get; set; }

    /// Nguồn quyết định: Rule / Llm / Human / Fallback.
    public ModerationSource Source { get; set; }

    /// Giai đoạn sinh ra quyết định: "rule" | "llm" | "admin" | "appeal" | "system".
    public string Stage { get; set; } = string.Empty;

    /// Mã nội bộ của quyết định (vd: "llm_reject", "admin_approve").
    public string? InternalReasonCode { get; set; }

    /// Quyết định thô của LLM tại thời điểm đó (nếu có).
    public string? LlmDecision { get; set; }

    public int? Severity { get; set; }

    public double? Confidence { get; set; }

    /// Danh sách category (CSV).
    public string? Categories { get; set; }

    /// Ai đưa ra quyết định (admin id). Null = quyết định tự động.
    public Guid? ActorId { get; set; }

    /// "Admin" | "System".
    public string? ActorRole { get; set; }

    /// Ghi chú kèm theo quyết định (admin note / lý do).
    public string? Note { get; set; }

    /// Phiên bản prompt đã dùng (để biết quyết định nào sinh ra từ prompt nào).
    public string? PromptVersion { get; set; }

    /// Model đã dùng.
    public string? ModelName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
