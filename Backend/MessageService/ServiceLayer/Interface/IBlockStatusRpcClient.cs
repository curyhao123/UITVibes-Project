using MessageService.DTOs;

namespace MessageService.ServiceLayer.Interface
{
    public interface IBlockStatusRpcClient
    {
        Task<BlockStatusRpcResponse?> GetBlockStatusAsync(
            Guid currentUserId,
            Guid otherUserId,
            CancellationToken cancellationToken = default);
    }
}
