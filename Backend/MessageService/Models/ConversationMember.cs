namespace MessageService.Models
{
    public class ConversationMember
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public Guid UserId { get; set; }
        public MemberRole Role { get; set; } = MemberRole.Member;
        public string? Nickname { get; set; }
        public Guid? LastReadMessageId { get; set; }
        public DateTime? LastReadAt { get; set; }
        public DateTime JoinedAt { get; set; }
        public DateTime? LeftAt { get; set; }

        // Navigation properties
        public Conversation Conversation { get; set; } = null!;
    }
}

public enum MemberRole
{
    Member = 0,
    Admin = 1
}