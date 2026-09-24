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

    public static ModerationDecisionResult NeedsReview(string internalReasonCode, string? authorReason = null) => new()
    {
        Status = ModerationStatus.NeedsReview,
        Source = ModerationSource.Llm,
        Reason = authorReason,
        InternalReasonCode = internalReasonCode
    };
}
