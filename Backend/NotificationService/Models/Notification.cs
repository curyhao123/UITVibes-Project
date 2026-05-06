namespace NotificationService.Models
{
    public class Notification
    {
        public Guid Id { get; private set; } = Guid.NewGuid();

        public Guid UserId { get; init; }      // người nhận
        public Guid ActorId { get; init; }     // người thực hiện hành động
        public Guid EntityId { get; init; }    // post/message/conversation liên quan

        public NotificationType Type { get; init; }
        public string Content { get; init; } = string.Empty;

        public bool IsRead { get; private set; } = false;
        public DateTime? ReadAt { get; private set; }
        public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

        // Domain method — không để set trực tiếp từ ngoài
        public void MarkAsRead()
        {
            if (IsRead) return;
            IsRead = true;
            ReadAt = DateTime.UtcNow;
        }
    }
}

public enum NotificationType
{
    NewMessage,
    MessageRead,
    PostLiked,
    PostCommented,
    NewFollower,
    Mentioned,
    Tagged
}