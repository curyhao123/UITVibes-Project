using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Đồng bộ bắt buộc với <see cref="PostService.DTOs.Moderation.ModerationCategories"/>:
/// danh sách category trong prompt PHẢI khớp với ModerationCategories.Known.
/// </summary>
public class ModerationPromptBuilder : IModerationPromptBuilder
{
    private readonly ILogger<ModerationPromptBuilder> _logger;

    public ModerationPromptBuilder(ILogger<ModerationPromptBuilder> logger)
    {
        _logger = logger;
    }

    /// Tăng version này mỗi khi thay đổi nội dung SystemPrompt hoặc cấu trúc UserMessage.
    public const string CurrentVersion = "v1";

    /// <summary>
    /// LLM có context window hữu hạn; content quá dài cần được truncate ở đây
    /// trước khi đưa vào, không phải để lọt qua rồi bị LLM API reject.
    /// </summary>
    private const int MaxContentLength = 4000;

    private const string SystemPrompt = """
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
        - "reason"     : 1–2 sentence explanation in the same language as the content (Vietnamese or English);
                         set to null when decision is "approve"

        ## Important notes
        - Content may be written in Vietnamese, English, or a mix. Evaluate correctly regardless of language.
        - Slang, abbreviations, or informal Vietnamese spelling are common — interpret charitably but accurately.
        - The "reason" field will be shown directly to the content author; keep it clear and non-accusatory.
        - Never include any text outside the JSON object in your response.
        """;

    // ── Public API ───────────────────────────────────────────────────────────

    public ModerationPrompt Build(string content, ModerationTargetType targetType)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(content);

        var safeContent = TruncateIfNeeded(content);
        var targetLabel = FormatTargetType(targetType);

        // Dùng delimiter rõ ràng (<<<...>>>) để LLM không nhầm content của user với
        // phần instruction trong prompt, kể cả khi content chứa ký tự đặc biệt.
        var userMessage = $"""
            Content type: {targetLabel}

            Content to moderate:
            <<<
            {safeContent}
            >>>
            """;

        _logger.LogInformation(
            "Built moderation prompt for {TargetType} (length: {Length}, version: {Version}). Content snippet: {Snippet}",
            targetType, content.Length, CurrentVersion, safeContent.Length > 100 ? safeContent[..100] + "..." : safeContent);

        return new ModerationPrompt
        {
            SystemPrompt = SystemPrompt,
            UserMessage = userMessage,
            PromptVersion = CurrentVersion,
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Truncate content nếu vượt quá giới hạn. Thêm marker cuối để LLM biết
    /// rằng content bị cắt ngắn và không nên suy luận phần thiếu.
    /// </summary>
    private static string TruncateIfNeeded(string content)
    {
        if (content.Length <= MaxContentLength)
            return content;

        const string truncationMarker = "\n[... content truncated ...]";
        return string.Concat(content.AsSpan(0, MaxContentLength), truncationMarker);
    }

    private static string FormatTargetType(ModerationTargetType type) => type switch
    {
        ModerationTargetType.Post => "Post",
        ModerationTargetType.Comment => "Comment",
        ModerationTargetType.Reel => "Reel caption",
        ModerationTargetType.Story => "Story caption",
        _ => type.ToString()
    };
}
