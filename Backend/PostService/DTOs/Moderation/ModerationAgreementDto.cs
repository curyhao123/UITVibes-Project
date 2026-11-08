namespace PostService.DTOs.Moderation;

/// <summary>
/// Tổng quan "đồng thuận" giữa AI và admin (Phase 3.2).
///
/// Mục tiêu: đo thay vì đoán. Khi đổi model/prompt/ngưỡng, đọc số liệu này để
/// biết mình đang đi đúng hướng hay không.
/// </summary>
public class ModerationAgreementDto
{
    /// Tổng số bản ghi đã có quyết định của admin (mẫu đo).
    public int ReviewedCount { get; set; }

    /// Số ca AI nói "approve" nhưng admin vẫn reject → false negative của AI.
    public int FalseNegativeCount { get; set; }

    /// Số ca AI nói "reject" nhưng admin approve lại → false positive của AI.
    public int FalsePositiveCount { get; set; }

    /// Tỉ lệ AI sai (0.0 – 1.0). Càng thấp càng tốt.
    public double DisagreementRate { get; set; }

    /// Tỉ lệ admin đồng ý với AI (0.0 – 1.0).
    public double AgreementRate { get; set; }

    /// Độ chính xác ước tính của AI (0.0 – 1.0) = 1 - DisagreementRate.
    public double EstimatedAccuracy { get; set; }

    /// Thống kê chi tiết theo từng category vi phạm.
    public List<ModerationCategoryAgreementDto> ByCategory { get; set; } = new();

    /// Thống kê chi tiết theo phiên bản prompt (để biết prompt nào tốt hơn).
    public List<ModerationPromptVersionStatsDto> ByPromptVersion { get; set; } = new();

    /// Thống kê chi tiết theo model.
    public List<ModerationPromptVersionStatsDto> ByModel { get; set; } = new();

    /// Ngưỡng đề xuất dựa trên dữ liệu thật (3.2 — "tự đề xuất ngưỡng").
    public ModerationThresholdSuggestionDto? SuggestedThresholds { get; set; }
}

/// <summary>
/// Đồng thuận theo một category vi phạm cụ thể.
/// </summary>
public class ModerationCategoryAgreementDto
{
    public string Category { get; set; } = string.Empty;

    public int ReviewedCount { get; set; }

    public int DisagreementCount { get; set; }

    public double AgreementRate { get; set; }
}

/// <summary>
/// Thống kê theo một "chiều" (prompt version hoặc model).
/// </summary>
public class ModerationPromptVersionStatsDto
{
    public string Key { get; set; } = string.Empty;

    public int TotalCount { get; set; }

    public int ApprovedCount { get; set; }

    public int RejectedCount { get; set; }

    public int NeedsReviewCount { get; set; }

    public double AutoApproveRatio { get; set; }
}

/// <summary>
/// Ngưỡng kiểm duyệt được đề xuất từ dữ liệu thật.
///
/// Nguyên tắc đề xuất:
///   - <see cref="ApproveMinConfidence"/>: cao hơn giá trị confidence trung vị của
///     các ca AI nói "approve" nhưng admin lại reject. Dưới ngưỡng đó → tuyệt đối
///     không auto-approve.
///   - <see cref="RejectMinConfidence"/>: không cao hơn giá trị confidence trung vị
///     của các ca AI nói "reject" nhưng admin lại approve. Trên ngưỡng đó → tuyệt đối
///     không auto-reject.
///
/// Đề xuất KHÔNG tự động áp dụng — admin phải review rồi mới set vào config.
/// </summary>
public class ModerationThresholdSuggestionDto
{
    /// Ngưỡng confidence tối thiểu để auto-approve (0.0 – 1.0).
    public double ApproveMinConfidence { get; set; }

    /// Ngưỡng confidence tối thiểu để auto-reject (0.0 – 1.0).
    public double RejectMinConfidence { get; set; }

    /// Số mẫu dùng để tính đề xuất.
    public int SampleSize { get; set; }

    /// Giải thích ngắn để admin hiểu đề xuất dựa trên căn cứ nào.
    public string Explanation { get; set; } = string.Empty;
}
