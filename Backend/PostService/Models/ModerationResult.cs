namespace PostService.Models;

public class ModerationResult
{
    public Guid TargetId { get; set; }
    public String? Output { get; set; }
    public String? Serverity { get; set; }
    public DateTime CreatedAt { get; set; }
}