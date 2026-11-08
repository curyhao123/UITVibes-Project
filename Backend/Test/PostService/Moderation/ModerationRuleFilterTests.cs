using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.Enums;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho ModerationRuleFilter — lớp chặn tất định chạy TRƯỚC LLM.
///
/// Bối cảnh: LLM (deepseek-flash) có xu hướng approve chửi thề đứng riêng lẻ
/// với confidence cao (0.8–0.9). Rule phải đảm bảo vi phạm này không lọt qua
/// dù model "hôm nay trả lời lạ".
///
/// Nguyên tắc bất di bất dịch được bảo vệ ở đây:
///   1. Rule KHÔNG BAO GIỜ approve.
///   2. Nội dung sạch → null (đi tiếp sang LLM).
///   3. Không khớp chuỗi con trong từ dài hơn (tránh false-positive).
///   4. Danh sách mơ hồ chỉ vào vùng xám, không tự ý loại bỏ nội dung.
/// </summary>
public class ModerationRuleFilterTests
{
    private static ModerationRuleFilter CreateFilter(
        List<string>? severeTerms = null,
        List<string>? reviewTerms = null,
        bool enabled = true,
        int severeSeverity = 2,
        int reviewSeverity = 1)
    {
        var options = Options.Create(new ModerationRuleOptions
        {
            Enabled = enabled,
            ProfanityTerms = severeTerms ?? ["fuck", "shit"],
            ProfanityReviewTerms = reviewTerms ?? ["cac ma dien"],
            ProfanitySeverity = severeSeverity,
            ProfanityReviewSeverity = reviewSeverity,
            RuleConfidence = 1.0
        });

        var moderationOptions = Options.Create(new ModerationOptions
        {
            RejectMinSeverity = 2,
            ApproveMaxSeverity = 1
        });

        return new ModerationRuleFilter(
            options,
            moderationOptions,
            NullLogger<ModerationRuleFilter>.Instance);
    }

    // ── Blocking (Source = Rule) ─────────────────────────────────────────────

    [Fact]
    public void Evaluate_WhenContentHasSevereProfanity_Rejects()
    {
        var result = CreateFilter().Evaluate("fuck", ModerationTargetType.Reel);

        Assert.NotNull(result);
        Assert.Equal(ModerationStatus.Rejected, result!.Status);
        Assert.Equal(ModerationSource.Rule, result.Source);
        Assert.Equal("rule_profanity", result.InternalReasonCode);
        Assert.Equal(2, result.Severity);
        Assert.Equal(1.0, result.Confidence);
    }

    [Fact]
    public void Evaluate_WhenProfanityIsInsideLongerText_StillRejects()
    {
        var result = CreateFilter().Evaluate("đây là fuck vậy", ModerationTargetType.Post);

        Assert.NotNull(result);
        Assert.Equal(ModerationStatus.Rejected, result!.Status);
    }

    [Fact]
    public void Evaluate_WhenProfanityIsUppercase_StillRejects()
    {
        var result = CreateFilter().Evaluate("FUCK", ModerationTargetType.Comment);

        Assert.NotNull(result);
        Assert.Equal(ModerationStatus.Rejected, result!.Status);
    }

    [Fact]
    public void Evaluate_WhenAmbiguousProfanity_RoutesToNeedsReviewNotReject()
    {
        var result = CreateFilter().Evaluate("cac ma dien", ModerationTargetType.Reel);

        Assert.NotNull(result);
        Assert.Equal(ModerationStatus.NeedsReview, result!.Status);
        Assert.Equal(ModerationSource.Rule, result.Source);
        Assert.Equal("rule_profanity_review", result.InternalReasonCode);
    }

    [Fact]
    public void Evaluate_WhenRuleDisabled_ReturnsNullSoContentGoesToLlm()
    {
        var result = CreateFilter(enabled: false).Evaluate("fuck", ModerationTargetType.Reel);

        Assert.Null(result);
    }

    [Fact]
    public void Evaluate_WhenSevereSeverityIsLow_RoutesToNeedsReview()
    {
        // Mức vi phạm thấp hơn ngưỡng reject → vào vùng xám để admin quyết định.
        var result = CreateFilter(severeSeverity: 1).Evaluate("fuck", ModerationTargetType.Reel);

        Assert.NotNull(result);
        Assert.Equal(ModerationStatus.NeedsReview, result!.Status);
    }

    // ── Passing through to the LLM ───────────────────────────────────────────

    [Fact]
    public void Evaluate_WhenContentIsClean_ReturnsNull()
    {
        var result = CreateFilter().Evaluate("Một ngày đẹp trời ở Hà Nội", ModerationTargetType.Reel);

        Assert.Null(result);
    }

    [Fact]
    public void Evaluate_WhenTermIsSubstringOfLongerWord_DoesNotMatch()
    {
        // "fuck" không được khớp trong "fuckable" (từ dài hơn) → tránh false-positive.
        var result = CreateFilter().Evaluate("fuckable", ModerationTargetType.Reel);

        Assert.Null(result);
    }

    [Fact]
    public void Evaluate_WhenContentIsEmpty_ReturnsNull()
    {
        var result = CreateFilter().Evaluate("   ", ModerationTargetType.Reel);

        Assert.Null(result);
    }

    [Fact]
    public void Evaluate_NeverApprovesContent()
    {
        var filter = CreateFilter();
        var samples = new[]
        {
            "fuck", "shit", "FUCK", "cac ma dien", "đây là fuck vậy", "hello world"
        };

        foreach (var sample in samples)
        {
            var result = filter.Evaluate(sample, ModerationTargetType.Reel);
            if (result is null)
                continue;

            Assert.NotEqual(ModerationStatus.Approved, result.Status);
        }
    }

    // ── Author-facing reason ─────────────────────────────────────────────────

    [Fact]
    public void Evaluate_WhenRejected_ProvidesEnglishAuthorReasonWithoutEchoingTerm()
    {
        var result = CreateFilter().Evaluate("fuck", ModerationTargetType.Reel);

        Assert.NotNull(result);
        Assert.NotNull(result!.Reason);
        Assert.Contains("profane", result.Reason, StringComparison.OrdinalIgnoreCase);

        // Không echo lại từ bị chặn — tránh hiển thị lại từ đó trong app.
        Assert.DoesNotContain("fuck", result.Reason!, StringComparison.OrdinalIgnoreCase);
    }
}
