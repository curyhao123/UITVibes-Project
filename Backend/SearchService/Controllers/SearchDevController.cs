using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using SearchService.DTOs;
using SearchService.Exceptions;
using SearchService.ServiceLayer.Interface;

namespace SearchService.Controllers;

/// <summary>Endpoint thử TEI (embed, rerank, đo độ trễ), chỉ bật ở Development.</summary>
[ApiController]
[Route("api/search/dev")]
public class SearchDevController : ControllerBase
{
    private readonly IEmbeddingClient _embeddingClient;
    private readonly IRerankClient _rerankClient;
    private readonly IWebHostEnvironment _environment;

    public SearchDevController(
        IEmbeddingClient embeddingClient,
        IRerankClient rerankClient,
        IWebHostEnvironment environment)
    {
        _embeddingClient = embeddingClient;
        _rerankClient = rerankClient;
        _environment = environment;
    }

    [HttpPost("embed")]
    public async Task<IActionResult> Embed([FromBody] DevEmbedRequest request, CancellationToken ct)
    {
        if (!_environment.IsDevelopment())
            return NotFound();

        if (request.Texts.Count == 0 || request.Texts.Any(string.IsNullOrWhiteSpace))
            return BadRequest(new { message = "Texts must be a non-empty list of non-empty strings." });

        try
        {
            var stopwatch = Stopwatch.StartNew();
            var vectors = await _embeddingClient.EmbedAsync(request.Texts, ct);
            stopwatch.Stop();

            var similarity = vectors
                .Select(a => vectors.Select(b => Math.Round(CosineSimilarity(a, b), 4)).ToArray())
                .ToArray();

            return Ok(new
            {
                dimensions = _embeddingClient.Dimensions,
                elapsedMs = stopwatch.ElapsedMilliseconds,
                preview = vectors.Select(v => v.Take(5)).ToArray(),
                cosineSimilarity = similarity
            });
        }
        catch (EmbeddingServiceException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }
    }

    [HttpPost("rerank")]
    public async Task<IActionResult> Rerank([FromBody] DevRerankRequest request, CancellationToken ct)
    {
        if (!_environment.IsDevelopment())
            return NotFound();

        if (string.IsNullOrWhiteSpace(request.Query) || request.Texts.Count == 0)
            return BadRequest(new { message = "Query and texts are required." });

        try
        {
            var stopwatch = Stopwatch.StartNew();
            var results = await _rerankClient.RerankAsync(request.Query, request.Texts, ct);
            stopwatch.Stop();

            return Ok(new
            {
                elapsedMs = stopwatch.ElapsedMilliseconds,
                results = results.Select(r => new { r.Index, r.Score, text = request.Texts[r.Index] })
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (EmbeddingServiceException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }
    }

    private static double CosineSimilarity(float[] a, float[] b)
    {
        double dot = 0, normA = 0, normB = 0;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return normA == 0 || normB == 0 ? 0 : dot / (Math.Sqrt(normA) * Math.Sqrt(normB));
    }
}
