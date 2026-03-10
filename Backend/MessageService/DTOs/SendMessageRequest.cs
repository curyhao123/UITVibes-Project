namespace MessageService.DTOs
{
    public class SendMessageRequest
    {
        public string? Content { get; set; }
        public string? MediaUrl { get; set; }
        public string? MediaPublicId { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public int Type { get; set; } // 0=Text, 1=Image, 2=Video, 3=File
        public Guid? ReplyToMessageId { get; set; }
    }
}
