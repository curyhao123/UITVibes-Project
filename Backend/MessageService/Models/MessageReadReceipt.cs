namespace MessageService.Models;

public class MessageReadReceipt
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    public DateTime ReadAt { get; set; }

    // Navigation property
    public Message Message { get; set; } = null!;
}