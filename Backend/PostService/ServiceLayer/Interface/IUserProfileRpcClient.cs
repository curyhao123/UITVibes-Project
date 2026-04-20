using PostService.DTOs;

namespace PostService.ServiceLayer.Interface
{
    public interface IUserProfileRpcClient
    {
        Task<UserProfileRpcResponse?> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);
    }
}
