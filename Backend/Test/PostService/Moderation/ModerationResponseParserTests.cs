using Microsoft.Extensions.Logging.Abstractions;
using PostService.DTOs.Moderation;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho ModerationResponseParser — đây là nơi dễ sai nhất vì phải
/// chịu đựng output không chuẩn từ LLM (markdown fence, preamble, số ở dạng chuỗi).
/// </summary>
public class ModerationResponseParserTests
{
    private readonly ModerationResponseParser _parser =
        new(NullLogger<ModerationResponseParser>.Instance);

    [Fact]
    public void TryParse_WhenResponseIsPlainJson_ReturnsParsedOutput()
    {
        const string raw = """
        {"decision":"reject","categories":["harassment"],"severity":2,"confidence":0.91,"reason":"Quá tấn công."}
        """;

        var parsed = _parser.TryParse(raw, out var output, out var failureReason);

        Assert.True(parsed);
        Assert.Null(failureReason);
        Assert.NotNull(output);
        Assert.Equal("reject", output!.Decision);
        Assert.Equal(new[] { "harassment" }, output.Categories);
        Assert.Equal(2, output.Severity);
        Assert.Equal(0.91, output.Confidence);
    }

    [Fact]
    public void TryParse_WhenResponseIsWrappedInCodeFence_StripsFence()
    {
        const string raw = """
        ```json
        {"decision":"approve","categories":[],"severity":0,"confidence":0.99,"reason":null}
        ```
        """;

        var parsed = _parser.TryParse(raw, out var output, out var failureReason);

        Assert.True(parsed);
        Assert.Null(failureReason);
        Assert.Equal("approve", output!.Decision);
    }

    [Fact]
    public void TryParse_WhenModelAddsPreamble_ExtractsOutermostJsonObject()
    {
        const string raw = """
        Here is the classification:
        {"decision":"review","categories":["spam"],"severity":1,"confidence":0.55,"reason":"Không rõ."}
        Let me know if you need anything else.
        """;

        var parsed = _parser.TryParse(raw, out var output, out var failureReason);

        Assert.True(parsed);
        Assert.Null(failureReason);
        Assert.Equal("review", output!.Decision);
        Assert.Equal(new[] { "spam" }, output.Categories);
    }

    [Fact]
    public void TryParse_WhenNumbersAreQuoted_StillParsesThem()
    {
        const string raw = """
        {"decision":"approve","categories":[],"severity":"0","confidence":"0.8","reason":null}
        """;

        var parsed = _parser.TryParse(raw, out var output, out var failureReason);

        Assert.True(parsed);
        Assert.Null(failureReason);
        Assert.Equal(0, output!.Severity);
        Assert.Equal(0.8, output.Confidence);
    }

    [Fact]
    public void TryParse_WhenBracesAppearInsideStringValue_ParsesCorrectly()
    {
        const string raw = """
        {"decision":"reject","categories":["other"],"severity":3,"confidence":0.99,"reason":"Chứa {thông tin} nhạy cảm"}
        """;

        var parsed = _parser.TryParse(raw, out var output, out var failureReason);

        Assert.True(parsed);
        Assert.Null(failureReason);
        Assert.Equal("Chứa {thông tin} nhạy cảm", output!.Reason);
    }

    [Fact]
    public void TryParse_WhenResponseIsEmpty_ReturnsFalse()
    {
        var parsed = _parser.TryParse("   ", out var output, out var failureReason);

        Assert.False(parsed);
        Assert.Null(output);
        Assert.Equal("empty_content", failureReason);
    }

    [Fact]
    public void TryParse_WhenResponseHasNoJsonObject_ReturnsFalse()
    {
        var parsed = _parser.TryParse("I cannot classify this content.", out var output, out var failureReason);

        Assert.False(parsed);
        Assert.Null(output);
        Assert.Equal("no_json_object_found", failureReason);
    }

    [Fact]
    public void TryParse_WhenJsonIsTruncated_ReturnsFalse()
    {
        const string raw = """{"decision":"approve","categories":[],"severity":0""";

        var parsed = _parser.TryParse(raw, out var output, out var failureReason);

        Assert.False(parsed);
        Assert.Null(output);
        Assert.NotNull(failureReason);
    }
}
