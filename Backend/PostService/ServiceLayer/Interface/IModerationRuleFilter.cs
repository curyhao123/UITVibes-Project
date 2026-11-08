using PostService.DTOs.Moderation;
using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Lớp tiền xử lý bằng rule (rẻ, chính xác, không gọi LLM) chạy TRƯỚC khi nội dung
/// được gửi cho LLM.
///
/// Mục tiêu: những vi phạm mà LLM có xu hướng bỏ sót — đặc biệt là **chửi thề
/// (profanity)** — phải bị chặn một cách **tất định**, không phụ thuộc vào việc
/// model có "ngoan" hay không, và không phụ thuộc nhiệt độ sampling.
///
/// Nguyên tắc fail-safe:
///   - Rule **không** bao giờ tự approve (nó chỉ chặn hoặc đẩy sang vùng xám).
///   - Rule "chặn thẳng" chỉ dùng cho mức vi phạm rõ ràng (severity &gt;= 2).
///   - Mọi vi phạm nhẹ → NeedsReview để con người quyết định.
///   - Rule không bao giờ trả về null: nội dung sạch → null (đi tiếp sang LLM).
/// </summary>
public interface IModerationRuleFilter
{
    /// <summary>
    /// Kiểm tra nội dung bằng rule.
    /// </summary>
    /// <param name="content">Nội dung cần kiểm tra.</param>
    /// <param name="targetType">Loại nội dung — một số rule chỉ áp dụng cho loại cụ thể.</param>
    /// <returns>
    /// <c>null</c> nếu nội dung không vi phạm rule nào (đi tiếp sang LLM).
    /// Ngược lại trả về quyết định chặn/đẩy sang vùng xám.
    /// </returns>
    ModerationDecisionResult? Evaluate(string content, ModerationTargetType targetType);
}
