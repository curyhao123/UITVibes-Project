namespace PostService.DTOs.Moderation;

/// <summary>
/// Output của IModerationPromptBuilder — chứa đủ thông tin để gọi LLM API một lần.
/// </summary>
public sealed record ModerationPrompt
{
    /// <summary>System prompt gửi vào role "system". Bất biến theo PromptVersion.</summary>
    public required string SystemPrompt { get; init; }

    /// <summary>
    /// User message gửi vào role "user". Chứa content cần kiểm duyệt đã được
    /// wrap trong template chuẩn (bao gồm target type và delimiter).
    /// </summary>
    public required string UserMessage { get; init; }

    /// <summary>
    /// Phiên bản prompt. Lưu lại cùng ModerationResult để biết quyết định được đưa ra
    /// bởi prompt nào — quan trọng khi cần audit hoặc re-evaluate sau khi thay prompt.
    /// </summary>
    public required string PromptVersion { get; init; }
}
