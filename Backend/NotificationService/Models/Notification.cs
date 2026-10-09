using NotificationService.Enums;

namespace NotificationService.Models
{
    public class Notification
    {
        public Guid Id { get; private set; } = Guid.NewGuid();

        public Guid UserId { get; init; }      // người nhận
        public Guid ActorId { get; init; }     // người thực hiện hành động
        public Guid EntityId { get; init; }    // post/message/conversation liên quan

        public NotificationType Type { get; init; }
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// Số lần đã gộp — dùng cho NewMessage để hiển thị "... đã gửi N tin nhắn".
        /// </summary>
        public int AggregateCount { get; private set; } = 1;

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

        /// <summary>
        /// Gộp thêm một notification cùng loại (dùng cho NewMessage).
        /// Cập nhật Content + tăng AggregateCount + làm mới CreatedAt.
        /// </summary>
        public void MergeWith(string newContent, int incrementBy = 1)
        {
            Content = newContent;
            AggregateCount += incrementBy;
            CreatedAt = DateTime.UtcNow;
        }
    }
}
