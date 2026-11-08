using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SearchService.Configurations;
using SearchService.Exceptions;
using SearchService.ServiceLayer.Implementation;

namespace Test.SearchService;

public class TeiRerankClientTests
{
    private static (TeiRerankClient Client, FakeTeiHandler Handler) Create(
        Func<string, HttpResponseMessage> respond, int maxTexts = 50)
    {
        var handler = new FakeTeiHandler(respond);
        var options = Options.Create(new RerankOptions { MaxTexts = maxTexts });
        var client = new TeiRerankClient(
            new FakeHttpClientFactory(handler), options, NullLogger<TeiRerankClient>.Instance);
        return (client, handler);
    }

    [Fact]
    public async Task RerankAsync_ReturnsResultsSortedByScoreDescending()
    {
        // TEI không đảm bảo thứ tự — client phải tự sắp xếp.
        var (client, handler) = Create(_ => FakeTeiHandler.Json(
            """[{"index":0,"score":0.12},{"index":2,"score":0.91},{"index":1,"score":0.45}]"""));

        var result = await client.RerankAsync("lịch thi", new[] { "a", "b", "c" });

        Assert.Equal(new[] { 2, 1, 0 }, result.Select(r => r.Index));
        Assert.Equal(0.91f, result[0].Score);

        var (path, body) = Assert.Single(handler.Requests);
        Assert.Equal("/rerank", path);
        using var json = JsonDocument.Parse(body);
        Assert.Equal("lịch thi", json.RootElement.GetProperty("query").GetString());
        Assert.Equal(3, json.RootElement.GetProperty("texts").GetArrayLength());
        Assert.False(json.RootElement.GetProperty("raw_scores").GetBoolean());
    }

    [Fact]
    public async Task RerankAsync_EmptyTexts_DoesNotCallServer()
    {
        var (client, handler) = Create(_ => FakeTeiHandler.Json("[]"));

        var result = await client.RerankAsync("q", Array.Empty<string>());

        Assert.Empty(result);
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task RerankAsync_BlankQuery_Throws()
    {
        var (client, _) = Create(_ => FakeTeiHandler.Json("[]"));

        await Assert.ThrowsAsync<ArgumentException>(() => client.RerankAsync(" ", new[] { "a" }));
    }

    [Fact]
    public async Task RerankAsync_TooManyTexts_Throws()
    {
        var (client, handler) = Create(_ => FakeTeiHandler.Json("[]"), maxTexts: 2);

        await Assert.ThrowsAsync<ArgumentException>(() => client.RerankAsync("q", new[] { "a", "b", "c" }));
        Assert.Empty(handler.Requests);
    }

    [Theory]
    [InlineData("""[{"index":0,"score":0.5}]""")]                              // thiếu điểm
    [InlineData("""[{"index":0,"score":0.5},{"index":5,"score":0.1}]""")]      // index ngoài phạm vi
    [InlineData("""[{"index":0,"score":0.5},{"index":0,"score":0.1}]""")]      // index trùng
    public async Task RerankAsync_InconsistentResponse_Throws(string response)
    {
        var (client, _) = Create(_ => FakeTeiHandler.Json(response));

        await Assert.ThrowsAsync<EmbeddingServiceException>(() => client.RerankAsync("q", new[] { "a", "b" }));
    }
}
