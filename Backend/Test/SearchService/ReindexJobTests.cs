using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SearchService.DTOs;
using SearchService.Enums;
using SearchService.ServiceLayer.Implementation;
using SearchService.ServiceLayer.Interface;

namespace Test.SearchService;

public class ReindexJobTests
{
    private readonly Mock<IPostContentRpcClient> _rpc = new();
    private readonly Mock<IIndexingService> _indexing = new();
    private readonly Mock<IPostChunkRepository> _repo = new();
    private readonly ReindexJob _job = new(
        Mock.Of<IServiceScopeFactory>(), Mock.Of<IHostApplicationLifetime>(), NullLogger<ReindexJob>.Instance);

    private static SearchPostDocument Doc(string type, int minute) => new()
    {
        TargetId = Guid.NewGuid(),
        TargetType = type,
        Searchable = true,
        CreatedAt = new DateTime(2026, 11, 1, 0, minute, 0, DateTimeKind.Utc)
    };

    [Fact]
    public async Task RunAsync_PagesWithKeysetCursor_IndexesAll_AndSweepsStaleRows()
    {
        var page1 = new[] { Doc("Post", 1), Doc("Post", 2) };
        var page2 = new[] { Doc("Post", 3) };
        _rpc.Setup(r => r.ExportAsync(ChunkTargetType.Post, null, null, ReindexJob.PageSize, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchPostExportRpcResponse { Items = page1.ToList(), HasMore = true });
        _rpc.Setup(r => r.ExportAsync(ChunkTargetType.Post, page1[1].CreatedAt, page1[1].TargetId, ReindexJob.PageSize, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchPostExportRpcResponse { Items = page2.ToList(), HasMore = false });
        _rpc.Setup(r => r.ExportAsync(ChunkTargetType.Reel, null, null, ReindexJob.PageSize, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchPostExportRpcResponse());
        _indexing.Setup(i => i.IndexDocumentAsync(It.IsAny<SearchPostDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(IndexOutcome.Indexed);
        _repo.Setup(r => r.RemoveIndexedBeforeAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).ReturnsAsync(4);

        await _job.RunAsync(_rpc.Object, _indexing.Object, _repo.Object, CancellationToken.None);

        _indexing.Verify(i => i.IndexDocumentAsync(It.IsAny<SearchPostDocument>(), It.IsAny<CancellationToken>()), Times.Exactly(3));
        var status = _job.GetStatus();
        Assert.Equal(3, status.Indexed);
        Assert.Equal(4, status.StaleRemoved);
    }

    [Fact]
    public async Task RunAsync_WhenAnItemFails_ContinuesAndSkipsStaleSweep()
    {
        var docs = new[] { Doc("Post", 1), Doc("Post", 2) };
        _rpc.Setup(r => r.ExportAsync(ChunkTargetType.Post, null, null, ReindexJob.PageSize, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchPostExportRpcResponse { Items = docs.ToList() });
        _rpc.Setup(r => r.ExportAsync(ChunkTargetType.Reel, null, null, ReindexJob.PageSize, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchPostExportRpcResponse());
        _indexing.Setup(i => i.IndexDocumentAsync(docs[0], It.IsAny<CancellationToken>())).ThrowsAsync(new InvalidOperationException("boom"));
        _indexing.Setup(i => i.IndexDocumentAsync(docs[1], It.IsAny<CancellationToken>())).ReturnsAsync(IndexOutcome.Indexed);

        await _job.RunAsync(_rpc.Object, _indexing.Object, _repo.Object, CancellationToken.None);

        var status = _job.GetStatus();
        Assert.Equal(1, status.Indexed);
        Assert.Equal(1, status.Failed);
        Assert.Equal("boom", status.LastError);
        _repo.Verify(r => r.RemoveIndexedBeforeAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_ExportTimeout_Throws()
    {
        _rpc.Setup(r => r.ExportAsync(It.IsAny<ChunkTargetType>(), It.IsAny<DateTime?>(), It.IsAny<Guid?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SearchPostExportRpcResponse?)null);

        await Assert.ThrowsAsync<TimeoutException>(() =>
            _job.RunAsync(_rpc.Object, _indexing.Object, _repo.Object, CancellationToken.None));
    }
}
