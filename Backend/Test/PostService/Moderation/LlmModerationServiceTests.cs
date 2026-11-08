using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho LlmModerationService — xác nhận luồng:
///   Rule filter chặn → KHÔNG gọi LLM (không tốn token, không phụ thuộc model).
///   Nội dung sạch → gọi LLM và áp dụng quyết định của evaluator.
///
/// Dùng handler HTTP giả để assert "LLM có/không được gọi".
/// </summary>
public class LlmModerationServiceTests
{
    /// <summary>Handler giả — ghi nhận số lần được gọi và trả về response tuỳ ý.</summary>
    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        public int CallCount { get; private set; }
        public string ResponseBody { get; set; } =
            """{"decision":"approve","categories":[],"severity":0,"confidence":0.95,"reason":null}""";

        /// <summary>Body request cuối cùng gửi lên DeepSeek — dùng để assert payload.</summary>
        public string? LastRequestBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            CallCount++;

            LastRequestBody = request.Content is null
                ? null
                : await request.Content.ReadAsStringAsync(cancellationToken);

            var escaped = System.Text.Json.JsonSerializer.Serialize(ResponseBody);

            var payload = "{\"choices\":[{\"index\":0,\"message\":{\"role\":\"assistant\",\"content\":" + escaped + "}}]}";

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };
        }
    }

    private static (LlmModerationService Service, FakeHttpMessageHandler Handler) CreateService(
        List<string>? profanityTerms = null)
    {
        var handler = new FakeHttpMessageHandler();

        var httpClientFactory = new TestHttpClientFactory(handler);

        var ruleOptions = Options.Create(new ModerationRuleOptions
        {
            Enabled = true,
            ProfanityTerms = profanityTerms ?? ["fuck", "shit"],
            ProfanityReviewTerms = ["cac ma dien"],
            ProfanitySeverity = 2,
            ProfanityReviewSeverity = 1,
            RuleConfidence = 1.0
        });

        var moderationOptions = Options.Create(new ModerationOptions
        {
            ApproveMinConfidence = 0.70,
            RejectMinConfidence = 0.80,
            ApproveMaxSeverity = 1,
            RejectMinSeverity = 2,
            AlwaysReviewCategories = ["self_harm"],
        });

        var deepSeekOptions = Options.Create(new DeepSeekOptions
        {
            ApiKey = "test-key",
            BaseUrl = "https://api.deepseek.com",
            Model = "deepseek-flash",
            EnableThinking = true,
            ReasoningEffort = "high",
            TimeoutSeconds = 45,
            MaxCompletionTokens = 4096,
            InputCostPer1MTokensUsd = 0.14,
            OutputCostPer1MTokensUsd = 0.28
        });

        var routingOptions = Options.Create(new ModerationRoutingOptions { Enabled = false });
        var shadowOptions = Options.Create(new ModerationShadowOptions { Enabled = false });

        var service = new LlmModerationService(
            httpClientFactory,
            new ModerationPromptBuilder(NullLogger<ModerationPromptBuilder>.Instance),
            new ModerationResponseParser(NullLogger<ModerationResponseParser>.Instance),
            new ModerationDecisionEvaluator(moderationOptions),
            new ModerationRuleFilter(ruleOptions, moderationOptions, NullLogger<ModerationRuleFilter>.Instance),
            deepSeekOptions,
            routingOptions,
            shadowOptions,
            new ModerationMetrics(),
            NullLogger<LlmModerationService>.Instance);

        return (service, handler);
    }

    private sealed class TestHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;

        public TestHttpClientFactory(HttpMessageHandler handler) => _handler = handler;

        public HttpClient CreateClient(string name)
        {
            var client = new HttpClient(_handler, disposeHandler: false);

            // BaseAddress bắt buộc vì LlmModerationService gọi bằng URI tương đối
            // ("/chat/completions").
            client.BaseAddress = new Uri("https://api.deepseek.com");

            return client;
        }
    }

    // ── Rule chặn trước LLM ──────────────────────────────────────────────────

    [Fact]
    public async Task ModerateAsync_WhenContentHasProfanity_RejectsWithoutCallingLlm()
    {
        var (service, handler) = CreateService();

        var result = await service.ModerateAsync("fuck", ModerationTargetType.Reel, Guid.NewGuid());

        Assert.Equal(ModerationStatus.Rejected, result.Status);
        Assert.Equal(ModerationSource.Rule, result.Source);
        Assert.Equal("rule_profanity", result.InternalReasonCode);

        // Quan trọng nhất: LLM KHÔNG được gọi → vi phạm không thể lọt qua
        // dù model "hôm nay trả lời lạ".
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task ModerateAsync_WhenAmbiguousProfanity_RoutesToNeedsReviewWithoutCallingLlm()
    {
        var (service, handler) = CreateService();

        var result = await service.ModerateAsync("cac ma dien", ModerationTargetType.Reel, Guid.NewGuid());

        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal(ModerationSource.Rule, result.Source);
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task ModerateAsync_WhenProfanityIsCleanContent_CallsLlmAndAppliesDecision()
    {
        var (service, handler) = CreateService();

        var result = await service.ModerateAsync("Một ngày đẹp trời", ModerationTargetType.Post, Guid.NewGuid());

        Assert.Equal(ModerationStatus.Approved, result.Status);
        Assert.Equal(ModerationSource.Llm, result.Source);
        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public async Task ModerateAsync_WhenLlmReturnsReject_AppliesRejectDecision()
    {
        var (service, handler) = CreateService();
        handler.ResponseBody =
            """{"decision":"reject","categories":["harassment"],"severity":3,"confidence":0.95,"reason":"Harassing content."}""";

        var result = await service.ModerateAsync("nội dung công kích", ModerationTargetType.Post, Guid.NewGuid());

        Assert.Equal(ModerationStatus.Rejected, result.Status);
        Assert.Equal(ModerationSource.Llm, result.Source);
        Assert.Equal("llm_reject", result.InternalReasonCode);
    }

    [Fact]
    public async Task ModerateAsync_WhenLlmFails_ReturnsFallbackToNeedsReview()
    {
        var (service, handler) = CreateService();
        handler.ResponseBody = "not json at all";

        var result = await service.ModerateAsync("nội dung bình thường", ModerationTargetType.Post, Guid.NewGuid());

        // Fail-safe: không bao giờ approve khi LLM lỗi.
        Assert.Equal(ModerationStatus.NeedsReview, result.Status);
        Assert.Equal(ModerationSource.Fallback, result.Source);
    }

    [Fact]
    public async Task ModerateAsync_AlwaysSendsZeroTemperature()
    {
        // Regression: bỏ temperature khi bật thinking → DeepSeek dùng mặc định (~1.0)
        // → không tất định → model bịa confidence 0.8–0.9 để approve nội dung vi phạm.
        var (service, handler) = CreateService();

        await service.ModerateAsync("nội dung bình thường", ModerationTargetType.Post, Guid.NewGuid());

        Assert.NotNull(handler.LastRequestBody);
        Assert.Contains("\"temperature\":0", handler.LastRequestBody!);
    }
}
