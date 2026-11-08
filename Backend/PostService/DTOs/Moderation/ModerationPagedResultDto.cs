namespace PostService.DTOs.Moderation;

/// <summary>
/// Kết quả phân trang cho hàng đợi kiểm duyệt.
/// Tổng số bản ghi giúp FE tính được số trang và biết còn bao nhiêu ca chờ xử lý.
/// </summary>
public class ModerationPagedResultDto
{
    public List<ModerationResultDto> Items { get; set; } = new();

    /// Tổng số bản ghi khớp bộ lọc (không giới hạn bởi Take).
    public int Total { get; set; }

    public int Skip { get; set; }

    public int Take { get; set; }

    /// Số trang hiện tại (1-based).
    public int Page => Take > 0 ? (Skip / Take) + 1 : 1;

    /// Tổng số trang.
    public int TotalPages => Take > 0 ? (int)Math.Ceiling(Total / (double)Take) : 1;

    /// Còn bao nhiêu bản ghi chưa xem (dùng để cảnh báo backlog).
    public bool HasMore => Skip + Items.Count < Total;
}
