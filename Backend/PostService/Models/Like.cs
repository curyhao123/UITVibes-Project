namespace PostService.Models;

public class Like
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    
    public Guid UserId { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    // Navigation property
    public Post Post { get; set; } = null!;
}