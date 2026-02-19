namespace PostService.DTOs;

public class PostDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public PostVisibilityDto Visibility { get; set; }
    public string? Location { get; set; }
    
    public List<PostMediaDto> Media { get; set; } = new();
    
    public int LikesCount { get; set; }
    public int CommentsCount { get; set; }
    public int SharesCount { get; set; }
    public int ViewsCount { get; set; }
    
    public bool IsLikedByCurrentUser { get; set; }
    public bool IsBookmarkedByCurrentUser { get; set; }
    
    public List<string> Hashtags { get; set; } = new();
    public List<Guid> MentionedUserIds { get; set; } = new();
    
    public Guid? OriginalPostId { get; set; }
    public PostDto? OriginalPost { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}