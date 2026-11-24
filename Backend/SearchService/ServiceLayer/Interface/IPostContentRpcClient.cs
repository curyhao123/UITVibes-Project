using SearchService.DTOs;
using SearchService.Enums;

namespace SearchService.ServiceLayer.Interface;

/// <summary>Đọc nội dung Post/Reel từ PostService qua RabbitMQ RPC; trả null khi hết thời gian chờ.</summary>
public interface IPostContentRpcClient
{
    Task<SearchPostGetRpcResponse?> GetAsync(Guid targetId, ChunkTargetType targetType, CancellationToken ct = default);

    Task<SearchPostExportRpcResponse?> ExportAsync(
        ChunkTargetType targetType, DateTime? afterCreatedAt, Guid? afterId, int limit, CancellationToken ct = default);
}
