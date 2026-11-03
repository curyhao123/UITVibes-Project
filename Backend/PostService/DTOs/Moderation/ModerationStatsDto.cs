using PostService.Enums;

namespace PostService.DTOs.Moderation;

/// <summary>
/// Aggregate moderation stats for the admin dashboard.
/// </summary>
public class ModerationStatsDto
{
    public int Total { get; set; }

    public int Pending { get; set; }

    public int Approved { get; set; }

    public int Rejected { get; set; }

    /// Content that landed in the grey zone — needs an admin to handle it.
    public int NeedsReview { get; set; }

    /// Records that fell back (the LLM failed / ran out of attempts).
    public int FallbackCount { get; set; }

    /// Records decided by an admin (ReviewedAt is set).
    public int ReviewedByAdminCount { get; set; }

    /// Records hidden because the author deleted the content before it could be reviewed.
    public int OrphanCount { get; set; }
}