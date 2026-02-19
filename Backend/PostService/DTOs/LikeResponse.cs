namespace PostService.DTOs;

public class LikeResponse
{
    public Guid LikeId { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public int TotalLikes { get; set; }
    public DateTime CreatedAt { get; set; }
}