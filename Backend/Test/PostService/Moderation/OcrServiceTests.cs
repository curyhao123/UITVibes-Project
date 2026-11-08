using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho <see cref="OcrService"/> — OCR ảnh cho kiểm duyệt (Phase 3.0).
///
/// Hành vi cần bảo vệ:
///   1. OCR tắt → không gọi provider, trả về chuỗi rỗng.
///   2. Provider trả text → trả về text đã chuẩn hoá (bỏ khoảng trắng thừa).
///   3. Provider lỗi / trả rỗng → trả về null, KHÔNG ném exception.
///   4. Cache theo URL → lần gọi thứ hai không gọi provider lần nữa.
///   5. Nhiều ảnh → ghép text, giới hạn số ảnh và độ dài.
/// </summary>
public class OcrServiceTests
{
    [Fact]
    public async Task ExtractTextAsync_WhenDisabled_ReturnsNull()
    {
        var handler = new StubHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent.Create(new { text = "hello" })
        });

        var service = CreateService(handler, enabled: false);

        var text = await service.ExtractTextAsync("https://example.com/a.jpg");

        Assert.Null(text);
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task ExtractTextAsync_WhenProviderReturnsText_NormalizesWhitespace()
    {
        var handler = new StubHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent.Create(new { text = "  De   thi   \n\n  mat  " })
        });

        var service = CreateService(handler);

        var text = await service.ExtractTextAsync("https://example.com/a.jpg");

        Assert.NotNull(text);
        Assert.Equal("De thi mat", text);
    }

    [Fact]
    public async Task ExtractTextAsync_WhenProviderFails_ReturnsNullWithoutThrowing()
    {
        var handler = new StubHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError));

        var service = CreateService(handler);

        var text = await service.ExtractTextAsync("https://example.com/a.jpg");

        Assert.Null(text);
    }

    [Fact]
    public async Task ExtractTextAsync_WhenProviderThrows_ReturnsNullWithoutThrowing()
    {
        var handler = new StubHttpHandler(_ => throw new HttpRequestException("network down"));

        var service = CreateService(handler);

        var text = await service.ExtractTextAsync("https://example.com/a.jpg");

        Assert.Null(text);
    }

    [Fact]
    public async Task ExtractTextAsync_CachesResultPerUrl()
    {
        var handler = new StubHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent.Create(new { text = "cached text" })
        });

        var service = CreateService(handler);

        var first = await service.ExtractTextAsync("https://example.com/a.jpg");
        var second = await service.ExtractTextAsync("https://example.com/a.jpg");

        Assert.Equal("cached text", first);
        Assert.Equal("cached text", second);
        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public async Task ExtractTextFromImagesAsync_CombinesTextsAndRespectsLimits()
    {
        var handler = new StubHttpHandler(req =>
        {
            var url = req.Content!.ReadAsStringAsync().Result;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(new { text = $"text of {url}" })
            };
        });

        var service = CreateService(handler, maxImagesPerContent: 2);

        var combined = await service.ExtractTextFromImagesAsync(new[]
        {
            "https://example.com/1.jpg",
            "https://example.com/2.jpg",
            "https://example.com/3.jpg"
        });

        Assert.Equal(2, handler.CallCount);
        Assert.Contains("1.jpg", combined);
        Assert.Contains("2.jpg", combined);
        Assert.DoesNotContain("3.jpg", combined);
    }

    [Fact]
    public async Task ExtractTextFromImagesAsync_WhenNoImages_ReturnsEmptyString()
    {
        var handler = new StubHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));

        var service = CreateService(handler);

        var combined = await service.ExtractTextFromImagesAsync(Array.Empty<string>());

        Assert.Equal(string.Empty, combined);
        Assert.Equal(0, handler.CallCount);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static OcrService CreateService(
        HttpMessageHandler handler,
        bool enabled = true,
        int maxImagesPerContent = 3)
    {
        var httpClient = new HttpClient(handler);

        return new OcrService(
            httpClient,
            new MemoryCache(new MemoryCacheOptions()),
            Options.Create(new ModerationOcrOptions
            {
                Enabled = enabled,
                Endpoint = "https://ocr.example.com/extract",
                TimeoutSeconds = 5,
                CacheTtlHours = 1,
                MaxImagesPerContent = maxImagesPerContent,
                MaxOcrChars = 2000
            }),
            NullLogger<OcrService>.Instance);
    }

    private sealed class StubHttpHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public StubHttpHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        {
            _responder = responder;
        }

        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            CallCount++;
            return Task.FromResult(_responder(request));
        }
    }
}
