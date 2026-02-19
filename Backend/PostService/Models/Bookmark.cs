namespace PostService.Models;

public class Bookmark
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    
    /// User who bookmarked (from AuthService)
  
    public Guid UserId { get; set; }
    
    /// Optional collection/folder
    public string? Collection { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    // Navigation property
    public Post Post { get; set; } = null!;
}