using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SearchService.Configurations;
using SearchService.Exceptions;
using SearchService.ServiceLayer.Implementation;

namespace Test.SearchService;

public class TeiEmbeddingClientTests
{
    private const int Dims = 4;

    private static (TeiEmbeddingClient Client, FakeTeiHandler Handler) Create(
        Func<string, HttpResponseMessage> respond, int maxBatchSize = 32)
    {
        var handler = new FakeTeiHandler(respond);
        var options = Options.Create(new EmbeddingOptions { Dimensions = Dims, MaxBatchSize = maxBatchSize });
        var client = new TeiEmbeddingClient(
            new FakeHttpClientFactory(handler), options, NullLogger<TeiEmbeddingClient>.Instance);
        return (client, handler);
    }

    /// <summary>Trả về một vector [i, i, i, i] cho mỗi input, i = vị trí trong batch.</summary>
    private static HttpResponseMessage EchoVectors(string body)
    {
        var inputs = JsonDocument.Parse(body).RootElement.GetProperty("inputs").GetArrayLength();
        var vectors = Enumerable.Range(0, inputs).Select(i => Enumerable.Repeat((float)i, Dims).ToArray());
        return FakeTeiHandler.Json(JsonSerializer.Serialize(vectors));
    }

    [Fact]
    public async Task EmbedAsync_SendsInputsToEmbedEndpoint_AndReturnsVectorsInOrder()
    {
        var (client, handler) = Create(EchoVectors);

        var result = await client.EmbedAsync(new[] { "lịch thi cuối kỳ", "khi nào thi final" });

        Assert.Equal(2, result.Count);
        Assert.Equal(new float[] { 0, 0, 0, 0 }, result[0]);
        Assert.Equal(new float[] { 1, 1, 1, 1 }, result[1]);

        var (path, body) = Assert.Single(handler.Requests);
        Assert.Equal("/embed", path);
        using var json = JsonDocument.Parse(body);
        Assert.Equal("lịch thi cuối kỳ", json.RootElement.GetProperty("inputs")[0].GetString());
        Assert.True(json.RootElement.GetProperty("normalize").GetBoolean());
        Assert.True(json.RootElement.GetProperty("truncate").GetBoolean());
    }

    [Fact]
    public async Task EmbedAsync_SplitsLargeInputIntoBatches()
    {
        var (client, handler) = Create(EchoVectors, maxBatchSize: 2);

        var result = await client.EmbedAsync(new[] { "a", "b", "c", "d", "e" });

        Assert.Equal(5, result.Count);
        Assert.Equal(3, handler.Requests.Count);
        // Batch cuối có 1 phần tử → vector [0,...]; thứ tự tổng thể vẫn giữ nguyên.
        Assert.Equal(new float[] { 0, 0, 0, 0 }, result[4]);
    }

    [Fact]
    public async Task EmbedAsync_EmptyList_DoesNotCallServer()
    {
        var (client, handler) = Create(EchoVectors);

        var result = await client.EmbedAsync(Array.Empty<string>());

        Assert.Empty(result);
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task EmbedAsync_BlankText_Throws()
    {
        var (client, handler) = Create(EchoVectors);

        await Assert.ThrowsAsync<ArgumentException>(() => client.EmbedAsync(new[] { "ok", "  " }));
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task EmbedAsync_WrongDimensions_Throws()
    {
        var (client, _) = Create(_ => FakeTeiHandler.Json("[[0.1, 0.2]]"));

        var ex = await Assert.ThrowsAsync<EmbeddingServiceException>(() => client.EmbedAsync("xin chào"));
        Assert.Contains("4-dimension", ex.Message);
    }

    [Fact]
    public async Task EmbedAsync_VectorCountMismatch_Throws()
    {
        var (client, _) = Create(_ => FakeTeiHandler.Json("[[1,1,1,1]]"));

        await Assert.ThrowsAsync<EmbeddingServiceException>(() => client.EmbedAsync(new[] { "a", "b" }));
    }

    [Fact]
    public async Task EmbedAsync_HttpError_ThrowsEmbeddingServiceException()
    {
        var (client, _) = Create(_ => FakeTeiHandler.Json("{\"error\":\"model loading\"}", HttpStatusCode.ServiceUnavailable));

        var ex = await Assert.ThrowsAsync<EmbeddingServiceException>(() => client.EmbedAsync("xin chào"));
        Assert.Contains("503", ex.Message);
    }

    [Fact]
    public async Task EmbedAsync_InvalidJson_ThrowsEmbeddingServiceException()
    {
        var (client, _) = Create(_ => FakeTeiHandler.Json("not json"));

        await Assert.ThrowsAsync<EmbeddingServiceException>(() => client.EmbedAsync("xin chào"));
    }

    [Fact]
    public async Task EmbedAsync_ServerUnreachable_ThrowsEmbeddingServiceException()
    {
        var (client, _) = Create(_ => throw new HttpRequestException("connection refused"));

        await Assert.ThrowsAsync<EmbeddingServiceException>(() => client.EmbedAsync("xin chào"));
    }
}
