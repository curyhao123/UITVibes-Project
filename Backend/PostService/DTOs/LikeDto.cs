namespace PostService.DTOs;

public class LikeDto
{
    public Guid LikeId { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }
}