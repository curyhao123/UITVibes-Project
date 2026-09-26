using System.ComponentModel.DataAnnotations;

namespace PostService.Configurations;

/// <summary>
/// Cấu hình kết nối đến DeepSeek API. Bind từ section "DeepSeek" trong config.
/// </summary>
public class DeepSeekOptions
{
    public const string SectionName = "DeepSeek";

    [Required(AllowEmptyStrings = false)]
    public string ApiKey { get; set; } = string.Empty;

    public string BaseUrl { get; set; } = "https://api.deepseek.com";

    public string Model { get; set; } = "deepseek-flash";

    public bool EnableThinking { get; set; } = true;

    /// <summary>
    /// Mức độ suy luận: "low" | "medium" | "high" | "max".
    /// </summary>
    public string ReasoningEffort { get; set; } = "high";

    [Range(5, 180)]
    public int TimeoutSeconds { get; set; } = 45;

    /// <summary>
    /// Số token tối đa. Khi bật Thinking mode, reasoning tokens được tính gộp vào đây,
    /// do đó cần tối thiểu 2048 - 4096 để không bị cụt JSON output.
    /// </summary>
    [Range(256, 8192)]
    public int MaxCompletionTokens { get; set; } = 4096;
}

