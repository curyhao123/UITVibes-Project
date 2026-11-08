using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SearchService.Configurations;
using SearchService.DTOs.Tei;
using SearchService.Exceptions;
using SearchService.ServiceLayer.Interface;

namespace SearchService.ServiceLayer.Implementation;

public class TeiEmbeddingClient : IEmbeddingClient
{
    public const string HttpClientName = "TeiEmbedding";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly EmbeddingOptions _options;
    private readonly ILogger<TeiEmbeddingClient> _logger;

    public TeiEmbeddingClient(
        IHttpClientFactory httpClientFactory,
        IOptions<EmbeddingOptions> options,
        ILogger<TeiEmbeddingClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public int Dimensions => _options.Dimensions;

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var result = await EmbedAsync(new[] { text }, ct);
        return result[0];
    }

    public async Task<IReadOnlyList<float[]>> EmbedAsync(IReadOnlyList<string> texts, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(texts);

        if (texts.Count == 0)
            return Array.Empty<float[]>();

        for (var i = 0; i < texts.Count; i++)
        {
            if (string.IsNullOrWhiteSpace(texts[i]))
                throw new ArgumentException($"Text at index {i} is empty.", nameof(texts));
        }

        var client = _httpClientFactory.CreateClient(HttpClientName);
        var vectors = new List<float[]>(texts.Count);

        foreach (var batch in texts.Chunk(_options.MaxBatchSize))
        {
            var batchVectors = await SendBatchAsync(client, batch, ct);
            vectors.AddRange(batchVectors);
        }

        return vectors;
    }

    private async Task<float[][]> SendBatchAsync(HttpClient client, string[] batch, CancellationToken ct)
    {
        // truncate = true: đoạn dài hơn giới hạn token của model bị cắt thay vì trả 413.
        var request = new TeiEmbedRequest(batch, _options.Normalize, Truncate: true);

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsJsonAsync("embed", request, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Embedding request to TEI failed (batch size {Count})", batch.Length);
            throw new EmbeddingServiceException("Embedding server is unreachable or timed out.", ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("TEI /embed returned {Status}: {Body}", (int)response.StatusCode, body);
                throw new EmbeddingServiceException($"Embedding server returned HTTP {(int)response.StatusCode}.");
            }

            float[][]? vectors;
            try
            {
                vectors = await response.Content.ReadFromJsonAsync<float[][]>(cancellationToken: ct);
            }
            catch (JsonException ex)
            {
                throw new EmbeddingServiceException("Embedding server returned invalid JSON.", ex);
            }

            if (vectors is null || vectors.Length != batch.Length)
            {
                throw new EmbeddingServiceException(
                    $"Embedding server returned {vectors?.Length ?? 0} vectors for {batch.Length} inputs.");
            }

            foreach (var vector in vectors)
            {
                if (vector is null || vector.Length != _options.Dimensions)
                {
                    throw new EmbeddingServiceException(
                        $"Expected {_options.Dimensions}-dimension vectors but got {vector?.Length ?? 0}. " +
                        "Check that TEI is running the configured model.");
                }
            }

            return vectors;
        }
    }
}
