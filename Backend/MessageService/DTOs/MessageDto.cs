namespace MessageService.DTOs
{
    public class MessageDto
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public Guid SenderId { get; set; }
        public string? Content { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? MediaUrl { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public Guid? ReplyToMessageId { get; set; }
        public MessageDto? ReplyToMessage { get; set; }
        public bool IsEdited { get; set; }
        public bool IsDeleted { get; set; }
        public List<ReadReceiptDto> ReadBy { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime? EditedAt { get; set; }
    }
}
