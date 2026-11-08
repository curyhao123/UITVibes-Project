using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Pipeline mỗi lần gọi:
///   1. Rule filter  (IModerationRuleFilter) — chặn tất định trước, không tốn token LLM
///   2. Chọn model   (A/B routing theo bucket tất định của TargetId)
///   3. Build prompt  (IModerationPromptBuilder)
///   4. HTTP POST     (IHttpClientFactory → named client "DeepSeek")
///   5. Parse JSON    (IModerationResponseParser)
///   6. Evaluate      (IModerationDecisionEvaluator)
///   7. Shadow run    (tuỳ chọn — model "bóng", chỉ ghi log, KHÔNG áp dụng)
///
/// Mọi exception đều được bắt nội bộ → trả Fallback/NeedsReview thay vì crash worker.
/// </summary>
public class LlmModerationService : ILlmModerationService
{
    // Named client key — phải khớp với tên đăng ký trong Program.cs
    public const string HttpClientName = "DeepSeek";

    private static readonly JsonSerializerOptions ResponseJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // Raw response được lưu lại để audit — cắt ngắn để không phình database.
    private const int MaxStoredRawResponseLength = 4000;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IModerationPromptBuilder _promptBuilder;
    private readonly IModerationResponseParser _responseParser;
    private readonly IModerationDecisionEvaluator _evaluator;
    private readonly IModerationRuleFilter _ruleFilter;
    private readonly DeepSeekOptions _deepSeekOptions;
    private readonly ModerationRoutingOptions _routingOptions;
    private readonly ModerationShadowOptions _shadowOptions;
    private readonly IModerationMetrics _metrics;
    private readonly ILogger<LlmModerationService> _logger;

    public LlmModerationService(
        IHttpClientFactory httpClientFactory,
        IModerationPromptBuilder promptBuilder,
        IModerationResponseParser responseParser,
        IModerationDecisionEvaluator evaluator,
        IModerationRuleFilter ruleFilter,
        IOptions<DeepSeekOptions> deepSeekOptions,
        IOptions<ModerationRoutingOptions> routingOptions,
        IOptions<ModerationShadowOptions> shadowOptions,
        IModerationMetrics metrics,
        ILogger<LlmModerationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _promptBuilder = promptBuilder;
        _responseParser = responseParser;
        _evaluator = evaluator;
        _ruleFilter = ruleFilter;
        _deepSeekOptions = deepSeekOptions.Value;
        _routingOptions = routingOptions.Value;
        _shadowOptions = shadowOptions.Value;
        _metrics = metrics;
        _logger = logger;
    }

