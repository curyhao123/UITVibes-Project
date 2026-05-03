using MessageService.DTOs;

namespace MessageService.ServiceLayer.Interface
{
    public interface IUserProfileRpcClient
    {
        Task<UserProfileRpcResponse?> GetUserProfileAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
    }
}
