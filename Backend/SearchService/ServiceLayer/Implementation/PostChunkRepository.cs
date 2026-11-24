using Microsoft.EntityFrameworkCore;
using SearchService.Enums;
using SearchService.Models;
using SearchService.ServiceLayer.Interface;

namespace SearchService.ServiceLayer.Implementation;

public class PostChunkRepository : IPostChunkRepository
{
    private readonly SearchDbContext _db;

    public PostChunkRepository(SearchDbContext db)
    {
        _db = db;
    }

    public async Task ReplaceAsync(
        Guid targetId, ChunkTargetType targetType, IReadOnlyList<PostChunk> chunks, CancellationToken ct = default)
    {
        // Aspire bật retry-on-failure nên transaction tự mở phải chạy trong execution strategy.
        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            _db.ChangeTracker.Clear();
            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            await _db.PostChunks
                .Where(c => c.TargetId == targetId && c.TargetType == targetType)
                .ExecuteDeleteAsync(ct);
            _db.PostChunks.AddRange(chunks);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });
        _db.ChangeTracker.Clear();
    }

    public Task<int> RemoveAsync(Guid targetId, ChunkTargetType targetType, CancellationToken ct = default) =>
        _db.PostChunks
            .Where(c => c.TargetId == targetId && c.TargetType == targetType)
            .ExecuteDeleteAsync(ct);

    public Task<int> RemoveIndexedBeforeAsync(DateTime cutoff, CancellationToken ct = default) =>
        _db.PostChunks.Where(c => c.IndexedAt < cutoff).ExecuteDeleteAsync(ct);
}
