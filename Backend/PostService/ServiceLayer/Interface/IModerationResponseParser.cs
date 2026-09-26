using PostService.DTOs.Moderation;

namespace PostService.ServiceLayer.Interface;


/// <summary>
/// Turns the raw text content of a DeepSeek response into LlmModerationOutput.
/// This is purely mechanical (extract + deserialize) — it does NOT judge whether the values make
/// sense (decision is a known verb, severity is in range, etc.); that's IModerationDecisionEvaluator's
/// job. This type must never throw: any malformed input returns false so the caller can fall back
/// to NeedsReview instead of crashing the moderation worker.
/// </summary>
public interface IModerationResponseParser
{
    /// <param name="rawContent">The "content" field of the LLM response. May be null/empty/malformed.</param>
    /// <param name="output">The parsed output when this returns true; otherwise null.</param>
    /// <param name="failureReason">
    /// Machine-readable code for logs when this returns false (e.g. "empty_content", "no_json_found",
    /// "json_exception"). Never shown to the author.
    /// </param>
    bool TryParse(string? rawContent, out LlmModerationOutput? output, out string? failureReason);
}
