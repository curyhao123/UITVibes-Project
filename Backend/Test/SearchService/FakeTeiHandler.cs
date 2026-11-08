using System.Net;
using System.Text;

namespace Test.SearchService;

/// <summary>Handler giả cho TEI: ghi lại request, trả response tuỳ biến.</summary>
internal sealed class FakeTeiHandler : HttpMessageHandler
{
    private readonly Func<string, HttpResponseMessage> _respond;

    public FakeTeiHandler(Func<string, HttpResponseMessage> respond) => _respond = respond;

    public List<(string Path, string Body)> Requests { get; } = new();

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var body = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(ct);
        Requests.Add((request.RequestUri!.AbsolutePath, body));
        return _respond(body);
    }

    public static HttpResponseMessage Json(string json, HttpStatusCode status = HttpStatusCode.OK) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
}

internal sealed class FakeHttpClientFactory : IHttpClientFactory
{
    private readonly HttpMessageHandler _handler;

    public FakeHttpClientFactory(HttpMessageHandler handler) => _handler = handler;

    public HttpClient CreateClient(string name) =>
        new(_handler, disposeHandler: false) { BaseAddress = new Uri("http://tei.test/") };
}
