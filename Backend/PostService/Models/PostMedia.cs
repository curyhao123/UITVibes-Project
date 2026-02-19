namespace PostService.Models;

public class PostMedia
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    
    /// Media type (image, video, gif)
    public MediaType Type { get; set; }
    /// Cloudinary URL
    public string Url { get; set; } = string.Empty;
   
    /// Cloudinary public ID for deletion
    public string? PublicId { get; set; }
    
    public string? ThumbnailUrl { get; set; }
    
    public int DisplayOrder { get; set; }
     /// Media dimensions
    public int? Width { get; set; }
    public int? Height { get; set; }
    
    public int? Duration { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    // Navigation property
    public Post Post { get; set; } = null!;
}

public enum MediaType
{
    Image = 0,
    Video = 1,
    Gif = 2
}