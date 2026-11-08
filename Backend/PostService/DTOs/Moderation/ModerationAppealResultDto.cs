using PostService.Enums;

namespace PostService.DTOs.Moderation;

/// <summary>
/// Kết quả trả về cho tác giả sau khi gửi / xem khiếu nại.
/// </summary>
public class ModerationAppealResultDto
{
    /// Id của bản ghi kiểm duyệt liên quan.
    public Guid ModerationResultId { get; set; }

    /// Id của nội dung bị khiếu nại.
    public Guid TargetId { get; set; }

    public ModerationTargetType TargetType { get; set; }

    /// Trạng thái khiếu nại: "None" | "Pending" | "Resolved".
    public string AppealStatus { get; set; } = ModerationAppealStatus.None.ToString();

    /// Lý do tác giả khiếu nại.
    public string? AppealReason { get; set; }

    /// Thời điểm gửi khiếu nại.
    public DateTime? AppealSubmittedAt { get; set; }

    /// Thời điểm admin xử lý xong khiếu nại.
    public DateTime? AppealResolvedAt { get; set; }

    /// Trạng thái kiểm duyệt hiện tại của nội dung sau khi khiếu nại.
    public string ModerationStatus { get; set; } = global::PostService.Enums.ModerationStatus.Pending.ToString();
}
