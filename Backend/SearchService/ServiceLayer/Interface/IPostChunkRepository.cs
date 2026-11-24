using SearchService.Enums;
using SearchService.Models;

namespace SearchService.ServiceLayer.Interface;

public interface IPostChunkRepository
{
    /// <summary>Xoá các đoạn cũ của target rồi ghi các đoạn mới trong một transaction.</summary>
    Task ReplaceAsync(Guid targetId, ChunkTargetType targetType, IReadOnlyList<PostChunk> chunks, CancellationToken ct = default);

    Task<int> RemoveAsync(Guid targetId, ChunkTargetType targetType, CancellationToken ct = default);

    Task<int> RemoveIndexedBeforeAsync(DateTime cutoff, CancellationToken ct = default);
}
