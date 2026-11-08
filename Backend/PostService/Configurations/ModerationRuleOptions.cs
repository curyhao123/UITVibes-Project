using System.ComponentModel.DataAnnotations;

namespace PostService.Configurations;

/// <summary>
/// Cấu hình lớp rule tiền xử lý (Phase 3.1 — RuleFilter).
///
/// Rule chạy TRƯỚC khi gọi LLM. Mục tiêu là chặn những vi phạm LLM có xu hướng
/// bỏ sót (chủ yếu là chửi thề) một cách tất định, rẻ và không phụ thuộc vào
/// nhiệt độ sampling của model.
///
/// Bind từ section "Moderation:Rules".
/// </summary>
public class ModerationRuleOptions
{
    public const string SectionName = "Moderation:Rules";

    /// Bật/tắt toàn bộ lớp rule. Tắt → mọi nội dung đi thẳng sang LLM.
    public bool Enabled { get; set; } = true;

    /// Từ chửi thề **không tranh luận được** — chặn thẳng (Rejected).
    /// Chỉ chứa các từ không thể xuất hiện trong ngữ cảnh lành mạnh.
    public List<string> ProfanityTerms { get; set; } = [];

    /// Từ chửi thề **mơ hồ** — chỉ đẩy vào vùng xám (NeedsReview) để admin
    /// xem xét, không tự ý loại bỏ nội dung.
    /// Dùng cho các từ có khả năng trùng với từ thông thường.
    public List<string> ProfanityReviewTerms { get; set; } = [];

    /// Mức vi phạm cho <see cref="ProfanityTerms"/>. Mặc định 2 = chặn thẳng.
    [Range(0, 3)]
    public int ProfanitySeverity { get; set; } = 2;

    /// Mức vi phạm cho <see cref="ProfanityReviewTerms"/>. Mặc định 1 = vùng xám.
    [Range(0, 3)]
    public int ProfanityReviewSeverity { get; set; } = 1;

    /// Confidence ghi lại cho quyết định của rule. Rule là quy tắc tất định nên
    /// confidence luôn = 1.0 (không phải suy đoán của model).
    [Range(0.0, 1.0)]
    public double RuleConfidence { get; set; } = 1.0;
}
