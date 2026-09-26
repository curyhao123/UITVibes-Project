using System.Text.Json.Serialization;

namespace PostService.DTOs.Moderation;

// ── Request ──────────────────────────────────────────────────────────────────

/// <summary>
/// Request body gửi đến DeepSeek Chat Completions API.
/// Hỗ trợ cả Standard Mode lẫn Thinking Mode (với deepseek-flash / deepseek-reasoner).
/// </summary>
public sealed class DeepSeekChatRequest
{
    [JsonPropertyName("model")]
    public required string Model { get; init; }

    [JsonPropertyName("messages")]
    public required List<DeepSeekRequestMessage> Messages { get; init; }

    /// Nullable: khi bật Thinking mode, không truyền temperature để tránh conflict.
    [JsonPropertyName("temperature")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Temperature { get; init; }

    [JsonPropertyName("max_tokens")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? MaxTokens { get; init; }

    [JsonPropertyName("stream")]
    public bool Stream { get; init; } = false;

    /// Cấu hình Thinking Mode: {"type": "enabled"} hoặc {"type": "disabled"}
    [JsonPropertyName("thinking")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DeepSeekThinking? Thinking { get; init; }

    /// Mức độ suy luận: "high", "medium", "low"
    [JsonPropertyName("reasoning_effort")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ReasoningEffort { get; init; }

    /// Yêu cầu trả JSON format nếu cần
    [JsonPropertyName("response_format")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DeepSeekResponseFormat? ResponseFormat { get; init; }
}

public sealed class DeepSeekThinking
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "enabled";
}

public sealed class DeepSeekRequestMessage
{
    [JsonPropertyName("role")]
    public required string Role { get; init; }

    [JsonPropertyName("content")]
    public required string Content { get; init; }
}

public sealed class DeepSeekResponseFormat
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "json_object";
}

// ── Response ─────────────────────────────────────────────────────────────────

public sealed class DeepSeekChatResponse
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("choices")]
    public List<DeepSeekChoice>? Choices { get; init; }

    [JsonPropertyName("usage")]
    public DeepSeekUsage? Usage { get; init; }
}

public sealed class DeepSeekChoice
{
    [JsonPropertyName("index")]
    public int Index { get; init; }

    [JsonPropertyName("message")]
    public DeepSeekResponseMessage? Message { get; init; }

    /// "stop" | "length" | "content_filter"
    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; init; }
}

public sealed class DeepSeekResponseMessage
{
    [JsonPropertyName("role")]
    public string? Role { get; init; }

    /// Nội dung trả lời cuối cùng (chứa JSON moderation output)
    [JsonPropertyName("content")]
    public string? Content { get; init; }

    /// Quá trình suy luận Chain-of-Thought khi bật Thinking mode
    [JsonPropertyName("reasoning_content")]
    public string? ReasoningContent { get; init; }
}

public sealed class DeepSeekUsage
{
    [JsonPropertyName("prompt_tokens")]
    public int PromptTokens { get; init; }

    [JsonPropertyName("completion_tokens")]
    public int CompletionTokens { get; init; }

    [JsonPropertyName("total_tokens")]
    public int TotalTokens { get; init; }
}
