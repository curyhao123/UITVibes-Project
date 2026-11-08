using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Metrics của pipeline kiểm duyệt (Phase 3.4).
///
/// Dùng <see cref="System.Diagnostics.Metrics"/> — OpenTelemetry trong
/// ServiceDefaults đã tự động thu thập các meter đăng ký qua
/// <c>AddMeter(...)</c>. Chỉ cần gọi <c>builder.Services.AddMeter(...)</c>.
///
/// Vì sao cần metrics:
///   - <c>moderation.llm.latency</c>       → biết model có chậm không.
///   - <c>moderation.llm.errors</c>        → biết DeepSeek lỗi bao nhiêu (fail-safe đang chạy).
///   - <c>moderation.decisions.approved</c> → tỉ lệ tự duyệt; tăng bất thường = có thể model
///     đang "ngoan" quá mức (đây chính là triệu chứng của bug auto-approve).
///   - <c>moderation.admin.overturns</c>   → admin đảo quyết định AI bao nhiêu → đo độ chính xác.
///   - <c>moderation.rule.hits</c>          → rule chặn được bao nhiêu (tiết kiệm token).
///   - <c>moderation.shadow.*</c>          → độ đồng thuận giữa model chính và model bóng.
/// </summary>
public interface IModerationMetrics
{
    /// <summary>Tên meter — phải khớp với <c>AddMeter</c> trong Program.cs.</summary>
    const string MeterName = "UITVibes.PostService.Moderation";

    /// <summary>Ghi nhận một lần gọi LLM thành công.</summary>
    void RecordLlmCall(
        ModerationTargetType targetType,
        int latencyMs,
        int totalTokens,
        double costUsd);

    /// <summary>Ghi nhận một lần gọi LLM thất bại (fallback sang NeedsReview).</summary>
    void RecordLlmError(ModerationTargetType targetType);

    /// <summary>Ghi nhận rule tiền xử lý đã chặn nội dung (không tốn token LLM).</summary>
    void RecordRuleHit(ModerationTargetType targetType);

    /// <summary>Ghi nhận một lần chạy shadow mode.</summary>
    void RecordShadowRun(ModerationTargetType targetType, bool agrees);

    /// <summary>Ghi nhận quyết định cuối cùng cho một nội dung.</summary>
    void RecordDecision(ModerationTargetType targetType, ModerationStatus status);

    /// <summary>Ghi nhận admin đã đảo quyết định của AI hay không (dùng để đo độ chính xác).</summary>
    void RecordAdminOverturn(ModerationTargetType targetType, bool overturned);
}
