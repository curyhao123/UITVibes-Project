namespace PostService.DTOs.Moderation;

/// <summary>
/// Request gỡ strike (Phase 3.5).
/// </summary>
public class RevokeStrikeRequest
{
    /// Chỉ gỡ strike của một bản ghi kiểm duyệt cụ thể. Null = gỡ tất cả.
    public Guid? ModerationResultId { get; set; }

    /// Chỉ gỡ đúng một bản ghi strike (dùng khi admin gỡ từng lỗi trong lịch sử).
    /// Ưu tiên cao hơn <see cref="ModerationResultId"/> khi cả hai đều được gửi.
    public Guid? StrikeId { get; set; }

    /// Lý do gỡ strike (ghi lại để audit).
    public string? Reason { get; set; }
}
