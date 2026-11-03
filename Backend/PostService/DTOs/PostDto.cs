using PostService.Enums;
using PostService.Models;

namespace PostService.DTOs;

public class PostDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public PostVisibilityDto Visibility { get; set; }
    public string? Location { get; set; }

    public List<PostMediaDto> Media { get; set; } = new();
    public PostType PostType { get; set; }
    public bool IsRepostedByCurrentUser { get; set; }
    public int RepostCount { get; set; }

    public int LikesCount { get; set; }
    public int CommentsCount { get; set; }
    public int SharesCount { get; set; }
    public int ViewsCount { get; set; }

    public bool IsLikedByCurrentUser { get; set; }
    public bool IsBookmarkedByCurrentUser { get; set; }

    public List<string> Hashtags { get; set; } = new();
    public List<Guid> MentionedUserIds { get; set; } = new();

    public Guid? OriginalPostId { get; set; }
    public PostDto? OriginalPost { get; set; }

    /// <summary>
    /// Trạng thái kiểm duyệt của bài: 0=Pending, 1=Approved, 2=Rejected, 3=NeedsReview.
    /// Chỉ có ý nghĩa với chính tác giả — với người khác, bài đã Approved mới hiển thị.
    /// </summary>
    public ModerationStatus ModerationStatus { get; set; }

    /// <summary>
    /// Lý do bị từ chối / cần xem xét (do AI hoặc admin cung cấp). Chỉ tác giả thấy.
    /// Null khi bài được duyệt.
    /// </summary>

    public string? ModerationReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}