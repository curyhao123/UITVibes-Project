namespace MessageService.DTOs
{
    public class ConversationDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? AvatarUrl { get; set; }
        public string? LastMessageContent { get; set; }
        public Guid? LastMessageSenderId { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
        public List<ConversationMemberDto> Members { get; set; } = new();
        public DateTime CreatedAt { get; set; }
    }
}
