using PostService.Enums;

namespace PostService.DTOs.Moderation;

/// <summary>
/// Filters for the admin moderation queue.
/// </summary>
public class ModerationQueryFilter
{
    /// Moderation status to fetch. Null = all statuses.
    public ModerationStatus? Status { get; set; }

    /// Content type. Null = all types.
    public ModerationTargetType? TargetType { get; set; }

    /// Filter by violation category (matched per element against the CSV stored in the DB).
    public string? Category { get; set; }

    /// Sort by creation time (default) or by last update time.
    public bool OrderByUpdatedAt { get; set; }

    public int Skip { get; set; }

    public int Take { get; set; } = 20;
}