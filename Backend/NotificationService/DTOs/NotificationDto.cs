using NotificationService.Models;

namespace NotificationService.DTOs
{
    // Output trả về cho React Native
    public record NotificationDto(
        Guid Id,
        Guid ActorId,
        Guid EntityId,
        string Type,
        string Content,
        bool IsRead,
        DateTime CreatedAt,
        /// <summary>
        /// Số lần đã gộp — dùng cho NewMessage để hiển thị "... đã gửi N tin nhắn".
        /// Mặc định 1 cho các loại không gộp.
        /// </summary>
        int AggregateCount = 1)
    {
        public static NotificationDto From(Notification n) => new(
            n.Id,
            n.ActorId,
            n.EntityId,
            n.Type.ToString(),
            n.Content,
            n.IsRead,
            n.CreatedAt,
            n.AggregateCount);
    }
}
