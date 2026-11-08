using System.Diagnostics.Metrics;
using PostService.Enums;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Hiện thực <see cref="IModerationMetrics"/> bằng <see cref="Meter"/> của
/// System.Diagnostics.Metrics.
///
/// OpenTelemetry trong ServiceDefaults tự động thu thập meter đã đăng ký qua
/// <c>builder.Services.AddMeter(IModerationMetrics.MeterName)</c>.
///
/// Vì sao không ghi metric bằng cách tạo Histogram mỗi lần: việc tạo instrument
/// phải chỉ xảy ra một lần lúc khởi tạo, nếu tạo trong vòng lặp sẽ rò rỉ bộ nhớ.
/// </summary>
public class ModerationMetrics : IModerationMetrics
{
    private readonly Meter _meter;

    private readonly Counter<long> _llmCalls;
    private readonly Counter<long> _llmErrors;
    private readonly Histogram<double> _llmLatency;
    private readonly Histogram<double> _llmCost;
    private readonly Counter<long> _ruleHits;
    private readonly Counter<long> _shadowRuns;
    private readonly Counter<long> _shadowAgreements;

    private readonly Counter<long> _approved;
    private readonly Counter<long> _rejected;
    private readonly Counter<long> _needsReview;
    private readonly Counter<long> _pending;

    private readonly Counter<long> _adminOverturns;

    public ModerationMetrics()
    {
        _meter = new Meter(IModerationMetrics.MeterName);

        _llmCalls = _meter.CreateCounter<long>(
            "moderation.llm.calls",
            unit: "{call}",
            description: "Số lần gọi LLM cho kiểm duyệt.");

        _llmErrors = _meter.CreateCounter<long>(
            "moderation.llm.errors",
            unit: "{call}",
            description: "Số lần gọi LLM thất bại (fallback sang NeedsReview).");

        _llmLatency = _meter.CreateHistogram<double>(
            "moderation.llm.latency",
            unit: "ms",
            description: "Độ trễ gọi LLM cho kiểm duyệt.");

        _llmCost = _meter.CreateHistogram<double>(
            "moderation.llm.cost_usd",
            unit: "USD",
            description: "Chi phí ước tính mỗi lần gọi LLM.");

        _ruleHits = _meter.CreateCounter<long>(
            "moderation.rule.hits",
            unit: "{content}",
            description: "Số nội dung bị chặn bởi rule tiền xử lý (không tốn token LLM).");

        _shadowRuns = _meter.CreateCounter<long>(
            "moderation.shadow.runs",
            unit: "{run}",
            description: "Số lần chạy shadow mode.");

        _shadowAgreements = _meter.CreateCounter<long>(
            "moderation.shadow.agreements",
            unit: "{run}",
            description: "Số lần shadow mode đồng ý với quyết định chính.");

        _approved = _meter.CreateCounter<long>(
            "moderation.decisions.approved", unit: "{content}");
        _rejected = _meter.CreateCounter<long>(
            "moderation.decisions.rejected", unit: "{content}");
        _needsReview = _meter.CreateCounter<long>(
            "moderation.decisions.needs_review", unit: "{content}");
        _pending = _meter.CreateCounter<long>(
            "moderation.decisions.pending", unit: "{content}");

        _adminOverturns = _meter.CreateCounter<long>(
            "moderation.admin.overturns",
            unit: "{decision}",
            description: "Số lần admin đảo quyết định của AI (false positive/negative).");
    }

    public void RecordLlmCall(
        ModerationTargetType targetType,
        int latencyMs,
        int totalTokens,
        double costUsd)
    {
        var tag = new KeyValuePair<string, object?>("target_type", targetType.ToString());

        _llmCalls.Add(1, tag);
        _llmLatency.Record(latencyMs, tag);

        if (costUsd > 0)
            _llmCost.Record(costUsd, tag);
    }

    public void RecordLlmError(ModerationTargetType targetType)
        => _llmErrors.Add(1, new KeyValuePair<string, object?>("target_type", targetType.ToString()));

    public void RecordRuleHit(ModerationTargetType targetType)
        => _ruleHits.Add(1, new KeyValuePair<string, object?>("target_type", targetType.ToString()));

    public void RecordShadowRun(ModerationTargetType targetType, bool agrees)
    {
        var tag = new KeyValuePair<string, object?>("target_type", targetType.ToString());
        _shadowRuns.Add(1, tag);

        if (agrees)
            _shadowAgreements.Add(1, tag);
    }

    public void RecordDecision(ModerationTargetType targetType, ModerationStatus status)
    {
        var tag = new KeyValuePair<string, object?>("target_type", targetType.ToString());

        switch (status)
        {
            case ModerationStatus.Approved:
                _approved.Add(1, tag);
                break;
            case ModerationStatus.Rejected:
                _rejected.Add(1, tag);
                break;
            case ModerationStatus.NeedsReview:
                _needsReview.Add(1, tag);
                break;
            default:
                _pending.Add(1, tag);
                break;
        }
    }

    public void RecordAdminOverturn(ModerationTargetType targetType, bool overturned)
        => _adminOverturns.Add(
            1,
            new KeyValuePair<string, object?>("target_type", targetType.ToString()),
            new KeyValuePair<string, object?>("overturned", overturned));
}
