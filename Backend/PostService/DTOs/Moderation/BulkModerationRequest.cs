using System.ComponentModel.DataAnnotations;

namespace PostService.DTOs.Moderation;

/// <summary>
/// Body cho thao tác hàng loạt trên hàng đợi kiểm duyệt:
/// POST /api/post/moderation/bulk
/// </summary>
public class BulkModerationRequest
{
    /// Danh sách id bản ghi cần xử lý (tối đa 100).
    [Required]
    [MinLength(1)]
    [MaxLength(100)]
    public List<Guid> Ids { get; set; } = new();

    /// "approve" | "reject"
    [Required]
    public string Action { get; set; } = string.Empty;

    /// Ghi chú của admin cho các bản ghi này (tuỳ chọn).
    [StringLength(500)]
    public string? AdminNote { get; set; }
}
