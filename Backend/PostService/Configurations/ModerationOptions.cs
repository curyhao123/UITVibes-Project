namespace PostService.Configurations;

/// <summary>
/// Bind from configuration section "Moderation". Register with:
///   builder.Services.AddOptions&lt;ModerationOptions&gt;()
///       .Bind(builder.Configuration.GetSection(ModerationOptions.SectionName))
///       .ValidateDataAnnotations()
///       .ValidateOnStart();
/// </summary>
public class ModerationOptions
{
    public const string SectionName = "Moderation";

    /// Master switch. false = moderation pipeline bị tắt: nội dung mới đi thẳng
    /// Approved (không tạo bản ghi kiểm duyệt, không gọi LLM).
    /// Dùng cho local dev / tình huống khẩn cấp.
    public bool Enabled { get; set; } = true;

    /// Minimum confidence required to accept an LLM "approve" verdict.
    public double ApproveMinConfidence { get; set; } = 0.70;

    /// Minimum confidence required to accept an LLM "reject" verdict.
    public double RejectMinConfidence { get; set; } = 0.80;

    /// Maximum severity (inclusive) still allowed to auto-approve.
    public int ApproveMaxSeverity { get; set; } = 1;

    /// Minimum severity (inclusive) required to auto-reject.
    public int RejectMinSeverity { get; set; } = 2;

    /// Categories that always force NeedsReview regardless of confidence/severity,
    /// because they need a human in the loop (e.g. self-harm should never be silently deleted).
    /// Values must match PostService.DTOs.Moderation.ModerationCategories.
    public List<string> AlwaysReviewCategories { get; set; } = ["self_harm"];

    /// Polling interval for background worker in seconds.
    public int PollIntervalSeconds { get; set; } = 3;

    /// Maximum number of pending records to fetch in one batch.
    public int BatchSize { get; set; } = 10;

    /// Maximum moderation attempts before marking as Fallback/NeedsReview.
    public int MaxAttempts { get; set; } = 3;

    /// Thời gian (giây) một worker giữ lease trên một bản ghi Pending.
    /// Phải lớn hơn thời gian tối đa một lần gọi LLM (DeepSeek TimeoutSeconds)
    /// để tránh worker khác giành mất bản ghi khi nó đang xử lý.
    public int LeaseDurationSeconds { get; set; } = 120;
}
