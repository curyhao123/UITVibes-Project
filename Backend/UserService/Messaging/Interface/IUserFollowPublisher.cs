using UserService.DTOs;

namespace UserService.Messaging.Interface
{
    public interface IUserFollowPublisher
    {
        Task PublishAsync(UserFollowedEvent evt, CancellationToken ct = default);
    }
}
