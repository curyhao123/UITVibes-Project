using SearchService.DTOs;
using SearchService.Enums;
using SearchService.ServiceLayer.Interface;

namespace SearchService.ServiceLayer.Implementation;

/// <summary>Backfill toàn bộ Post/Reel: phân trang export RPC, index lại từng bài, rồi xoá đoạn không còn tồn tại.</summary>
public class ReindexJob : IReindexJob
{
    public const int PageSize = 100;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHostApplicationLifetime _lifetime;
    private readonly ILogger<ReindexJob> _logger;
    private readonly object _lock = new();
    private ReindexStatusDto _status = new(false, null, null, 0, 0, 0, 0, null);

    public ReindexJob(IServiceScopeFactory scopeFactory, IHostApplicationLifetime lifetime, ILogger<ReindexJob> logger)
    {
        _scopeFactory = scopeFactory;
        _lifetime = lifetime;
        _logger = logger;
    }

    public bool TryStart()
    {
        lock (_lock)
        {
            if (_status.Running) return false;
            _status = new ReindexStatusDto(true, DateTime.UtcNow, null, 0, 0, 0, 0, null);
        }

        _ = Task.Run(() => RunSafeAsync(_lifetime.ApplicationStopping));
        return true;
    }

    public ReindexStatusDto GetStatus()
    {
        lock (_lock) return _status;
    }

    private async Task RunSafeAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            await RunAsync(
                scope.ServiceProvider.GetRequiredService<IPostContentRpcClient>(),
                scope.ServiceProvider.GetRequiredService<IIndexingService>(),
                scope.ServiceProvider.GetRequiredService<IPostChunkRepository>(),
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reindex job failed");
            Update(s => s with { LastError = ex.Message });
        }
        finally
        {
            Update(s => s with { Running = false, FinishedAt = DateTime.UtcNow });
            _logger.LogInformation("Reindex job finished: {@Status}", GetStatus());
        }
    }

    public async Task RunAsync(
        IPostContentRpcClient postContent, IIndexingService indexing, IPostChunkRepository repository, CancellationToken ct)
    {
        var startedAt = GetStatus().StartedAt ?? DateTime.UtcNow;

        foreach (var targetType in new[] { ChunkTargetType.Post, ChunkTargetType.Reel })
        {
            DateTime? afterCreatedAt = null;
            Guid? afterId = null;
            bool hasMore;
            do
            {
                var page = await postContent.ExportAsync(targetType, afterCreatedAt, afterId, PageSize, ct)
                    ?? throw new TimeoutException($"PostService did not answer search.post.export for {targetType}");

                foreach (var document in page.Items)
                {
                    try
                    {
                        var outcome = await indexing.IndexDocumentAsync(document, ct);
                        Update(s => outcome == IndexOutcome.Indexed
                            ? s with { Indexed = s.Indexed + 1 }
                            : s with { Removed = s.Removed + 1 });
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        _logger.LogWarning(ex, "Reindex failed for {TargetType} {TargetId}", targetType, document.TargetId);
                        Update(s => s with { Failed = s.Failed + 1, LastError = ex.Message });
                    }
                }

                if (page.Items.Count > 0)
                {
                    afterCreatedAt = page.Items[^1].CreatedAt;
                    afterId = page.Items[^1].TargetId;
                }
                hasMore = page.HasMore && page.Items.Count > 0;
            } while (hasMore);
        }

        // Chỉ dọn khi chạy trọn vẹn: đoạn nào không được index lại nghĩa là bài đã bị xoá/ẩn/từ chối.
        if (GetStatus().Failed == 0)
        {
            var stale = await repository.RemoveIndexedBeforeAsync(startedAt, ct);
            Update(s => s with { StaleRemoved = stale });
        }
    }

    private void Update(Func<ReindexStatusDto, ReindexStatusDto> change)
    {
        lock (_lock) _status = change(_status);
    }
}
