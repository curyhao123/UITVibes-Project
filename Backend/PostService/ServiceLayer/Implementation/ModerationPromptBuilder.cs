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
    /// v2: yêu cầu trường "reason" luôn viết bằng tiếng Anh, bất kể ngôn ngữ của nội dung.
    /// v3: thêm mục "Profanity and abusive language" — chửi thề đứng riêng lẻ cũng là vi phạm.
    public const string CurrentVersion = ModerationPromptRegistry.V3;

    /// <summary>
    /// LLM có context window hữu hạn; content quá dài cần được truncate ở đây
    /// trước khi đưa vào, không phải để lọt qua rồi bị LLM API reject.
    /// </summary>
    private const int MaxContentLength = 4000;

    // ── Public API ───────────────────────────────────────────────────────────

    /// <summary>
    /// Build prompt bằng phiên bản hiện tại (mặc định).
    /// </summary>
    public ModerationPrompt Build(string content, ModerationTargetType targetType)
        => Build(content, targetType, CurrentVersion);

    /// <summary>
    /// Build prompt theo một phiên bản cụ thể.
    ///
    /// Dùng cho:
    ///   - A/B routing — chạy prompt cũ và mới trên hai bucket khác nhau.
    ///   - Shadow mode — chạy prompt mới "bóng" để đo trước khi bật.
    ///   - Tái kiểm duyệt (re-evaluate) nội dung cũ bằng prompt mới.
    ///
    /// Nếu phiên bản không tồn tại → fallback về <see cref="CurrentVersion"/>.
    /// </summary>
    public ModerationPrompt Build(string content, ModerationTargetType targetType, string? promptVersion)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(content);

        var resolvedVersion = ResolveVersion(promptVersion);
        var systemPrompt = ModerationPromptRegistry.GetSystemPrompt(resolvedVersion)
            ?? ModerationPromptRegistry.GetSystemPrompt(CurrentVersion)!;

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
            targetType, content.Length, resolvedVersion, safeContent.Length > 100 ? safeContent[..100] + "..." : safeContent);

        return new ModerationPrompt
        {
            SystemPrompt = systemPrompt,
            UserMessage = userMessage,
            PromptVersion = resolvedVersion,
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Chuẩn hoá phiên bản: null/rỗng → bản hiện tại; bản không tồn tại → bản hiện tại.
    /// </summary>
    private static string ResolveVersion(string? promptVersion)
    {
        if (string.IsNullOrWhiteSpace(promptVersion))
            return CurrentVersion;

        var trimmed = promptVersion.Trim();

        return ModerationPromptRegistry.GetSystemPrompt(trimmed) is not null
            ? trimmed
            : CurrentVersion;
    }

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
        ModerationTargetType.ReelComment => "Reel comment",
        _ => type.ToString()
    };
}
