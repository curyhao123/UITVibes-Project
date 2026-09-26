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
///   1. Build prompt  (IModerationPromptBuilder)
///   2. HTTP POST     (IHttpClientFactory → named client "DeepSeek")
///   3. Parse JSON    (IModerationResponseParser)
///   4. Evaluate      (IModerationDecisionEvaluator)
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

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IModerationPromptBuilder _promptBuilder;
    private readonly IModerationResponseParser _responseParser;
    private readonly IModerationDecisionEvaluator _evaluator;
    private readonly DeepSeekOptions _deepSeekOptions;
    private readonly ILogger<LlmModerationService> _logger;

    public LlmModerationService(
        IHttpClientFactory httpClientFactory,
        IModerationPromptBuilder promptBuilder,
        IModerationResponseParser responseParser,
        IModerationDecisionEvaluator evaluator,
        IOptions<DeepSeekOptions> deepSeekOptions,
        ILogger<LlmModerationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _promptBuilder = promptBuilder;
        _responseParser = responseParser;
        _evaluator = evaluator;
        _deepSeekOptions = deepSeekOptions.Value;
        _logger = logger;
    }

    public async Task<ModerationDecisionResult> ModerateAsync(
        string content,
        ModerationTargetType targetType,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // 1. Build prompt
            var prompt = _promptBuilder.Build(content, targetType);

            // 2. Gọi DeepSeek API
            var rawContent = await CallDeepSeekAsync(prompt, cancellationToken);

            if (rawContent is null)
            {
                _logger.LogWarning(
                    "DeepSeek returned an empty choice content for {TargetType}", targetType);
                return BuildFallback("empty_llm_response");
            }

            // 3. Parse JSON response
            if (!_responseParser.TryParse(rawContent, out var llmOutput, out var failureReason))
            {
                _logger.LogWarning(
                    "Failed to parse LLM response for {TargetType}. Reason: {Reason}. Raw: {Raw}",
                    targetType, failureReason, TruncateForLog(rawContent));
                return BuildFallback($"parse_failed:{failureReason}");
            }

            // 4. Evaluate decision
            return _evaluator.Evaluate(llmOutput!);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Worker bị tắt — không log như lỗi, đây là flow bình thường khi shutdown
            _logger.LogInformation("LLM moderation cancelled for {TargetType}", targetType);
            return BuildFallback("cancelled");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex,
                "HTTP error calling DeepSeek API for {TargetType}. Status: {Status}",
                targetType, ex.StatusCode);
            return BuildFallback("http_error");
        }
        catch (TaskCanceledException ex)
        {
            // TaskCanceledException không do cancellationToken → là timeout từ HttpClient
            _logger.LogError(ex, "DeepSeek API request timed out for {TargetType}", targetType);
            return BuildFallback("timeout");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Unexpected error in LLM moderation for {TargetType}", targetType);
            return BuildFallback("unexpected_error");
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<string?> CallDeepSeekAsync(
        ModerationPrompt prompt,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);

        var requestBody = new DeepSeekChatRequest
        {
            Model = _deepSeekOptions.Model,
            MaxTokens = _deepSeekOptions.MaxCompletionTokens,
            Messages =
            [
                new DeepSeekRequestMessage { Role = "system", Content = prompt.SystemPrompt },
                new DeepSeekRequestMessage { Role = "user", Content = prompt.UserMessage },
            ],
            Thinking = _deepSeekOptions.EnableThinking
                ? new DeepSeekThinking { Type = "enabled" }
                : null,
            ReasoningEffort = _deepSeekOptions.EnableThinking
                ? _deepSeekOptions.ReasoningEffort
                : null,
            // Khi bật thinking, không set temperature (để null để tránh conflict)
            Temperature = _deepSeekOptions.EnableThinking ? null : 0.0,
            Stream = false
        };

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

        return chatResponse?.Choices?.FirstOrDefault()?.Message?.Content;
    }

    /// <summary>
    /// Fallback an toàn: luôn trả NeedsReview với Source = Fallback.
    /// Không bao giờ trả Approved hay Rejected khi LLM không hoạt động đúng.
    /// </summary>
    private static ModerationDecisionResult BuildFallback(string reason) => new()
    {
        Status = ModerationStatus.NeedsReview,
        Source = ModerationSource.Fallback,
        Reason = null,
        InternalReasonCode = $"llm_unavailable:{reason}",
    };

    private static string TruncateForLog(string s) =>
        s.Length <= 200 ? s : string.Concat(s.AsSpan(0, 200), "...");
}
