namespace PostService.Models;

public class Hashtag
{
    public Guid Id { get; set; }
    
    /// Hashtag name (without #)
    public string Name { get; set; } = string.Empty;
    
    /// Normalized name for search (lowercase)
    public string NormalizedName { get; set; } = string.Empty;
    
    /// Usage count
    public int UsageCount { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime LastUsedAt { get; set; }
    
    // Navigation property
    public ICollection<PostHashtag> Posts { get; set; } = new List<PostHashtag>();
}


