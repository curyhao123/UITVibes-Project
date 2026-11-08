namespace PostService.DTOs.Moderation;

/// <summary>
/// Kết quả thao tác hàng loạt trên hàng đợi kiểm duyệt.
/// </summary>
public class BulkModerationResultDto
{
    /// "approve" | "reject"
    public string Action { get; set; } = string.Empty;

    public int SucceededCount { get; set; }

    public int FailedCount { get; set; }

    public List<Guid> SucceededIds { get; set; } = new();

    public List<BulkModerationFailureDto> Failures { get; set; } = new();
}

/// <summary>
/// Một bản ghi không xử lý được trong thao tác hàng loạt.
/// </summary>
public class BulkModerationFailureDto
{
    public Guid Id { get; set; }

    /// Lý do thất bại (ví dụ: "Not found", "Moderation result is not awaiting review").
    public string Reason { get; set; } = string.Empty;
}
