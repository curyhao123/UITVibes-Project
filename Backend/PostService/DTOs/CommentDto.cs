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
}