using PostService.DTOs.Moderation;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Pure, side-effect-free policy: turns a (validated or not) LLM output into a final moderation
/// decision. No I/O, no DB, no HTTP — this is the single place that applies the confidence/severity
/// thresholds, so it must be the only thing anything else in the pipeline trusts for that logic.
/// </summary>
public interface IModerationDecisionEvaluator
{
    /// <param name="output">Raw parsed JSON from the LLM. Treat every field as untrusted.</param>
    ModerationDecisionResult Evaluate(LlmModerationOutput output);
}
