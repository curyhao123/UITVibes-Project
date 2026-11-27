namespace PostService.DTOs.Moderation;

/// <summary>
/// Một tài khoản đang tích lũy strike — dùng cho màn hình "Strike Manager".
///
/// Tách khỏi <see cref="ModerationStrikeEntryDto"/> vì admin cần thông tin ở mức
/// TÀI KHOẢN (tổng strike còn hiệu lực, đã vượt ngưỡng chưa) chứ không phải
/// từng bản ghi strike riêng lẻ.
/// </summary>
public class ModerationStrikeUserDto
{
    public Guid UserId { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public string AvatarUrl { get; set; } = string.Empty;

    /// Số bản ghi strike còn hiệu lực (chưa hết hạn, chưa bị admin gỡ).
    public int ActiveStrikeCount { get; set; }

    /// Tổng trọng số strike còn hiệu lực — so với ngưỡng để biết còn bao nhiêu "bước".
    public int ActiveStrikeWeight { get; set; }

    /// Ngưỡng khoá tài khoản đang áp dụng.
    public int BanThreshold { get; set; }

    /// Tài khoản đã vượt ngưỡng (hệ thống strike đã yêu cầu ban).
    public bool ShouldBeBanned { get; set; }

    /// Tài khoản đang bị khoá hay không (đọc từ UserService).
    public bool IsBanned { get; set; }

    /// Thời điểm vi phạm gần nhất.
    public DateTime? LastViolationAt { get; set; }

    /// Bản ghi strike mới nhất — làm "đại diện" cho tài khoản trong danh sách.
    public ModerationStrikeEntryDto? LatestStrike { get; set; }
}
