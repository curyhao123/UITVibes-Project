using PostService.Models;

public class PostHashtag
{
    public Guid PostId { get; set; }
    public Guid HashtagId { get; set; }

    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Post Post { get; set; } = null!;
    public Hashtag Hashtag { get; set; } = null!;
}