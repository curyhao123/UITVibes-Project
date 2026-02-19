namespace PostService.Models;

public class PostMention
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    
    /// Mentioned user (from AuthService)
    public Guid MentionedUserId { get; set; }
    
    /// Position in content for highlighting
 
    public int StartPosition { get; set; }
    public int Length { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    // Navigation property
    public Post Post { get; set; } = null!;
}