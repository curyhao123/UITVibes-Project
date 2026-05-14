namespace NotificationService.DTOs
{
    public record PostLikedEvent(
        Guid PostOwnerId,
        Guid LikerId,
        string LikerName,
        Guid PostId
    );
}
