namespace UserService.Models;

public class SocialLink
{
    public Guid Id { get; set; }
    public Guid UserProfileId { get; set; }
    public string Platform { get; set; } = string.Empty; // Facebook, Twitter, Instagram, etc.
    public string Url { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    
    // Navigation property
    public UserProfile UserProfile { get; set; } = null!;
}