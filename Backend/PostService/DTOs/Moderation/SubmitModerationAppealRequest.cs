using System.ComponentModel.DataAnnotations;
using PostService.Enums;

namespace PostService.DTOs.Moderation;

/// <summary>
/// Body cho endpoint gửi khiếu nại: POST /api/post/moderation/{id}/appeal
/// </summary>
public class SubmitModerationAppealRequest
{
    /// Lý do khiếu nại (bắt buộc, tối đa 500 ký tự).
    [Required]
    [StringLength(500, MinimumLength = 10)]
    public string Reason { get; set; } = string.Empty;
}
