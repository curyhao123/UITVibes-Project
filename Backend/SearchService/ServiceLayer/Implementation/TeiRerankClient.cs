using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SearchService.Configurations;
using SearchService.DTOs;
using SearchService.DTOs.Tei;
using SearchService.Exceptions;
using SearchService.ServiceLayer.Interface;

namespace SearchService.ServiceLayer.Implementation;

public class TeiRerankClient : IRerankClient
{
    public const string HttpClientName = "TeiRerank";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly RerankOptions _options;
    private readonly ILogger<TeiRerankClient> _logger;

    public TeiRerankClient(
        IHttpClientFactory httpClientFactory,
        IOptions<RerankOptions> options,
        ILogger<TeiRerankClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<RerankResult>> RerankAsync(
        string query,
        IReadOnlyList<string> texts,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            throw new ArgumentException("Query is empty.", nameof(query));
        ArgumentNullException.ThrowIfNull(texts);

        if (texts.Count == 0)
            return Array.Empty<RerankResult>();

        if (texts.Count > _options.MaxTexts)
            throw new ArgumentException($"At most {_options.MaxTexts} texts can be reranked at once.", nameof(texts));

        var client = _httpClientFactory.CreateClient(HttpClientName);

        // raw_scores = false → TEI trả điểm đã qua sigmoid (0–1), dễ đặt ngưỡng hơn logit thô.
        var request = new TeiRerankRequest(query, texts, Truncate: true, RawScores: false);

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsJsonAsync("rerank", request, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Rerank request to TEI failed ({Count} texts)", texts.Count);
            throw new EmbeddingServiceException("Rerank server is unreachable or timed out.", ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("TEI /rerank returned {Status}: {Body}", (int)response.StatusCode, body);
                throw new EmbeddingServiceException($"Rerank server returned HTTP {(int)response.StatusCode}.");
            }

            List<TeiRerankItem>? items;
            try
            {
                items = await response.Content.ReadFromJsonAsync<List<TeiRerankItem>>(cancellationToken: ct);
            }
            catch (JsonException ex)
            {
                throw new EmbeddingServiceException("Rerank server returned invalid JSON.", ex);
            }

            if (items is null || items.Count != texts.Count)
            {
                throw new EmbeddingServiceException(
                    $"Rerank server returned {items?.Count ?? 0} scores for {texts.Count} texts.");
            }

            if (items.Any(i => i.Index < 0 || i.Index >= texts.Count) ||
                items.Select(i => i.Index).Distinct().Count() != items.Count)
            {
                throw new EmbeddingServiceException("Rerank server returned out-of-range or duplicate indexes.");
            }

            return items
                .OrderByDescending(i => i.Score)
                .Select(i => new RerankResult(i.Index, i.Score))
                .ToList();
        }
    }
}
