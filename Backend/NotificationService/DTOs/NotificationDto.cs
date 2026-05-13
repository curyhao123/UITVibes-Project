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
        DateTime CreatedAt)
    {
        public static NotificationDto From(Notification n) => new(
            n.Id,
            n.ActorId,
            n.EntityId,
            n.Type.ToString(),
            n.Content,
            n.IsRead,
            n.CreatedAt);
    }
}
