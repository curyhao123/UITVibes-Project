using PostService.Enums;

namespace PostService.DTOs.Moderation;

/// <summary>
/// DTO returned to the admin content-review screen.
/// Includes the "target" (the moderated post/comment) so the admin doesn't need
/// a second API call to see the content under review.
/// </summary>
public class ModerationResultDto
{
    // ===== Moderation record =====
    public Guid Id { get; set; }

    /// Id of the moderated content (PostId, CommentId...).
    public Guid TargetId { get; set; }

    public ModerationTargetType TargetType { get; set; }

    public ModerationStatus Status { get; set; }

    public ModerationSource Source { get; set; }

    /// The LLM's raw decision: "approve" | "reject" | "review".
    public string? LlmDecision { get; set; }

    public int? Severity { get; set; }

    public double? Confidence { get; set; }

    /// Violation categories (split from the CSV stored in the DB).
    public List<string> Categories { get; set; } = new();

    /// The reason shown to the author.
    public string? AuthorReason { get; set; }

    /// Internal code for logs and metrics. Admins may see it for debugging.
    public string InternalReasonCode { get; set; } = string.Empty;

    public int AttemptCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    // ===== Admin decision =====
    public string? AdminNote { get; set; }

    public Guid? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    // ===== Appeal (khiếu nại của tác giả) =====
    /// Trạng thái khiếu nại: "None" | "Pending" | "Resolved".
    public string AppealStatus { get; set; } = "None";

    /// Lý do tác giả khiếu nại.
    public string? AppealReason { get; set; }

    public DateTime? AppealSubmittedAt { get; set; }

    public DateTime? AppealResolvedAt { get; set; }

    // ===== Versioning + observability (3.3 / 3.4) =====

    /// Phiên bản prompt đã dùng để ra quyết định (vd: "v3").
    public string? PromptVersion { get; set; }

    /// Model LLM đã dùng.
    public string? ModelName { get; set; }

    /// Thời gian gọi LLM (ms).
    public int? LlmLatencyMs { get; set; }

    public int? TotalTokens { get; set; }

    /// Chi phí ước tính (USD).
    public double? EstimatedCostUsd { get; set; }

    // ===== Shadow mode (3.3) =====

    /// Quyết định thô của model bóng: "approve" | "reject" | "review".
    public string? ShadowDecision { get; set; }

    /// Trạng thái cuối đã quy đổi của model bóng.
    public string? ShadowStatus { get; set; }

    public double? ShadowConfidence { get; set; }

    public int? ShadowSeverity { get; set; }

    public string? ShadowModel { get; set; }

    public string? ShadowPromptVersion { get; set; }

    /// Model bóng có đồng ý với quyết định chính không.
    public bool? ShadowAgreesWithPrimary { get; set; }

    // ===== Bằng chứng media (3.7) =====

    /// Snapshot URL media tại thời điểm kiểm duyệt (CSV).
    public List<string> TargetMediaUrlsSnapshot { get; set; } = new();

    /// Text trích xuất từ ảnh bằng OCR (Phase 3.0).
    public string? OcrText { get; set; }

    // ===== Ưu tiên trong hàng đợi (3.6) =====

    /// Số report đang mở (chưa xử lý) của nội dung này.
    public int ReportCount { get; set; }

    /// Điểm ưu tiên trong hàng đợi admin (số lớn hơn = xét trước).
    public int Priority { get; set; }

    // ===== Moderated content (snapshot) =====
    public string TargetContent { get; set; } = string.Empty;

    public List<string> TargetMediaUrls { get; set; } = new();

    public bool TargetDeleted { get; set; }

    // ===== Author =====
    public Guid AuthorId { get; set; }

    public string AuthorDisplayName { get; set; } = string.Empty;

    public string AuthorAvatarUrl { get; set; } = string.Empty;
}