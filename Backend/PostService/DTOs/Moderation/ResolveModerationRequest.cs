using System.ComponentModel.DataAnnotations;

namespace PostService.DTOs.Moderation;

/// <summary>
/// The admin's decision when resolving content awaiting review.
/// </summary>
public enum ModerationAdminDecision
{
    /// Approve — the content becomes publicly visible.
    Approve = 0,

    /// Reject — the content is hidden; only the author can see it.
    Reject = 1
}

public class ResolveModerationRequest
{
    [Required]
    public ModerationAdminDecision Decision { get; set; }

    /// Admin note (optional).
    [StringLength(500)]
    public string? AdminNote { get; set; }
}