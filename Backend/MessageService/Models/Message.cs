namespace MessageService.Models
{
    public class Message
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public Guid SenderId { get; set; }

        public string? Content { get; set; }
        public MessageType Type { get; set; } = MessageType.Text;

      
        /// Media URL (for image/video/file messages)
        public string? MediaUrl { get; set; }
        public string? MediaPublicId { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }

        /// Reply to another message
        public Guid? ReplyToMessageId { get; set; }
        public Message? ReplyToMessage { get; set; }

        public bool IsEdited { get; set; }
        public bool IsDeleted { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? EditedAt { get; set; }
        // Navigation properties
        public Conversation Conversation { get; set; } = null!;
        public ICollection<MessageReadReceipt> ReadReceipts { get; set; } = new List<MessageReadReceipt>();
    }
}

public enum MessageType
{
    Text = 0,
    Image = 1,
    Video = 2,
    File = 3,
    System = 4  // "User joined", "User left", etc.
}