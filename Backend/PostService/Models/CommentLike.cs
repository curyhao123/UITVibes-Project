namespace PostService.Models;

public class CommentLike
{
    public Guid Id { get; set; }
    public Guid CommentId { get; set; }
    /// User who liked comment (from AuthService)
  
    public Guid UserId { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    // Navigation property
    public Comment Comment { get; set; } = null!;
}