using PostService.DTOs.Moderation;
using PostService.Enums;

namespace PostService.DTOs.Moderation;

/// <summary>
/// Bộ lọc cho hàng đợi kiểm duyệt của admin.
///
/// Ngoài các bộ lọc cơ bản (status / targetType / category), hàng đợi cần
/// sắp xếp theo mức độ nghiêm trọng và biết tổng số bản ghi để phân trang,
/// cũng cần lọc theo thời gian và tác giả để xử lý nhanh các ca cũ.
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

    /// Sắp xếp theo mức độ nghiêm trọng (giảm dần) thay vì theo thời gian.
    /// Các bản ghi chưa có severity được coi như severity 0 (ưu tiên thấp nhất).
    public bool OrderBySeverity { get; set; }

    /// Sắp xếp theo điểm ưu tiên (giảm dần) — điểm ưu tiên được tính từ
    /// số report + severity (Phase 3.6). Nội dung bị report nhiều sẽ lên đầu.
    public bool OrderByPriority { get; set; }

    /// Tìm kiếm toàn văn trong nội dung / lý do / category của nội dung bị kiểm duyệt.
    /// Áp dụng cho cả bài viết, bình luận và reel (Phase 2.9).
    public string? Search { get; set; }

    /// Chỉ lấy các bản ghi có tối thiểu số report đang mở này.
    public int? MinReportCount { get; set; }

    /// Chỉ lấy các bản ghi có khiếu nại đang chờ xử lý.
    public bool OnlyWithAppeal { get; set; }

    /// Lọc theo severity tối thiểu (0–3).
    public int? MinSeverity { get; set; }

    /// Lọc theo confidence tối thiểu (0.0–1.0).
    public double? MinConfidence { get; set; }

    /// Lọc theo thời điểm tạo bản ghi, từ ngày (inclusive).
    public DateTime? FromUtc { get; set; }

    /// Lọc theo thời điểm tạo bản ghi, đến ngày (inclusive).
    public DateTime? ToUtc { get; set; }

    /// Lọc theo id tác giả của nội dung.
    public Guid? AuthorId { get; set; }

    public int Skip { get; set; }

    public int Take { get; set; } = 20;
}
