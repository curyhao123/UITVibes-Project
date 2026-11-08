namespace PostService.Enums;


/// <summary>
/// Where a moderation decision came from. Stored on ModerationResult for audit,
/// and used to decide whether a fallback / NeedsReview should be revisited later.
///
/// LlmDecision / Severity / Confidence / Categories luôn mô tả đánh giá gốc của
/// LLM và KHÔNG bị ghi đè khi admin quyết định — nhờ vậy admin có thể so sánh
/// quyết định của mình với đề xuất của AI (dùng để tính tỉ lệ đồng thuận).
/// </summary>
public enum ModerationSource
{
    Rule = 0,  // Chặn/đánh dấu bởi rule filter, chưa gọi LLM
    Llm = 1,  // Quyết định dựa trên kết quả LLM đã qua đánh giá ngưỡng
    Fallback = 2,  // LLM lỗi/không khả dụng sau khi hết số lần thử -> NeedsReview an toàn
    Human = 3  // Quyết định cuối của admin (LlmDecision/Severity/Confidence vẫn được giữ lại)
}
