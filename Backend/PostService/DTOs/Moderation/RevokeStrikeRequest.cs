namespace PostService.DTOs.Moderation;

/// <summary>
/// Request gỡ strike (Phase 3.5).
/// </summary>
public class RevokeStrikeRequest
{
    /// Chỉ gỡ strike của một bản ghi kiểm duyệt cụ thể. Null = gỡ tất cả.
    public Guid? ModerationResultId { get; set; }

    /// Lý do gỡ strike (ghi lại để audit).
    public string? Reason { get; set; }
}
