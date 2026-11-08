namespace PostService.DTOs.Moderation;

/// <summary>
/// Kết quả xử lý strike của một tài khoản (Phase 3.5).
/// </summary>
public class ModerationStrikeResultDto
{
    public Guid UserId { get; set; }

    /// Tổng strike còn hiệu lực (chưa hết hạn, chưa bị admin gỡ).
    public int ActiveStrikeCount { get; set; }

    /// Tổng "trọng số" strike còn hiệu lực — dùng để so với ngưỡng khoá.
    public int ActiveStrikeWeight { get; set; }

    /// Ngưỡng khoá tài khoản đang áp dụng.
    public int BanThreshold { get; set; }

    /// Tài khoản đã vượt ngưỡng chưa.
    public bool ShouldBeBanned { get; set; }

    /// Tài khoản đã bị khoá bởi hệ thống strike chưa.
    public bool IsBanned { get; set; }

    /// Hệ thống strike có đang bật không (để admin biết số liệu có ý nghĩa không).
    public bool Enabled { get; set; }
}

/// <summary>
/// Một dòng strike trong danh sách vi phạm (dùng cho màn hình admin).
/// </summary>
public class ModerationStrikeEntryDto
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid TargetId { get; set; }

    public string TargetType { get; set; } = string.Empty;

    public int Severity { get; set; }

    public int Weight { get; set; }

    public string ReasonCode { get; set; } = string.Empty;

    public string IssuedBy { get; set; } = string.Empty;

    public bool IsRevoked { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }
}