    public async Task<ModerationDecisionResult> ModerateAsync(
        string content,
        ModerationTargetType targetType,
        Guid targetId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // 0. Rule filter — chặn tất định trước khi tốn lượt gọi LLM.
            //    LLM có xu hướng approve chửi thề đứng riêng lẻ với confidence
            //    cao; rule đảm bảo vi phạm này không lọt qua dù model "hôm nay
            //    trả lời lạ".
            var ruleDecision = _ruleFilter.Evaluate(content, targetType);
            if (ruleDecision is not null)
            {
                _metrics.RecordRuleHit(targetType);
                return ruleDecision;
            }

            // 1. Chọn model theo bucket A/B (tất định theo TargetId).
            var variant = _routingOptions.SelectVariant(targetId);
            var modelName = variant?.Model ?? _deepSeekOptions.Model;
            var promptVersion = variant?.PromptVersion ?? ModerationPromptBuilder.CurrentVersion;
            var enableThinking = variant?.EnableThinking ?? _deepSeekOptions.EnableThinking;
            var reasoningEffort = variant?.ReasoningEffort ?? _deepSeekOptions.ReasoningEffort;

            if (variant is not null)
            {
                _logger.LogInformation(
                    "A/B routing selected model {Model} (prompt {PromptVersion}) for target {TargetId}.",
                    modelName, promptVersion, targetId);
            }

            // 2. Build prompt
            var prompt = _promptBuilder.Build(content, targetType, promptVersion);

            // 3. Gọi DeepSeek API
            var llmCall = await CallDeepSeekAsync(
                prompt, modelName, enableThinking, reasoningEffort, cancellationToken);

            if (llmCall.RawContent is null)
            {
                _logger.LogWarning(
                    "DeepSeek returned an empty choice content for {TargetType}", targetType);
                _metrics.RecordLlmError(targetType);
                return BuildFallback("empty_llm_response", modelName, prompt.PromptVersion);
            }

            // 4. Parse JSON response
            if (!_responseParser.TryParse(llmCall.RawContent, out var llmOutput, out var failureReason))
            {
                _logger.LogWarning(
                    "Failed to parse LLM response for {TargetType}. Reason: {Reason}. Raw: {Raw}",
                    targetType, failureReason, TruncateForLog(llmCall.RawContent));
                _metrics.RecordLlmError(targetType);
                return BuildFallback($"parse_failed:{failureReason}", modelName, prompt.PromptVersion);
            }

            // 5. Evaluate decision
            var decision = _evaluator.Evaluate(llmOutput!);

            // Gắn metadata kỹ thuật để đo chất lượng & chi phí.
            var cost = EstimateCost(llmCall.PromptTokens, llmCall.CompletionTokens);
            var enriched = new ModerationDecisionResult
            {
                Status = decision.Status,
                Source = decision.Source,
                Reason = decision.Reason,
                InternalReasonCode = decision.InternalReasonCode,
                LlmDecision = decision.LlmDecision,
                Severity = decision.Severity,
                Confidence = decision.Confidence,
                Categories = decision.Categories,
                ModelName = modelName,
                PromptVersion = prompt.PromptVersion,
                RawResponse = TruncateForStorage(llmCall.RawContent),
                LatencyMs = llmCall.LatencyMs,
                PromptTokens = llmCall.PromptTokens,
                CompletionTokens = llmCall.CompletionTokens,
                TotalTokens = llmCall.TotalTokens,
                EstimatedCostUsd = cost,
            };

            _metrics.RecordLlmCall(targetType, llmCall.LatencyMs, llmCall.TotalTokens ?? 0, cost ?? 0);
            _metrics.RecordDecision(targetType, enriched.Status);

            // 6. Shadow run — chỉ ghi log, KHÔNG áp dụng lên nội dung.
            var withShadow = await AttachShadowResultAsync(
                content, targetType, targetId, enriched, cancellationToken);

            return withShadow;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Worker bị tắt — không log như lỗi, đây là flow bình thường khi shutdown
            _logger.LogInformation("LLM moderation cancelled for {TargetType}", targetType);
            return BuildFallback("cancelled", _deepSeekOptions.Model, null);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex,
                "HTTP error calling DeepSeek API for {TargetType}. Status: {Status}",
                targetType, ex.StatusCode);
            _metrics.RecordLlmError(targetType);
            return BuildFallback("http_error", _deepSeekOptions.Model, null);
        }
        catch (TaskCanceledException ex)
        {
            // TaskCanceledException không do cancellationToken → là timeout từ HttpClient
            _logger.LogError(ex, "DeepSeek API request timed out for {TargetType}", targetType);
            _metrics.RecordLlmError(targetType);
            return BuildFallback("timeout", _deepSeekOptions.Model, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Unexpected error in LLM moderation for {TargetType}", targetType);
            _metrics.RecordLlmError(targetType);
            return BuildFallback("unexpected_error", _deepSeekOptions.Model, null);
        }
    }

    // ── Shadow mode ──────────────────────────────────────────────────────────

    /// <summary>
    /// Chạy thêm một lượt gọi LLM bằng "model bóng" và ghi kết quả vào decision.
    ///
    /// Quy tắc an toàn:
    ///   - Quyết định của shadow KHÔNG thay đổi Status của quyết định chính.
    ///   - Lỗi trong shadow KHÔNG được làm fail quyết định chính (best-effort).
    /// </summary>
    private async Task<ModerationDecisionResult> AttachShadowResultAsync(
        string content,
        ModerationTargetType targetType,
        Guid targetId,
        ModerationDecisionResult primary,
        CancellationToken cancellationToken)
    {
        if (!_shadowOptions.Enabled)
            return primary;

        if (!ShouldSampleShadow(targetId))
            return primary;

        try
        {
            var shadowPrompt = _promptBuilder.Build(
                content, targetType, _shadowOptions.PromptVersion);

            var shadowCall = await CallDeepSeekAsync(
                shadowPrompt,
                _shadowOptions.Model,
                _shadowOptions.EnableThinking,
                _shadowOptions.ReasoningEffort,
                cancellationToken,
                _shadowOptions.MaxCompletionTokens);

            if (shadowCall.RawContent is null
                || !_responseParser.TryParse(shadowCall.RawContent, out var shadowOutput, out _)
                || shadowOutput is null)
            {
                _logger.LogWarning(
                    "Shadow run for target {TargetId} produced no usable decision. Skipping.", targetId);
                return primary;
            }

            var shadowDecision = _evaluator.Evaluate(shadowOutput);
            var agrees = shadowDecision.Status == primary.Status;

            _metrics.RecordShadowRun(targetType, agrees);

            _logger.LogInformation(
                "Shadow run for target {TargetId}: primary={PrimaryStatus} shadow={ShadowStatus} agrees={Agrees} model={Model} prompt={PromptVersion}.",
                targetId, primary.Status, shadowDecision.Status, agrees,
                _shadowOptions.Model, shadowPrompt.PromptVersion);

            return new ModerationDecisionResult
            {
                Status = primary.Status,
                Source = primary.Source,
                Reason = primary.Reason,
                InternalReasonCode = primary.InternalReasonCode,
                LlmDecision = primary.LlmDecision,
                Severity = primary.Severity,
                Confidence = primary.Confidence,
                Categories = primary.Categories,
                ModelName = primary.ModelName,
                PromptVersion = primary.PromptVersion,
                RawResponse = primary.RawResponse,
                LatencyMs = primary.LatencyMs,
                PromptTokens = primary.PromptTokens,
                CompletionTokens = primary.CompletionTokens,
                TotalTokens = primary.TotalTokens,
                EstimatedCostUsd = primary.EstimatedCostUsd,
                ShadowDecision = shadowDecision.LlmDecision,
                ShadowStatus = shadowDecision.Status,
                ShadowConfidence = shadowDecision.Confidence,
                ShadowSeverity = shadowDecision.Severity,
                ShadowModel = _shadowOptions.Model,
                ShadowPromptVersion = shadowPrompt.PromptVersion,
                ShadowAgreesWithPrimary = agrees,
            };
        }
        catch (Exception ex)
        {
            // Shadow là best-effort — không được ảnh hưởng quyết định chính.
            _logger.LogWarning(ex,
                "Shadow run failed for target {TargetId}. Primary decision is unaffected.", targetId);
            return primary;
        }
    }

    /// <summary>
    /// Quyết định có chạy shadow không. Dùng hash tất định của TargetId để tỉ lệ
    /// lấy mẫu ổn định theo thời gian (một nội dung luôn có cùng kết luận shadow).
    /// </summary>
    private bool ShouldSampleShadow(Guid targetId)
    {
        var rate = Math.Clamp(_shadowOptions.SampleRate, 0, 1);
        if (rate <= 0) return false;
        if (rate >= 1) return true;

        var hash = (uint)(targetId.GetHashCode() & 0x7FFFFFFF);
        return hash / (double)int.MaxValue < rate;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /// <summary>Kết quả một lần gọi HTTP tới DeepSeek.</summary>
    private sealed record DeepSeekCallResult(
        string? RawContent,
        int LatencyMs,
        int? PromptTokens,
        int? CompletionTokens,
        int? TotalTokens);

    private async Task<DeepSeekCallResult> CallDeepSeekAsync(
        ModerationPrompt prompt,
        string modelName,
        bool enableThinking,
        string reasoningEffort,
        CancellationToken cancellationToken,
        int? maxTokensOverride = null)
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);

        var requestBody = new DeepSeekChatRequest
        {
            Model = modelName,
            MaxTokens = maxTokensOverride ?? _deepSeekOptions.MaxCompletionTokens,
            Messages =
            [
                new DeepSeekRequestMessage { Role = "system", Content = prompt.SystemPrompt },
                new DeepSeekRequestMessage { Role = "user", Content = prompt.UserMessage },
            ],
            Thinking = enableThinking
                ? new DeepSeekThinking { Type = "enabled" }
                : null,
            ReasoningEffort = enableThinking
                ? reasoningEffort
                : null,
            // Khi bật thinking, DeepSeek VẪN chấp nhận temperature (đã kiểm chứng
            // với API thật). Comment cũ nói "tránh conflict" là không đúng —
            // việc bỏ temperature đi khiến model dùng mặc định (~1.0) → không
            // tất định → model tự bịa confidence cao (0.8–0.9) để approve nội dung
            // vi phạm. Luôn gửi temperature = 0 cho kiểm duyệt.
            Temperature = 0.0,
            Stream = false
        };

        var stopwatch = Stopwatch.StartNew();

        using var httpResponse = await client.PostAsJsonAsync(
            "/chat/completions", requestBody, cancellationToken);

        if (!httpResponse.IsSuccessStatusCode)
        {
            var errorBody = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError(
                "DeepSeek API returned {StatusCode}. Body: {Body}",
                (int)httpResponse.StatusCode, TruncateForLog(errorBody));
            httpResponse.EnsureSuccessStatusCode(); // throws HttpRequestException
        }

        var chatResponse = await httpResponse.Content
            .ReadFromJsonAsync<DeepSeekChatResponse>(ResponseJsonOptions, cancellationToken);

        stopwatch.Stop();

        return new DeepSeekCallResult(
            chatResponse?.Choices?.FirstOrDefault()?.Message?.Content,
            (int)stopwatch.ElapsedMilliseconds,
            chatResponse?.Usage?.PromptTokens,
            chatResponse?.Usage?.CompletionTokens,
            chatResponse?.Usage?.TotalTokens);
    }

    /// <summary>
    /// Ước tính chi phí USD từ số token. Giá được cấu hình ở DeepSeekOptions —
    /// nếu chưa cấu hình thì trả null (không đoán số).
    /// </summary>
    private double? EstimateCost(int? promptTokens, int? completionTokens)
    {
        var inputRate = _deepSeekOptions.InputCostPer1MTokensUsd;
        var outputRate = _deepSeekOptions.OutputCostPer1MTokensUsd;

        if (inputRate <= 0 && outputRate <= 0)
            return null;

        var inputCost = (promptTokens ?? 0) / 1_000_000d * inputRate;
        var outputCost = (completionTokens ?? 0) / 1_000_000d * outputRate;

        return Math.Round(inputCost + outputCost, 8);
    }

    /// <summary>
    /// Fallback an toàn: luôn trả NeedsReview với Source = Fallback.
    /// Không bao giờ trả Approved hay Rejected khi LLM không hoạt động đúng.
    /// </summary>
    private static ModerationDecisionResult BuildFallback(
        string reason,
        string? modelName = null,
        string? promptVersion = null) => new()
        {
            Status = ModerationStatus.NeedsReview,
            Source = ModerationSource.Fallback,
            Reason = null,
            InternalReasonCode = $"llm_unavailable:{reason}",
            ModelName = modelName,
        };

    private static string TruncateForLog(string s) =>
        s.Length <= 200 ? s : string.Concat(s.AsSpan(0, 200), "...");

    /// <summary>Cắt ngắn raw response trước khi lưu vào DB (tránh phình bảng).</summary>
    private static string TruncateForStorage(string s) =>
        s.Length <= MaxStoredRawResponseLength
            ? s
            : string.Concat(s.AsSpan(0, MaxStoredRawResponseLength), "...[truncated]");
}
