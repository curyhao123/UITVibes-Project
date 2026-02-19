namespace PostService.Models;

public class Comment
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    
    public Guid UserId { get; set; }
    
  
    public string Content { get; set; } = string.Empty;
    
    /// Parent comment for nested replies
 
    public Guid? ParentCommentId { get; set; }
    public Comment? ParentComment { get; set; }
    
    /// Engagement counts

    public int LikesCount { get; set; }
    public int RepliesCount { get; set; }

    /// Soft delete
    public bool IsDeleted { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public Post Post { get; set; } = null!;
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
    public ICollection<CommentLike> Likes { get; set; } = new List<CommentLike>();
}