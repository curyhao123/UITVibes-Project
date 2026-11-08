using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Điểm vào duy nhất để đưa nội dung vào hàng đợi kiểm duyệt.
///
/// Mọi nơi tạo nội dung mới (Post, Comment, Reel, Story...) hoặc sửa nội dung cũ
/// đều phải gọi service này thay vì tự tạo bản ghi <see cref="Models.ModerationResult"/>,
/// để đảm bảo:
///   - Nội dung luôn ở trạng thái Pending trước khi được duyệt.
///   - Sửa nội dung sẽ tạo lại bản ghi kiểm duyệt (cho phép tác giả resubmit).
///   - Khi <see cref="Configurations.ModerationOptions.Enabled"/> = false, nội dung
///     được duyệt thẳng mà không cần gọi LLM.
/// </summary>
public interface IModerationEnqueuer
{
    /// <summary>
    /// Đưa nội dung vào hàng đợi kiểm duyệt.
    /// </summary>
    /// <param name="targetType">Loại nội dung (Post / Comment / Reel / Story).</param>
    /// <param name="targetId">Id của nội dung.</param>
    /// <param name="content">Nội dung cần kiểm duyệt (text).</param>
    /// <param name="applyTargetStatus">
    /// Callback gán lại trạng thái kiểm duyệt lên chính entity của nội dung
    /// (Post.ModerationStatus, Comment.ModerationStatus...). Bỏ trống nếu loại
    /// nội dung chưa hỗ trợ trạng thái kiểm duyệt.
    /// </param>
    /// <param name="cancellationToken">Token hủy.</param>
    Task EnqueueAsync(
        ModerationTargetType targetType,
        Guid targetId,
        string? content,
        Action<ModerationStatus>? applyTargetStatus = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Tạo lại bản ghi kiểm duyệt cho nội dung đã tồn tại (dùng khi tác giả sửa bài).
    /// Bản ghi cũ được tái sử dụng nếu có, nếu không thì tạo mới — nhờ vậy không
    /// vi phạm unique index (TargetId + TargetType).
    /// </summary>
    Task ResubmitAsync(
        ModerationTargetType targetType,
        Guid targetId,
        string? content,
        Action<ModerationStatus>? applyTargetStatus = null,
        CancellationToken cancellationToken = default);
}
