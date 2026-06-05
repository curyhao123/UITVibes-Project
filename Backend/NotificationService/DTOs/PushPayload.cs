namespace NotificationService.DTOs
{
    // Payload được serialize vào OutboxMessage.Payload
    public record PushPayload(
        string Title,
        string Body,
        string Type,
        string EntityId,
        string? NotificationId = null
    );
}
