namespace PostService.DTOs.Moderation;

/// <summary>
/// Parsed JSON output from the moderation LLM call. Everything here is UNTRUSTED input:
/// the model can omit fields, hallucinate categories, or return out-of-range numbers.
/// IModerationDecisionEvaluator is responsible for validating every field before acting on it —
/// never branch on Decision/Categories/Severity/Confidence anywhere else without going through it.
/// </summary>
public class LlmModerationOutput
{
    /// Expected raw values: "approve" | "reject" | "review". Anything else is treated as invalid.
    public string? Decision { get; set; }

    /// Expected values come from ModerationCategories.Known. Unknown strings are treated as invalid
    /// (the whole output falls back to NeedsReview) rather than silently dropped, since a category
    /// the evaluator doesn't recognize might be exactly the one that should force human review.
    public List<string>? Categories { get; set; }

    /// Expected range: 0-3.
    public int? Severity { get; set; }

    /// Expected range: 0.0-1.0.
    public double? Confidence { get; set; }

    /// Short, author-facing explanation. Free text; length-capped by the caller before storage.
    public string? Reason { get; set; }
}
