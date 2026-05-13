namespace NotificationService.DTOs
{
    // Input từ Consumer (RabbitMQ event)
    public record NotificationInput(
        Guid UserId,
        Guid ActorId,
        Guid EntityId,
        NotificationType Type,
        string ActorName,
        string? Extra = null
    );

}
