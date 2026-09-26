using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

public class ModerationDecisionEvaluator : IModerationDecisionEvaluator
{
    private const string ApproveDecision = "approve";
    private const string RejectDecision = "reject";
    private const string ReviewDecision = "review";

    private const int MinSeverity = 0;
    private const int MaxSeverity = 3;
    private const double MinConfidence = 0.0;
    private const double MaxConfidence = 1.0;

    private const int AuthorReasonMaxLength = 300;

    private readonly ModerationOptions _options;

    public ModerationDecisionEvaluator(IOptions<ModerationOptions> options)
    {
        _options = options.Value;
    }

    public ModerationDecisionResult Evaluate(LlmModerationOutput output)
    {
        if (!TryValidate(output, out var decision, out var categories, out var severity, out var confidence))
        {
            // Fail-safe: anything malformed goes to a human, never auto-approved or auto-rejected.
            return ModerationDecisionResult.NeedsReview(
                "invalid_llm_response",
                authorReason: null,
                llmDecision: output.Decision,
                severity: output.Severity,
                confidence: output.Confidence,
                categories: output.Categories);
        }

        var alwaysReviewCategory = categories.FirstOrDefault(c => _options.AlwaysReviewCategories.Contains(c));
        if (alwaysReviewCategory is not null)
        {
            return ModerationDecisionResult.NeedsReview(
                $"always_review_category:{alwaysReviewCategory}",
                authorReason: NormalizeAuthorReason(output.Reason),
                llmDecision: decision,
                severity: severity,
                confidence: confidence,
                categories: categories);
        }

        if (decision == ApproveDecision
            && confidence >= _options.ApproveMinConfidence
            && severity <= _options.ApproveMaxSeverity)
        {
            return new ModerationDecisionResult
            {
                Status = ModerationStatus.Approved,
                Source = ModerationSource.Llm,
                Reason = null, // approvals are not explained to the author
                InternalReasonCode = "llm_approve",
                LlmDecision = decision,
                Severity = severity,
                Confidence = confidence,
                Categories = categories
            };
        }

        if (decision == RejectDecision
            && confidence >= _options.RejectMinConfidence
            && severity >= _options.RejectMinSeverity)
        {
            return new ModerationDecisionResult
            {
                Status = ModerationStatus.Rejected,
                Source = ModerationSource.Llm,
                Reason = NormalizeAuthorReason(output.Reason),
                InternalReasonCode = "llm_reject",
                LlmDecision = decision,
                Severity = severity,
                Confidence = confidence,
                Categories = categories
            };
        }

        // Covers: explicit "review", an "approve" that didn't clear the approve bar,
        // and a "reject" that didn't clear the reject bar. All ambiguous cases fall to a human
        // rather than being resolved by guessing which threshold "almost" applied.
        return ModerationDecisionResult.NeedsReview(
            $"llm_uncertain:{decision}",
            authorReason: NormalizeAuthorReason(output.Reason),
            llmDecision: decision,
            severity: severity,
            confidence: confidence,
            categories: categories);
    }

    private bool TryValidate(
        LlmModerationOutput output,
        out string decision,
        out IReadOnlyList<string> categories,
        out int severity,
        out double confidence)
    {
        decision = string.Empty;
        categories = Array.Empty<string>();
        severity = 0;
        confidence = 0;

        var rawDecision = output.Decision?.Trim().ToLowerInvariant();
        if (rawDecision is not (ApproveDecision or RejectDecision or ReviewDecision))
            return false;

        if (output.Severity is not int rawSeverity || rawSeverity < MinSeverity || rawSeverity > MaxSeverity)
            return false;

        if (output.Confidence is not double rawConfidence
            || double.IsNaN(rawConfidence)
            || rawConfidence < MinConfidence
            || rawConfidence > MaxConfidence)
            return false;

        // Categories may legitimately be empty (e.g. a clean "approve"), but every entry that IS
        // present must be one we recognize — an unknown category is treated as invalid input
        // rather than silently ignored, since it might be the one that should force review.
        var rawCategories = output.Categories ?? [];
        foreach (var category in rawCategories)
        {
            if (string.IsNullOrWhiteSpace(category) || !ModerationCategories.Known.Contains(category))
                return false;
        }

        decision = rawDecision;
        categories = rawCategories;
        severity = rawSeverity;
        confidence = rawConfidence;
        return true;
    }

    private static string? NormalizeAuthorReason(string? reason)
    {
        if (string.IsNullOrWhiteSpace(reason)) return null;
        var trimmed = reason.Trim();
        return trimmed.Length <= AuthorReasonMaxLength ? trimmed : trimmed[..AuthorReasonMaxLength];
    }
}
