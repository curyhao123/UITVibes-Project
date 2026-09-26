using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using PostService.DTOs.Moderation;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

public partial class ModerationResponseParser : IModerationResponseParser
{
    private readonly ILogger<ModerationResponseParser> _logger;

    public ModerationResponseParser(ILogger<ModerationResponseParser> logger)
    {
        _logger = logger;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        // The model sometimes writes confidence/severity as "0.8" / "2" (quoted) despite the
        // prompt asking for numbers. Read those leniently here; range/type correctness is still
        // fully re-checked by IModerationDecisionEvaluator, so this can't let a bad value through.
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    public bool TryParse(string? rawContent, out LlmModerationOutput? output, out string? failureReason)
    {
        output = null;

        if (string.IsNullOrWhiteSpace(rawContent))
        {
            _logger.LogWarning("LLM response content is null or whitespace.");
            failureReason = "empty_content";
            return false;
        }

        _logger.LogInformation("Raw LLM response to parse: {RawContent}", rawContent);

        var unfenced = StripCodeFence(rawContent.Trim());

        if (TryDeserialize(unfenced, out output))
        {
            _logger.LogInformation(
                "Successfully parsed LLM moderation output directly. Decision={Decision}, Severity={Severity}, Confidence={Confidence}, Categories=[{Categories}], Reason={Reason}",
                output?.Decision, output?.Severity, output?.Confidence, string.Join(",", output?.Categories ?? []), output?.Reason);
            failureReason = null;
            return true;
        }

        // Fallback: the model added a preamble/epilogue around the JSON object despite instructions
        // ("Here is the classification: { ... } Let me know if..."). Try to isolate the outermost
        // {...} span and parse just that. This is intentionally the only repair attempt — anything
        // more elaborate risks silently accepting garbage.
        var extracted = ExtractOutermostJsonObject(unfenced);
        if (extracted is not null && TryDeserialize(extracted, out output))
        {
            _logger.LogInformation(
                "Successfully parsed LLM moderation output after extracting outermost JSON. Decision={Decision}, Severity={Severity}, Confidence={Confidence}, Categories=[{Categories}], Reason={Reason}",
                output?.Decision, output?.Severity, output?.Confidence, string.Join(",", output?.Categories ?? []), output?.Reason);
            failureReason = null;
            return true;
        }

        output = null;
        failureReason = extracted is null ? "no_json_object_found" : "json_exception";
        _logger.LogWarning("Failed to parse LLM response. FailureReason: {Reason}. Raw: {RawContent}", failureReason, rawContent);
        return false;
    }

    private static bool TryDeserialize(string candidate, out LlmModerationOutput? output)
    {
        try
        {
            output = JsonSerializer.Deserialize<LlmModerationOutput>(candidate, JsonOptions);
            return output is not null;
        }
        catch (JsonException)
        {
            output = null;
            return false;
        }
        catch (NotSupportedException)
        {
            // e.g. a field came back as an object/array where a primitive was expected.
            output = null;
            return false;
        }
    }

    private static string StripCodeFence(string content)
    {
        var match = CodeFenceRegex().Match(content);
        return match.Success ? match.Groups["body"].Value.Trim() : content;
    }

    /// Finds the first '{' and the matching last '}' at the same nesting depth, honoring string
    /// literals so a '{' or '}' inside a JSON string value doesn't throw off the count.
    private static string? ExtractOutermostJsonObject(string content)
    {
        var start = content.IndexOf('{');
        if (start < 0) return null;

        var depth = 0;
        var inString = false;
        var escaped = false;

        for (var i = start; i < content.Length; i++)
        {
            var c = content[i];

            if (inString)
            {
                if (escaped) escaped = false;
                else if (c == '\\') escaped = true;
                else if (c == '"') inString = false;
                continue;
            }

            switch (c)
            {
                case '"': inString = true; break;
                case '{': depth++; break;
                case '}':
                    depth--;
                    if (depth == 0) return content[start..(i + 1)];
                    break;
            }
        }

        return null; // unbalanced braces, e.g. response got truncated mid-object
    }

    [GeneratedRegex(@"^```(?:json)?\s*\r?\n?(?<body>.*?)\r?\n?```$", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex CodeFenceRegex();
}
