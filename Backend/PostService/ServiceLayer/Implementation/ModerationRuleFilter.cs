using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Lớp rule tiền xử lý cho kiểm duyệt nội dung.
///
/// Vì sao cần: LLM (đặc biệt là model reasoning nhẹ như <c>deepseek-flash</c>)
/// có xu hướng coi **chửi thề đứng riêng lẻ** là "safe" và trả về
/// <c>approve</c> với confidence cao (0.8–0.9). Đây là hành vi quan sát được
/// và lặp lại được, không phải lỗi ngẫu nhiên.
///
/// Cách xử lý ở đây là **tất định**: rule so khớp danh sách từ cấm và quyết
/// định trước khi tốn một lượt gọi LLM. Nhờ vậy nội dung vi phạm không thể lọt
/// qua chỉ vì model "hôm nay trả lời lạ".
///
/// Nguyên tắc bất di bất dịch:
///   - Rule KHÔNG BAO GIỜ approve. Không trả về kết quả = nội dung sạch → đi tiếp LLM.
///   - Mức vi phạm rõ ràng → Rejected; mức mơ hồ → NeedsReview (con người quyết định).
///   - Lý do hiển thị cho tác giả luôn bằng tiếng Anh (chuẩn hoá từ mục 1.6).
/// </summary>
public partial class ModerationRuleFilter : IModerationRuleFilter
{
    private readonly ModerationRuleOptions _ruleOptions;
    private readonly ModerationOptions _moderationOptions;
    private readonly ILogger<ModerationRuleFilter> _logger;

    public ModerationRuleFilter(
        IOptions<ModerationRuleOptions> ruleOptions,
        IOptions<ModerationOptions> moderationOptions,
        ILogger<ModerationRuleFilter> logger)
    {
        _ruleOptions = ruleOptions.Value;
        _moderationOptions = moderationOptions.Value;
        _logger = logger;
    }

    public ModerationDecisionResult? Evaluate(string content, ModerationTargetType targetType)
    {
        if (!_ruleOptions.Enabled || string.IsNullOrWhiteSpace(content))
            return null;

        // Danh sách nghiêm trọng được kiểm tra trước — nếu khớp thì chặn thẳng,
        // không cần xét tiếp danh sách mơ hồ.
        var severeTerm = FindTerm(content, _ruleOptions.ProfanityTerms);
        if (severeTerm is not null)
        {
            // Chỉ chặn thẳng khi mức vi phạm đạt ngưỡng reject của hệ thống;
            // thấp hơn thì vào vùng xám để admin quyết định.
            var status = _ruleOptions.ProfanitySeverity >= _moderationOptions.RejectMinSeverity
                ? ModerationStatus.Rejected
                : ModerationStatus.NeedsReview;

            var severeCode = status == ModerationStatus.Rejected
                ? "rule_profanity"
                : "rule_profanity_review";

            return BuildDecision(
                content, targetType, severeTerm,
                _ruleOptions.ProfanitySeverity,
                status,
                severeCode);
        }

        // Danh sách mơ hồ → chỉ đẩy vào vùng xám, không tự ý loại bỏ.
        var reviewTerm = FindTerm(content, _ruleOptions.ProfanityReviewTerms);
        if (reviewTerm is not null)
            return BuildDecision(
                content, targetType, reviewTerm,
                _ruleOptions.ProfanityReviewSeverity,
                ModerationStatus.NeedsReview,
                "rule_profanity_review");

        return null;
    }

    private ModerationDecisionResult BuildDecision(
        string content,
        ModerationTargetType targetType,
        string matchedTerm,
        int severity,
        ModerationStatus status,
        string internalReasonCode)
    {
        // Lý do cho tác giả — không echo lại từ bị chặn (tránh hiển thị lại từ đó
        // trong app), chỉ nói rõ loại vi phạm.
        const string authorReason =
            "Your content contains abusive or profane language, which is not allowed on UITVibes.";

        _logger.LogInformation(
            "Rule filter matched profanity in {TargetType} content (severity {Severity}, status {Status}).",
            targetType, severity, status);

        return new ModerationDecisionResult
        {
            Status = status,
            Source = ModerationSource.Rule,
            Reason = authorReason,
            InternalReasonCode = internalReasonCode,
            // Rule là quy tắc tất định — không có "suy đoán" của model.
            LlmDecision = null,
            Severity = severity,
            Confidence = _ruleOptions.RuleConfidence,
            Categories = new List<string> { ModerationCategories.Other }
        };
    }

    /// <summary>
    /// Tìm từ chửi thề đầu tiên trong nội dung.
    /// So khớp theo ranh giới từ để không khớp nhầm chuỗi con trong từ dài hơn
    /// (ví dụ "clm" không được khớp trong một từ chứa "clm" ở giữa).
    /// </summary>
    private static string? FindTerm(string content, List<string> terms)
    {
        foreach (var term in terms)
        {
            if (string.IsNullOrWhiteSpace(term))
                continue;

            var normalized = term.Trim();

            var pattern = $@"(?<![\p{{L}}0-9]){Regex.Escape(normalized)}(?![\p{{L}}0-9])";
            if (Regex.IsMatch(content, pattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
                return normalized;
        }

        return null;
    }
}
