using PostService.DTOs.Moderation;
using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Xây dựng system prompt + user message để gửi đến LLM API cho một lần kiểm duyệt.
/// </summary>
public interface IModerationPromptBuilder
{
    /// <param name="content">Nội dung cần kiểm duyệt. Không được null hay empty.</param>
    /// <param name="targetType">Loại content (Post / Comment / Reel / Story).</param>
    /// <returns>
    /// <see cref="ModerationPrompt"/> chứa system prompt, user message và version tag —
    /// sẵn sàng để truyền thẳng vào LLM API call.
    /// </returns>
    ModerationPrompt Build(string content, ModerationTargetType targetType);
}
