using PostService.Enums;
using PostService.Models;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Đọc/ghi nội dung được kiểm duyệt cho mọi loại target (Post, Comment, Reel).
///
/// Tách riêng thành service để worker và admin service không phải switch
/// theo TargetType ở nhiều nơi — thêm loại nội dung mới chỉ cần sửa 1 file.
/// </summary>
public interface IModerationTargetAccessor
{
    /// <summary>
    /// Lấy nội dung text để đưa vào LLM. Trả về null nếu target không tồn tại.
    /// Trả về chuỗi rỗng nếu target có thật nhưng không có text (vd. reel không caption).
    /// </summary>
    Task<string?> GetContentAsync(
        PostDbContext context,
        ModerationTargetType targetType,
        Guid targetId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gán trạng thái kiểm duyệt lên chính entity của nội dung.
    /// Trả về false nếu target không tồn tại.
    /// </summary>
    Task<bool> ApplyStatusAsync(
        PostDbContext context,
        ModerationTargetType targetType,
        Guid targetId,
        ModerationStatus status,
        DateTime moderatedAt,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Id của tác giả (dùng để gửi thông báo cho tác giả khi bị từ chối).
    /// Trả về null nếu target không tồn tại.
    /// </summary>
    Task<Guid?> GetAuthorIdAsync(
        PostDbContext context,
        ModerationTargetType targetType,
        Guid targetId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Lấy danh sách URL media của nội dung (ảnh/video), dùng để lưu bằng chứng
    /// media (3.7). Trả về list rỗng nếu target không tồn tại hoặc không có media.
    /// </summary>
    Task<List<string>> GetMediaUrlsAsync(
        PostDbContext context,
        ModerationTargetType targetType,
        Guid targetId,
        CancellationToken cancellationToken = default);
}
