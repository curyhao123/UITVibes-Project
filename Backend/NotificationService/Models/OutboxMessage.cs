using System.Text.Json;

namespace NotificationService.Models
{
    public class OutboxMessage
    {
        public Guid Id { get; private set; } = Guid.NewGuid();
        public Guid NotificationId { get; init; }

        public DeliveryChannel Channel { get; init; }
        public string Payload { get; init; } = string.Empty; // JSON serialized

        public OutboxStatus Status { get; private set; } = OutboxStatus.Pending;
        public int RetryCount { get; private set; } = 0;
        public string? ErrorMessage { get; private set; }
        public DateTime? ProcessedAt { get; private set; }
        public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

        public static OutboxMessage Create(Guid notificationId, DeliveryChannel channel, object payload)
            => new()
            {
                NotificationId = notificationId,
                Channel = channel,
                Payload = JsonSerializer.Serialize(payload)
            };

        public void MarkSuccess()
        {
            Status = OutboxStatus.Sent;
            ProcessedAt = DateTime.UtcNow;
        }

        public void MarkFailed(string error)
        {
            RetryCount++;
            ErrorMessage = error;
            Status = RetryCount >= 3 ? OutboxStatus.DeadLettered : OutboxStatus.Pending;
        }
    }

    public enum OutboxStatus { Pending, Sent, DeadLettered }
    public enum DeliveryChannel { InApp, Push, Email }
}
