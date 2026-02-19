namespace UserService.Models;

public class Follow
{
    public Guid Id { get; set; }

    // User who is following (người theo dõi)
    public Guid FollowerId { get; set; }
    
    // User being followed (người được theo dõi)
    public Guid FollowingId { get; set; }
    
    public DateTime CreatedAt { get; set; }
   
}