using System.Collections.Generic;

namespace MessageService.Models
{
    public class Conversation
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public ConversationType Type { get; set; }
        public string? AvatarUrl { get; set; }
        public Guid CreatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastUpdatedAt { get; set; }
        public string? LastMessageContent { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public Guid? LastMessageSenderId { get; set; }
        public bool IsDeleted { get; set; }
        public ICollection<ConversationMember> Members { get; set; } = new List<ConversationMember>();
        public ICollection<Message> Messages { get; set; } = new List<Message>();
    }
}

public enum ConversationType
{
    Private = 0,
    Group = 1
}
