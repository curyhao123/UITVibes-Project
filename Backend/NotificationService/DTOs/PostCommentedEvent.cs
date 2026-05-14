namespace NotificationService.DTOs
{
    // Consumers/Events/PostCommentedEvent.cs
    public record PostCommentedEvent(
        Guid PostOwnerId,
        Guid CommenterId,
        string CommenterName,
        Guid PostId,
        string? CommentPreview
    );
}
