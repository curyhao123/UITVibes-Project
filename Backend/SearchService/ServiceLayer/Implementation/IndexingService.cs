using Microsoft.Extensions.Options;
using Pgvector;
using SearchService.Configurations;
using SearchService.DTOs;
using SearchService.Enums;
using SearchService.Models;
using SearchService.ServiceLayer.Interface;

namespace SearchService.ServiceLayer.Implementation;

public class IndexingService : IIndexingService
{
    private readonly IPostContentRpcClient _postContent;
    private readonly IPostChunkRepository _repository;
    private readonly IChunker _chunker;
    private readonly IEmbeddingClient _embedding;
    private readonly EmbeddingOptions _embeddingOptions;
    private readonly ILogger<IndexingService> _logger;

    public IndexingService(
        IPostContentRpcClient postContent,
        IPostChunkRepository repository,
        IChunker chunker,
        IEmbeddingClient embedding,
        IOptions<EmbeddingOptions> embeddingOptions,
        ILogger<IndexingService> logger)
    {
        _postContent = postContent;
        _repository = repository;
        _chunker = chunker;
        _embedding = embedding;
        _embeddingOptions = embeddingOptions.Value;
        _logger = logger;
    }

    public async Task<IndexOutcome> IndexAsync(Guid targetId, ChunkTargetType targetType, CancellationToken ct = default)
    {
        var response = await _postContent.GetAsync(targetId, targetType, ct)
            ?? throw new TimeoutException($"PostService did not answer search.post.get for {targetType} {targetId}");

        if (!response.Found || response.Document is null)
        {
            await _repository.RemoveAsync(targetId, targetType, ct);
            return IndexOutcome.Removed;
        }

        return await IndexDocumentAsync(response.Document, ct);
    }

    public async Task<IndexOutcome> IndexDocumentAsync(SearchPostDocument document, CancellationToken ct = default)
    {
        if (!Enum.TryParse<ChunkTargetType>(document.TargetType, ignoreCase: true, out var targetType))
            throw new ArgumentException($"Unsupported target type '{document.TargetType}'", nameof(document));

        var text = string.IsNullOrWhiteSpace(document.OcrText)
            ? document.Content
            : document.Content + "\n" + document.OcrText;
        var chunks = document.Searchable ? _chunker.Chunk(text, document.Hashtags) : [];

        if (chunks.Count == 0)
        {
            await _repository.RemoveAsync(document.TargetId, targetType, ct);
            return IndexOutcome.Removed;
        }

        var vectors = await _embedding.EmbedAsync(chunks, ct);
        var now = DateTime.UtcNow;
        var rows = chunks.Select((content, i) => new PostChunk
        {
            Id = Guid.NewGuid(),
            TargetId = document.TargetId,
            TargetType = targetType,
            ChunkIndex = i,
            Content = content,
            Embedding = new Vector(vectors[i]),
            AuthorId = document.AuthorId,
            Visibility = (ChunkVisibility)document.Visibility,
            Hashtags = document.Hashtags,
            CreatedAt = DateTime.SpecifyKind(document.CreatedAt, DateTimeKind.Utc),
            IndexedAt = now,
            EmbeddingModel = _embeddingOptions.Model
        }).ToList();

        await _repository.ReplaceAsync(document.TargetId, targetType, rows, ct);
        _logger.LogInformation("Indexed {TargetType} {TargetId} into {Count} chunks",
            targetType, document.TargetId, rows.Count);
        return IndexOutcome.Indexed;
    }
}
