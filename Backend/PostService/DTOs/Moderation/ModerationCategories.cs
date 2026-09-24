namespace PostService.DTOs.Moderation;

/// <summary>
/// Fixed category vocabulary the LLM is instructed to use (see moderation prompt, PromptVersion-tracked).
/// Keep this in sync with the prompt resource — the evaluator rejects any category not listed here.
/// </summary>
public static class ModerationCategories
{
    public const string Harassment = "harassment";
    public const string Hate = "hate";
    public const string Sexual = "sexual";
    public const string Violence = "violence";
    public const string SelfHarm = "self_harm";
    public const string Spam = "spam";
    public const string Doxxing = "doxxing";
    public const string Illegal = "illegal";
    public const string ExamLeak = "exam_leak";
    public const string Other = "other";

    public static readonly IReadOnlySet<string> Known = new HashSet<string>(StringComparer.Ordinal)
    {
        Harassment, Hate, Sexual, Violence, SelfHarm, Spam, Doxxing, Illegal, ExamLeak, Other
    };
}
