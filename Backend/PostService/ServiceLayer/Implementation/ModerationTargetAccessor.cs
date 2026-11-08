using Microsoft.EntityFrameworkCore;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Hiện thực <see cref="IModerationTargetAccessor"/> cho Post, Comment và Reel.
///
/// Mỗi loại nội dung có một bảng riêng trong DB nên việc đọc/ghi trạng thái
/// phải switch theo <see cref="ModerationTargetType"/>. Toàn bộ logic switch
/// nằm gọn trong file này để các nơi khác không phải lặp lại.
/// </summary>
public class ModerationTargetAccessor : IModerationTargetAccessor
{
    public async Task<string?> GetContentAsync(
        PostDbContext context,
        ModerationTargetType targetType,
        Guid targetId,
        CancellationToken cancellationToken = default)
    {
        switch (targetType)
        {
            case ModerationTargetType.Post:
                {
                    var post = await context.Posts
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.Id == targetId, cancellationToken);
                    return post?.Content;
                }

            case ModerationTargetType.Comment:
                {
                    var comment = await context.Comments
                        .AsNoTracking()
                        .FirstOrDefaultAsync(c => c.Id == targetId, cancellationToken);
                    return comment?.Content;
                }

            case ModerationTargetType.Reel:
                {
                    var reel = await context.Reels
                        .AsNoTracking()
                        .FirstOrDefaultAsync(r => r.Id == targetId, cancellationToken);
                    // Reel không có caption → trả về chuỗi rỗng (không phải null) để
                    // worker hiểu là "target tồn tại nhưng không có text".
                    return reel is null ? null : reel.Caption ?? string.Empty;
                }

            case ModerationTargetType.ReelComment:
                {
                    var comment = await context.ReelComments
                        .AsNoTracking()
                        .FirstOrDefaultAsync(c => c.Id == targetId, cancellationToken);
                    return comment?.Content;
                }

            case ModerationTargetType.Story:
                {
                    // Story chỉ có media, không có text. Phải trả chuỗi rỗng (không phải null)
                    // để worker biết "target tồn tại nhưng không có text" → sẽ OCR ảnh.
                    var item = await context.StoryItems
                        .AsNoTracking()
                        .FirstOrDefaultAsync(i => i.Id == targetId, cancellationToken);
                    return item is null ? null : string.Empty;
                }

            default:
                return null;
        }
    }

    public async Task<bool> ApplyStatusAsync(
        PostDbContext context,
        ModerationTargetType targetType,
        Guid targetId,
        ModerationStatus status,
        DateTime moderatedAt,
        CancellationToken cancellationToken = default)
    {
        switch (targetType)
        {
            case ModerationTargetType.Post:
                {
                    var post = await context.Posts
                        .FirstOrDefaultAsync(p => p.Id == targetId, cancellationToken);
                    if (post == null) return false;

                    post.ModerationStatus = status;
                    post.ModeratedAt = moderatedAt;
                    return true;
                }

            case ModerationTargetType.Comment:
                {
                    var comment = await context.Comments
                        .FirstOrDefaultAsync(c => c.Id == targetId, cancellationToken);
                    if (comment == null) return false;

                    comment.ModerationStatus = status;
                    comment.ModeratedAt = moderatedAt;
                    return true;
                }

            case ModerationTargetType.Reel:
                {
                    var reel = await context.Reels
                        .FirstOrDefaultAsync(r => r.Id == targetId, cancellationToken);
                    if (reel == null) return false;

                    reel.ModerationStatus = status;
                    reel.ModeratedAt = moderatedAt;
                    return true;
                }

            case ModerationTargetType.ReelComment:
                {
                    var comment = await context.ReelComments
                        .FirstOrDefaultAsync(c => c.Id == targetId, cancellationToken);
                    if (comment == null) return false;

                    comment.ModerationStatus = status;
                    comment.ModeratedAt = moderatedAt;
                    return true;
                }

            case ModerationTargetType.Story:
                {
                    var item = await context.StoryItems
                        .FirstOrDefaultAsync(i => i.Id == targetId, cancellationToken);
                    if (item == null) return false;

                    item.ModerationStatus = status;
                    item.ModeratedAt = moderatedAt;
                    return true;
                }

            default:
                return false;
        }
    }

    public async Task<Guid?> GetAuthorIdAsync(
        PostDbContext context,
        ModerationTargetType targetType,
        Guid targetId,
        CancellationToken cancellationToken = default)
    {
        switch (targetType)
        {
            case ModerationTargetType.Post:
                {
                    var post = await context.Posts
                        .AsNoTracking()
                        .Where(p => p.Id == targetId)
                        .Select(p => (Guid?)p.UserId)
                        .FirstOrDefaultAsync(cancellationToken);
                    return post;
                }

            case ModerationTargetType.Comment:
                {
                    var comment = await context.Comments
                        .AsNoTracking()
                        .Where(c => c.Id == targetId)
                        .Select(c => (Guid?)c.UserId)
                        .FirstOrDefaultAsync(cancellationToken);
                    return comment;
                }

            case ModerationTargetType.Reel:
                {
                    var reel = await context.Reels
                        .AsNoTracking()
                        .Where(r => r.Id == targetId)
                        .Select(r => (Guid?)r.UserId)
                        .FirstOrDefaultAsync(cancellationToken);
                    return reel;
                }

            case ModerationTargetType.ReelComment:
                {
                    var comment = await context.ReelComments
                        .AsNoTracking()
                        .Where(c => c.Id == targetId)
                        .Select(c => (Guid?)c.UserId)
                        .FirstOrDefaultAsync(cancellationToken);
                    return comment;
                }

            case ModerationTargetType.Story:
                {
                    var item = await context.StoryItems
                        .AsNoTracking()
                        .Where(i => i.Id == targetId)
                        .Select(i => i.StoryGroup != null ? (Guid?)i.StoryGroup.UserId : null)
                        .FirstOrDefaultAsync(cancellationToken);
                    return item;
                }

            default:
                return null;
        }
    }

    public async Task<List<string>> GetMediaUrlsAsync(
        PostDbContext context,
        ModerationTargetType targetType,
        Guid targetId,
        CancellationToken cancellationToken = default)
    {
        switch (targetType)
        {
            case ModerationTargetType.Post:
                {
                    var urls = await context.PostMedia
                        .AsNoTracking()
                        .Where(m => m.PostId == targetId)
                        .OrderBy(m => m.DisplayOrder)
                        .Select(m => m.Url)
                        .ToListAsync(cancellationToken);
                    return urls;
                }

            case ModerationTargetType.Reel:
                {
                    var reel = await context.Reels
                        .AsNoTracking()
                        .FirstOrDefaultAsync(r => r.Id == targetId, cancellationToken);

                    if (reel is null)
                        return [];

                    // Ưu tiên thumbnail (nhẹ hơn) kèm video gốc.
                    var urls = new List<string>();

                    if (!string.IsNullOrWhiteSpace(reel.ThumbnailUrl))
                        urls.Add(reel.ThumbnailUrl);

                    if (!string.IsNullOrWhiteSpace(reel.VideoUrl))
                        urls.Add(reel.VideoUrl);

                    return urls;
                }

            case ModerationTargetType.Story:
                {
                    var urls = await context.StoryItems
                        .AsNoTracking()
                        .Where(i => i.Id == targetId)
                        .Select(i => i.Url)
                        .ToListAsync(cancellationToken);
                    return urls;
                }

            default:
                // Comment không có media riêng — trả rỗng.
                return [];
        }
    }
}
