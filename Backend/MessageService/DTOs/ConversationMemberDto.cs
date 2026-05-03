namespace MessageService.DTOs
{
    public class ConversationMemberDto
    {
        public Guid UserId { get; set; }
        public string Role { get; set; } = string.Empty;
        public string? Nickname { get; set; }
        public DateTime? LastReadAt { get; set; }
        public DateTime JoinedAt { get; set; }
    }
}
