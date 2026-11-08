namespace PostService.DTOs;

public class CommentDto
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    /// Image attachment for comment
    public string? ImageUrl { get; set; }
    public Guid? ParentCommentId { get; set; }
    public int LikesCount { get; set; }
    public int RepliesCount { get; set; }
    public bool IsLikedByCurrentUser { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // ── Moderation (chỉ có ý nghĩa với chính tác giả) ──
    /// "Pending" | "Approved" | "Rejected" | "NeedsReview"
    public string ModerationStatus { get; set; } = "Approved";
    /// Lý do bị từ chối / cần xem xét — chỉ trả về cho tác giả.
    public string? ModerationReason { get; set; }

    /// Id của bản ghi kiểm duyệt — cần để tác giả gửi khiếu nại (appeal).
    public Guid? ModerationResultId { get; set; }
}
