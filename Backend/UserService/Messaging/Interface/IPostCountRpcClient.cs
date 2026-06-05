using UserService.DTOs;

namespace UserService.Messaging.Interface
{
    public interface IPostCountRpcClient
    {
        Task<PostCountRpcResponse?> GetPostCountAsync(Guid userId, CancellationToken cancellationToken = default);
    }
}
