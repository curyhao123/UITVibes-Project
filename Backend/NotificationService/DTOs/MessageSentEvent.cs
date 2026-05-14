namespace NotificationService.DTOs
{
    public record MessageSentEvent(
        Guid RecipientUserId,
        Guid SenderId,
        string SenderName,
        Guid ConversationId,
        string? Preview
    );
}
