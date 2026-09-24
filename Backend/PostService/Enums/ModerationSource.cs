namespace PostService.Enums;


/// <summary>
/// Where a moderation decision came from. Stored on ModerationResult for audit,
/// and used to decide whether a fallback / NeedsReview should be revisited later.
/// </summary>
public enum ModerationSource
{
    Rule = 0,  // Chặn/đánh dấu bởi rule filter, chưa gọi LLM
    Llm = 1,  // Quyết định dựa trên kết quả LLM đã qua đánh giá ngưỡng
    Fallback = 2   // LLM lỗi/không khả dụng sau khi hết số lần thử -> NeedsReview an toàn
}