namespace AuthService.Messaging;

public interface IMessagePublisher
{
    Task PublishUserCreatedAsync(Guid userId, string email, string username);
    Task PublishUserBannedAsync(Guid userId, bool isBanned);
}