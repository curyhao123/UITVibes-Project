using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho ModerationDecisionEvaluator — nơi quyết định Approved / Rejected /
/// NeedsReview. Nguyên tắc bất di bất dịch: mọi trường hợp mơ hồ hoặc lỗi đều phải
/// rơi về NeedsReview, không bao giờ tự động duyệt hoặc tự động từ chối.
/// </summary>
public class ModerationDecisionEvaluatorTests
{
    private readonly ModerationDecisionEvaluator _evaluator;

    public ModerationDecisionEvaluatorTests()
    {
        var options = Options.Create(new ModerationOptions
        {
            ApproveMinConfidence = 0.70,
            RejectMinConfidence = 0.80,
            ApproveMaxSeverity = 1,
            RejectMinSeverity = 2,
            AlwaysReviewCategories = ["self_harm"],
        });

        _evaluator = new ModerationDecisionEvaluator(options);
    }

    // ── Approve ───────────────────────────────────────────────────────────────

    [Fact]
    public void Evaluate_WhenHighConfidenceLowSeverity_Approves()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "approve",
            Categories = new List<string>(),
            Severity = 0,
            Confidence = 0.95,
        });

        Assert.Equal(ModerationStatus.Approved, result.Status);
        Assert.Equal(ModerationSource.Llm, result.Source);
        Assert.Equal("llm_approve", result.InternalReasonCode);
        Assert.Null(result.Reason);
    }

    [Fact]
    public void Evaluate_WhenApproveConfidenceBelowThreshold_GoesToNeedsReview()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "approve",
            Categories = new List<string>(),
            Severity = 0,
            Confidence = 0.60,
        });

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal("llm_uncertain:approve", result.InternalReasonCode);
    }

    [Fact]
    public void Evaluate_WhenApproveSeverityAboveThreshold_GoesToNeedsReview()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "approve",
            Categories = new List<string>(),
            Severity = 2,
            Confidence = 0.99,
        });

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal("llm_uncertain:approve", result.InternalReasonCode);
    }

    // ── Reject ────────────────────────────────────────────────────────────────

    [Fact]
    public void Evaluate_WhenHighConfidenceHighSeverity_Rejects()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "reject",
            Categories = new List<string> { "violence" },
            Severity = 3,
            Confidence = 0.93,
            Reason = "Nội dung đe dọa bạo lực.",
        });

        Assert.Equal(ModerationStatus.Rejected, result.Status);
        Assert.Equal(ModerationSource.Llm, result.Source);
        Assert.Equal("llm_reject", result.InternalReasonCode);
        Assert.Equal("Nội dung đe dọa bạo lực.", result.Reason);
    }

    [Fact]
    public void Evaluate_WhenRejectConfidenceBelowThreshold_GoesToNeedsReview()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "reject",
            Categories = new List<string> { "violence" },
            Severity = 3,
            Confidence = 0.70,
        });

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal("llm_uncertain:reject", result.InternalReasonCode);
    }

    [Fact]
    public void Evaluate_WhenRejectSeverityBelowThreshold_GoesToNeedsReview()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "reject",
            Categories = new List<string> { "spam" },
            Severity = 1,
            Confidence = 0.99,
        });

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal("llm_uncertain:reject", result.InternalReasonCode);
    }

    // ── Always-review categories ─────────────────────────────────────────────

    [Fact]
    public void Evaluate_WhenCategoryIsSelfHarm_AlwaysGoesToNeedsReview()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "reject",
            Categories = new List<string> { "self_harm" },
            Severity = 3,
            Confidence = 0.99,
            Reason = "Cần hỗ trợ.",
        });

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal("always_review_category:self_harm", result.InternalReasonCode);
    }

    // ── Invalid input ─────────────────────────────────────────────────────────

    [Fact]
    public void Evaluate_WhenDecisionIsUnknown_GoesToNeedsReview()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "maybe",
            Categories = new List<string>(),
            Severity = 0,
            Confidence = 0.99,
        });

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal("invalid_llm_response", result.InternalReasonCode);
    }

    [Fact]
    public void Evaluate_WhenSeverityIsOutOfRange_GoesToNeedsReview()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "reject",
            Categories = new List<string> { "violence" },
            Severity = 7,
            Confidence = 0.99,
        });

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal("invalid_llm_response", result.InternalReasonCode);
    }

    [Fact]
    public void Evaluate_WhenConfidenceIsOutOfRange_GoesToNeedsReview()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "approve",
            Categories = new List<string>(),
            Severity = 0,
            Confidence = 1.4,
        });

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal("invalid_llm_response", result.InternalReasonCode);
    }

    [Fact]
    public void Evaluate_WhenCategoryIsUnknown_GoesToNeedsReview()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "approve",
            Categories = new List<string> { "not_a_real_category" },
            Severity = 0,
            Confidence = 0.99,
        });

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal("invalid_llm_response", result.InternalReasonCode);
    }

    [Fact]
    public void Evaluate_WhenOutputIsNull_GoesToNeedsReview()
    {
        var result = _evaluator.Evaluate(new LlmModerationOutput());

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal("invalid_llm_response", result.InternalReasonCode);
    }

    // ── Reason normalization ──────────────────────────────────────────────────

    [Fact]
    public void Evaluate_WhenReasonIsTooLong_TruncatesToAuthorReasonMaxLength()
    {
        var longReason = new string('a', 500);

        var result = _evaluator.Evaluate(new LlmModerationOutput
        {
            Decision = "reject",
            Categories = new List<string> { "spam" },
            Severity = 2,
            Confidence = 0.9,
            Reason = longReason,
        });

        Assert.Equal(300, result.Reason!.Length);
    }
}
