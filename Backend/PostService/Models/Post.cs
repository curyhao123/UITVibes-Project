namespace PostService.Models;

public class Post
{
    public Guid Id { get; set; }

    /// User who created the post (from AuthService)
    public Guid UserId { get; set; }
    
    /// Post content/caption

    public string Content { get; set; } = string.Empty;
 
    /// Media attachments (images/videos)
  
    public List<PostMedia> Media { get; set; } = new();
    
    public PostVisibility Visibility { get; set; } = PostVisibility.Public; 
 
    /// Location/place tagged

    public string? Location { get; set; }

    /// Engagement counts

    public int LikesCount { get; set; }
    public int CommentsCount { get; set; }
    public int SharesCount { get; set; }
    public int ViewsCount { get; set; }
    
    /// Original post if this is a share/repost

    public Guid? OriginalPostId { get; set; }
    public Post? OriginalPost { get; set; }

    /// Soft delete
 
    public bool IsDeleted { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Like> Likes { get; set; } = new List<Like>();
    public ICollection<PostHashtag> Hashtags { get; set; } = new List<PostHashtag>();
    public ICollection<PostMention> Mentions { get; set; } = new List<PostMention>();
}

public enum PostVisibility
{
    Public = 0,      // Everyone can see
    Followers = 1,   // Only followers
    Private = 2      // Only mentioned users
}