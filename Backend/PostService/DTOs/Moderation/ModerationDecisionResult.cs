using PostService.Enums;

namespace PostService.DTOs.Moderation;

/// <summary>
/// Output of IModerationDecisionEvaluator.Evaluate. This is the ONLY place that is allowed to
/// become a ModerationStatus for an LLM-based decision — nothing else should branch on the raw
/// LlmModerationOutput.
/// </summary>
public class ModerationDecisionResult
{
    public required ModerationStatus Status { get; init; }
    public required ModerationSource Source { get; init; }

    /// Author-facing reason. Null when Status is Approved (approvals don't need an explanation),
    /// or when no safe author-facing reason exists (e.g. an invalid LLM response) — in that case
    /// use a generic message, never leak InternalReasonCode content to the author.
    public string? Reason { get; init; }

    /// Machine-readable code for logs/metrics only, e.g. "invalid_response", "always_review_category",
    /// "low_confidence", "llm_reject", "llm_approve". Never sent to the client.
    public required string InternalReasonCode { get; init; }

    /// Raw LLM decision: "approve" | "reject" | "review".
    public string? LlmDecision { get; init; }

    /// Severity evaluated by LLM (0-3).
    public int? Severity { get; init; }

    /// Confidence evaluated by LLM (0.0-1.0).
    public double? Confidence { get; init; }

    /// Violation categories identified by LLM.
    public IReadOnlyList<string>? Categories { get; init; }

    // ===== Observability (3.4) =====
    // Dữ liệu kỹ thuật để đo chất lượng & chi phí. Không hiển thị cho tác giả.

    /// Model LLM đã dùng để ra quyết định.
    public string? ModelName { get; init; }

    /// Phiên bản prompt đã dùng để ra quyết định (vd: "v3").
    public string? PromptVersion { get; init; }

    /// Raw response của LLM (đã cắt ngắn).
    public string? RawResponse { get; init; }

    /// Thời gian gọi LLM (ms).
    public int? LatencyMs { get; init; }

    public int? PromptTokens { get; init; }
    public int? CompletionTokens { get; init; }
    public int? TotalTokens { get; init; }

    /// Chi phí ước tính (USD).
    public double? EstimatedCostUsd { get; init; }

    // ===== Shadow mode (3.3) =====
    // Quyết định của "model bóng" — chỉ để so sánh, KHÔNG áp dụng lên nội dung.

    public string? ShadowDecision { get; init; }
    public ModerationStatus? ShadowStatus { get; init; }
    public double? ShadowConfidence { get; init; }
    public int? ShadowSeverity { get; init; }
    public string? ShadowModel { get; init; }
    public string? ShadowPromptVersion { get; init; }
    public bool? ShadowAgreesWithPrimary { get; init; }

    public static ModerationDecisionResult NeedsReview(
        string internalReasonCode,
        string? authorReason = null,
        string? llmDecision = null,
        int? severity = null,
        double? confidence = null,
        IReadOnlyList<string>? categories = null) => new()
        {
            Status = ModerationStatus.NeedsReview,
            Source = ModerationSource.Llm,
            Reason = authorReason,
            InternalReasonCode = internalReasonCode,
            LlmDecision = llmDecision,
            Severity = severity,
            Confidence = confidence,
            Categories = categories
        };
}
