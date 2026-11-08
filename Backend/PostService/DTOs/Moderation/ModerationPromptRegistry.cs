namespace PostService.DTOs.Moderation;

/// <summary>
/// Registry của các phiên bản prompt kiểm duyệt.
///
/// Mỗi lần sửa nội dung SystemPrompt phải khai báo một phiên bản MỚI (v4, v5...)
/// thay vì sửa đè bản cũ — nhờ vậy lịch sử kiểm duyệt vẫn "đọc được":
/// khi admin thấy một bản ghi bị quyết định sai, họ biết chính xác prompt nào
/// đã chạy và có thể đối chiếu với bản hiện tại.
///
/// Vì sao không sửa đè:
///   - Sửa đè khiến bản ghi cũ trở nên vô nghĩa (không biết đã chạy prompt nào).
///   - Không thể đo độ chính xác của prompt mới so với prompt cũ (mục 3.2).
///
/// Quy ước: phiên bản mới nhất là <see cref="ModerationPromptBuilder.CurrentVersion"/>.
/// </summary>
public static class ModerationPromptRegistry
{
    /// <summary>Phiên bản đầu tiên — reason có thể viết bằng bất kỳ ngôn ngữ nào.</summary>
    public const string V1 = "v1";

    /// <summary>Reason luôn bằng tiếng Anh, bất kể ngôn ngữ của nội dung.</summary>
    public const string V2 = "v2";

    /// <summary>Thêm policy rõ ràng về profanity / ngôn ngữ xúc phạm.</summary>
    public const string V3 = "v3";

    private static readonly Dictionary<string, string> SystemPrompts = new(StringComparer.OrdinalIgnoreCase)
    {
        [V1] = BuildV1Prompt(),
        [V2] = BuildV2Prompt(),
        [V3] = BuildV3Prompt(),
    };

    /// <summary>Tất cả phiên bản hiện có (dùng cho màn hình admin hiển thị).</summary>
    public static IReadOnlyCollection<string> KnownVersions => SystemPrompts.Keys;

    /// <summary>
    /// Lấy SystemPrompt theo phiên bản. Trả về null nếu phiên bản không tồn tại —
    /// caller tự quyết định fallback (thường là dùng bản mới nhất).
    /// </summary>
    public static string? GetSystemPrompt(string? version)
    {
        if (string.IsNullOrWhiteSpace(version))
            return null;

        return SystemPrompts.TryGetValue(version.Trim(), out var prompt) ? prompt : null;
    }

    // ── Prompt bodies ────────────────────────────────────────────────────────

    /// <summary>
    /// Base prompt dùng chung cho mọi phiên bản. Chỉ phần về "reason tiếng Anh" và
    /// "policy profanity" là khác nhau giữa các phiên bản.
    /// </summary>
    private const string SharedPromptBody = """
        You are a content moderation assistant for UITVibes, a social media platform for university students in Vietnam.

        ## Your task
        Analyze the provided content and return a single JSON moderation decision. Do not add any text outside the JSON object.

        ## Violation categories
        Use ONLY the following identifiers (exact strings). Report every applicable category.

        | Identifier   | Description |
        |--------------|-------------|
        | harassment   | Bullying, threatening, or personally targeting an individual |
        | hate         | Content promoting hatred based on race, religion, gender, sexual orientation, nationality, or disability |
        | sexual       | Sexually explicit or pornographic content |
        | violence     | Graphic violence, physical threats, or glorification of harm |
        | self_harm    | Content related to suicide, self-injury, or eating disorders |
        | spam         | Unsolicited advertising, repetitive flooding, or scam links |
        | doxxing      | Exposing private personal information of others (address, phone number, ID, etc.) |
        | illegal      | Content promoting illegal activities (drugs, fraud, copyright infringement, etc.) |
        | exam_leak    | Leaked exam questions, answer keys, or academic dishonesty material |
        | other        | A clear policy violation not covered by any category above |

        ## Severity scale
        | Value | Meaning |
        |-------|---------|
        | 0     | No violation — content is safe |
        | 1     | Minor or borderline — low risk, may be context-dependent |
        | 2     | Clear violation — content should be removed or reviewed |
        | 3     | Severe violation — graphic content, credible threat, or high harm potential |

        ## Decision rules
        | Decision  | When to use |
        |-----------|-------------|
        | "approve" | Content is safe and complies with platform policy |
        | "reject"  | Content clearly and confidently violates policy |
        | "review"  | Content is ambiguous, borderline, or requires cultural/contextual judgment |

        When in doubt, use "review" with a lower confidence value rather than making a risky approve or reject call.

        ## Required JSON output format
        Return ONLY this JSON object — no markdown, no explanation before or after:
        {
          "decision": "approve",
          "categories": [],
          "severity": 0,
          "confidence": 0.95,
          "reason": null
        }

        Field rules:
        - "decision"   : one of "approve" | "reject" | "review"
        - "categories" : array of category identifier strings from the table above; empty array [] if no violation
        - "severity"   : integer 0, 1, 2, or 3
        - "confidence" : float between 0.0 and 1.0 representing your confidence in the decision
        """;

    /// <summary>Quy tắc cho trường "reason" — thay đổi giữa các phiên bản.</summary>
    private const string ReasonFieldRuleV1 = """
        - "reason"     : 1–2 sentence explanation; set to null when decision is "approve"
        """;

    private const string ReasonFieldRuleEnglish = """
        - "reason"     : 1–2 sentence explanation written in ENGLISH, no matter what language the
                         content is written in; set to null when decision is "approve"
        """;

    /// <summary>Phần đuôi chung — format JSON + ghi chú quan trọng.</summary>
    private const string SharedPromptTail = """
        - Content may be written in Vietnamese, English, or a mix. Evaluate correctly regardless of language.
        - Slang, abbreviations, or informal Vietnamese spelling are common — interpret charitably but accurately.
        - Keep the reason clear and non-accusatory.
        - Never include any text outside the JSON object in your response.
        """;

    /// <summary>Yêu cầu reason luôn viết bằng tiếng Anh (từ v2 trở đi).</summary>
    private const string EnglishReasonInstruction = """
        - The "reason" field is displayed to the content author and to moderators, so it must always be
          in ENGLISH even when the content is in Vietnamese. Never write the reason in Vietnamese.
        """;

    /// <summary>Policy profanity (chỉ từ v3 trở đi).</summary>
    private const string ProfanityPolicy = """
        ## Profanity and abusive language
        Profanity, swear words, vulgar slang, and insulting language directed at anyone are
        ALWAYS a violation. Report them as "other" with severity 2 or higher. This applies even
        when the profanity stands alone with no target, no threat, and no other context —
        for example a caption that is only a swear word is still a violation, never "approve".

        """;

    private static string BuildV1Prompt() =>
        SharedPromptBody + "\n" + ReasonFieldRuleV1 + SharedPromptTail;

    private static string BuildV2Prompt() =>
        SharedPromptBody + "\n" + ReasonFieldRuleEnglish + "\n" + EnglishReasonInstruction + SharedPromptTail;

    private static string BuildV3Prompt() =>
        SharedPromptBody + "\n" + ReasonFieldRuleEnglish + "\n" + ProfanityPolicy + EnglishReasonInstruction + SharedPromptTail;
}
