namespace PostService.Configurations;

/// <summary>
/// Bind from configuration section "Moderation". Register with:
///   builder.Services.AddOptions&lt;ModerationOptions&gt;()
///       .Bind(builder.Configuration.GetSection(ModerationOptions.SectionName))
///       .ValidateDataAnnotations()
///       .ValidateOnStart();
/// Only the fields needed by the decision evaluator are here for now; worker/client settings
/// (PollInterval, BatchSize, LeaseDuration, MaxAttempts, DeepSeek:*...) are added in later phases.
/// </summary>
public class ModerationOptions
{
    public const string SectionName = "Moderation";

    /// Master switch. false = moderation pipeline is bypassed (new posts go straight to Approved).
    /// Intended for local dev / emergencies only — see plan §7.8.
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
}
