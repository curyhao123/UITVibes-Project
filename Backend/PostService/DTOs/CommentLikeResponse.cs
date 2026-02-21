namespace PostService.DTOs;

public class CommentLikeResponse
{
    public Guid LikeId { get; set; }
    public Guid CommentId { get; set; }
    public Guid UserId { get; set; }
    public int TotalLikes { get; set; }
    public DateTime CreatedAt { get; set; }
}