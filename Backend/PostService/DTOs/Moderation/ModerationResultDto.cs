using PostService.Enums;

namespace PostService.DTOs.Moderation;

/// <summary>
/// DTO returned to the admin content-review screen.
/// Includes the "target" (the moderated post/comment) so the admin doesn't need
/// a second API call to see the content under review.
/// </summary>
public class ModerationResultDto
{
    // ===== Moderation record =====
    public Guid Id { get; set; }

    /// Id of the moderated content (PostId, CommentId...).
    public Guid TargetId { get; set; }

    public ModerationTargetType TargetType { get; set; }

    public ModerationStatus Status { get; set; }

    public ModerationSource Source { get; set; }

    /// The LLM's raw decision: "approve" | "reject" | "review".
    public string? LlmDecision { get; set; }

    public int? Severity { get; set; }

    public double? Confidence { get; set; }

    /// Violation categories (split from the CSV stored in the DB).
    public List<string> Categories { get; set; } = new();

    /// The reason shown to the author.
    public string? AuthorReason { get; set; }

    /// Internal code for logs and metrics. Admins may see it for debugging.
    public string InternalReasonCode { get; set; } = string.Empty;

    public int AttemptCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    // ===== Admin decision =====
    public string? AdminNote { get; set; }

    public Guid? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    // ===== Moderated content (snapshot) =====
    public string TargetContent { get; set; } = string.Empty;

    public List<string> TargetMediaUrls { get; set; } = new();

    public bool TargetDeleted { get; set; }

    // ===== Author =====
    public Guid AuthorId { get; set; }

    public string AuthorDisplayName { get; set; } = string.Empty;

    public string AuthorAvatarUrl { get; set; } = string.Empty;
}