using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using SearchService.Configurations;
using SearchService.DTOs;
using SearchService.Enums;
using SearchService.Exceptions;
using SearchService.Models;
using SearchService.ServiceLayer.Implementation;
using SearchService.ServiceLayer.Interface;

namespace Test.SearchService;

public class IndexingServiceTests
{
    private readonly Mock<IPostContentRpcClient> _rpc = new();
    private readonly Mock<IPostChunkRepository> _repo = new();
    private readonly Mock<IEmbeddingClient> _embedding = new();
    private readonly IndexingService _service;

    public IndexingServiceTests()
    {
        _embedding
            .Setup(e => e.EmbedAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<string> texts, CancellationToken _) =>
                texts.Select(_ => new float[] { 1, 0, 0 }).ToList());

        var chunker = new Chunker(Options.Create(new ChunkingOptions { MaxChunkChars = 200, OverlapChars = 0 }));
        _service = new IndexingService(
            _rpc.Object, _repo.Object, chunker, _embedding.Object,
            Options.Create(new EmbeddingOptions { Model = "BAAI/bge-m3" }),
            NullLogger<IndexingService>.Instance);
    }

    private static SearchPostDocument Doc(bool searchable = true, string content = "Lịch thi cuối kỳ bắt đầu 15/12.") => new()
    {
        TargetId = Guid.NewGuid(),
        TargetType = "Post",
        AuthorId = Guid.NewGuid(),
        Content = content,
        OcrText = "PHÒNG ĐÀO TẠO",
        Hashtags = ["thi"],
        Visibility = 1,
        Searchable = searchable,
        CreatedAt = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc)
    };

    [Fact]
    public async Task IndexAsync_SearchableDocument_ReplacesChunksWithEmbeddings()
    {
        var doc = Doc();
        _rpc.Setup(r => r.GetAsync(doc.TargetId, ChunkTargetType.Post, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchPostGetRpcResponse { Found = true, Document = doc });
        IReadOnlyList<PostChunk>? saved = null;
        _repo.Setup(r => r.ReplaceAsync(doc.TargetId, ChunkTargetType.Post, It.IsAny<IReadOnlyList<PostChunk>>(), It.IsAny<CancellationToken>()))
            .Callback((Guid _, ChunkTargetType _, IReadOnlyList<PostChunk> rows, CancellationToken _) => saved = rows)
            .Returns(Task.CompletedTask);

        var outcome = await _service.IndexAsync(doc.TargetId, ChunkTargetType.Post);

        Assert.Equal(IndexOutcome.Indexed, outcome);
        Assert.NotNull(saved);
        var row = Assert.Single(saved!);
        Assert.Equal("#thi\nLịch thi cuối kỳ bắt đầu 15/12. PHÒNG ĐÀO TẠO", row.Content);
        Assert.Equal(new float[] { 1, 0, 0 }, row.Embedding!.ToArray());
        Assert.Equal(ChunkVisibility.Followers, row.Visibility);
        Assert.Equal(doc.AuthorId, row.AuthorId);
        Assert.Equal("BAAI/bge-m3", row.EmbeddingModel);
        Assert.Equal(0, row.ChunkIndex);
        _repo.Verify(r => r.RemoveAsync(It.IsAny<Guid>(), It.IsAny<ChunkTargetType>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task IndexAsync_NotSearchable_RemovesWithoutEmbedding()
    {
        var doc = Doc(searchable: false);
        _rpc.Setup(r => r.GetAsync(doc.TargetId, ChunkTargetType.Post, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchPostGetRpcResponse { Found = true, Document = doc });

        var outcome = await _service.IndexAsync(doc.TargetId, ChunkTargetType.Post);

        Assert.Equal(IndexOutcome.Removed, outcome);
        _repo.Verify(r => r.RemoveAsync(doc.TargetId, ChunkTargetType.Post, It.IsAny<CancellationToken>()), Times.Once);
        _repo.Verify(r => r.ReplaceAsync(It.IsAny<Guid>(), It.IsAny<ChunkTargetType>(), It.IsAny<IReadOnlyList<PostChunk>>(), It.IsAny<CancellationToken>()), Times.Never);
        _embedding.Verify(e => e.EmbedAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task IndexAsync_NotFound_Removes()
    {
        var id = Guid.NewGuid();
        _rpc.Setup(r => r.GetAsync(id, ChunkTargetType.Reel, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchPostGetRpcResponse { Found = false });

        var outcome = await _service.IndexAsync(id, ChunkTargetType.Reel);

        Assert.Equal(IndexOutcome.Removed, outcome);
        _repo.Verify(r => r.RemoveAsync(id, ChunkTargetType.Reel, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task IndexAsync_RpcTimeout_ThrowsAndLeavesIndexUntouched()
    {
        _rpc.Setup(r => r.GetAsync(It.IsAny<Guid>(), It.IsAny<ChunkTargetType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SearchPostGetRpcResponse?)null);

        await Assert.ThrowsAsync<TimeoutException>(() => _service.IndexAsync(Guid.NewGuid(), ChunkTargetType.Post));

        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task IndexDocumentAsync_EmbeddingFails_PropagatesAndKeepsOldChunks()
    {
        _embedding
            .Setup(e => e.EmbedAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new EmbeddingServiceException("TEI down"));

        await Assert.ThrowsAsync<EmbeddingServiceException>(() => _service.IndexDocumentAsync(Doc()));

        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task IndexDocumentAsync_EmptyContent_Removes()
    {
        var doc = Doc(content: "   ");
        doc.OcrText = null;

        var outcome = await _service.IndexDocumentAsync(doc);

        Assert.Equal(IndexOutcome.Removed, outcome);
        _repo.Verify(r => r.RemoveAsync(doc.TargetId, ChunkTargetType.Post, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task IndexDocumentAsync_UnknownTargetType_Throws()
    {
        var doc = Doc();
        doc.TargetType = "Story";

        await Assert.ThrowsAsync<ArgumentException>(() => _service.IndexDocumentAsync(doc));
    }
}
