namespace PostService.DTOs.Moderation;

/// <summary>
/// Số liệu phân tích cho dashboard admin.
///
/// Gom nhiều nguồn để admin nhìn một lần là biết hệ thống kiểm duyệt đang
/// hoạt động thế nào: lưu lượng theo ngày, nội dung nào hay bị vi phạm,
/// AI có chính xác không, và tốn bao nhiêu tiền.
/// </summary>
public class ModerationAnalyticsDto
{
    /// Số ngày đã phân tích (bao gồm cả hôm nay).
    public int Days { get; set; }

    /// Tổng quan số liệu trong khoảng thời gian.
    public ModerationStatsDto Summary { get; set; } = new();

    /// Lưu lượng kiểm duyệt theo từng ngày (cũ → mới) để vẽ biểu đồ đường.
    public List<ModerationDailyPointDto> Daily { get; set; } = new();

    /// Phân bố theo loại nội dung (Post / Comment / Reel / Story / ReelComment).
    public List<ModerationBreakdownDto> ByTargetType { get; set; } = new();

    /// Phân bố theo nhóm vi phạm (harassment, spam, ...).
    public List<ModerationBreakdownDto> ByCategory { get; set; } = new();

    /// Phân bố theo nguồn quyết định (Rule / Llm / Human / Fallback).
    public List<ModerationBreakdownDto> BySource { get; set; } = new();

    /// Thống kê đồng thuận AI ↔ admin.
    public ModerationAgreementDto Agreement { get; set; } = new();

    /// Thời gian gọi LLM trung bình (ms).
    public double AverageLatencyMs { get; set; }

    /// Confidence trung bình của các quyết định do LLM đưa ra.
    public double AverageConfidence { get; set; }

    /// Tổng chi phí LLM ước tính trong khoảng thời gian (USD).
    public double TotalCostUsd { get; set; }

    /// Số tài khoản đang vượt ngưỡng strike (chưa bị ban) — cảnh báo cho admin.
    public int UsersOverStrikeThreshold { get; set; }
}

/// <summary>
/// Một điểm dữ liệu theo ngày trong biểu đồ lưu lượng kiểm duyệt.
/// </summary>
public class ModerationDailyPointDto
{
    /// Ngày (yyyy-MM-dd).
    public string Date { get; set; } = string.Empty;

    public int Total { get; set; }

    public int Approved { get; set; }

    public int Rejected { get; set; }

    public int NeedsReview { get; set; }

    public int Pending { get; set; }
}

/// <summary>
/// Một dòng phân bố theo một chiều (loại nội dung / category / nguồn quyết định).
/// </summary>
public class ModerationBreakdownDto
{
    /// Khoá của nhóm (vd: "Post", "harassment", "Llm").
    public string Key { get; set; } = string.Empty;

    public int Count { get; set; }

    /// Tỉ lệ phần trăm so với tổng của nhóm (0–100).
    public double Percentage { get; set; }
}
