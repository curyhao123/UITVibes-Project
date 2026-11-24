using Pgvector;
using SearchService.Enums;

namespace SearchService.Models;

public class PostChunk
{
    public Guid Id { get; set; }
    public Guid TargetId { get; set; }
    public ChunkTargetType TargetType { get; set; }
    public int ChunkIndex { get; set; }
    public string Content { get; set; } = string.Empty;
    public Vector? Embedding { get; set; }
    public NpgsqlTypes.NpgsqlTsVector? SearchTsv { get; set; }
    public Guid AuthorId { get; set; }
    public ChunkVisibility Visibility { get; set; } = ChunkVisibility.Public;
    public List<string> Hashtags { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime IndexedAt { get; set; } = DateTime.UtcNow;
    public string EmbeddingModel { get; set; } = string.Empty;
}
