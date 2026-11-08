using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Hiện thực OCR qua HTTP provider (Phase 3.0).
///
/// Provider nhận POST JSON <c>{ "url": "..." }</c> và trả về
/// <c>{ "text": "..." }</c>. Kết quả được cache theo URL ảnh trong
/// <see cref="IMemoryCache"/> để không OCR lại cùng một ảnh.
///
/// Mọi lỗi đều bị nuốt và trả về null — OCR là bước bổ trợ, lỗi OCR
/// không được làm hỏng luồng đăng nội dung của người dùng.
/// </summary>
public class OcrService : IOcrService
{
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly ModerationOcrOptions _options;
    private readonly ILogger<OcrService> _logger;

    public OcrService(
        HttpClient httpClient,
        IMemoryCache cache,
        IOptions<ModerationOcrOptions> options,
        ILogger<OcrService> logger)
    {
        _httpClient = httpClient;
        _cache = cache;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsEnabled => _options.Enabled && !string.IsNullOrWhiteSpace(_options.Endpoint);

    public async Task<string?> ExtractTextAsync(
        string imageUrl,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || string.IsNullOrWhiteSpace(imageUrl))
            return null;

        var cacheKey = $"ocr:{imageUrl}";
        if (_cache.TryGetValue<string>(cacheKey, out var cached))
            return cached;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, _options.Endpoint)
            {
                Content = JsonContent.Create(new OcrRequest(imageUrl))
            };

            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
                request.Headers.TryAddWithoutValidation("X-Api-Key", _options.ApiKey);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            var response = await _httpClient.SendAsync(request, cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "OCR provider returned {StatusCode} for image {ImageUrl}.",
                    (int)response.StatusCode, imageUrl);
                return null;
            }

            var result = await response.Content.ReadFromJsonAsync<OcrResponse>(cts.Token);
            var text = Normalize(result?.Text);

            if (text.Length == 0)
                return null;

            _cache.Set(cacheKey, text, TimeSpan.FromHours(_options.CacheTtlHours));

            _logger.LogInformation(
                "OCR extracted {Length} characters from image {ImageUrl}.", text.Length, imageUrl);

            return text;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // OCR là best-effort — provider lỗi không được ảnh hưởng luồng chính.
            _logger.LogWarning(ex, "OCR failed for image {ImageUrl}.", imageUrl);
            return null;
        }
    }

    public async Task<string> ExtractTextFromImagesAsync(
        IEnumerable<string> imageUrls,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
            return string.Empty;

        var urls = imageUrls
            .Where(u => !string.IsNullOrWhiteSpace(u))
            .Distinct()
            .Take(Math.Max(1, _options.MaxImagesPerContent))
            .ToList();

        if (urls.Count == 0)
            return string.Empty;

        var texts = new List<string>();

        foreach (var url in urls)
        {
            var text = await ExtractTextAsync(url, cancellationToken);
            if (!string.IsNullOrWhiteSpace(text))
                texts.Add(text);
        }

        if (texts.Count == 0)
            return string.Empty;

        var combined = string.Join("\n\n", texts);

        if (combined.Length > _options.MaxOcrChars)
            combined = combined[.._options.MaxOcrChars];

        return combined;
    }

    private static string Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;

        // Gộp khoảng trắng liên tục (OCR hay sinh nhiều space/newline thừa).
        var builder = new StringBuilder(text.Length);
        var lastWasWhitespace = false;

        foreach (var ch in text)
        {
            var isWhitespace = char.IsWhiteSpace(ch);
            if (isWhitespace)
            {
                if (!lastWasWhitespace)
                    builder.Append(' ');
            }
            else
            {
                builder.Append(ch);
            }

            lastWasWhitespace = isWhitespace;
        }

        return builder.ToString().Trim();
    }

    private sealed record OcrRequest(
        [property: JsonPropertyName("url")] string Url);

    private sealed record OcrResponse(
        [property: JsonPropertyName("text")] string? Text);
}
