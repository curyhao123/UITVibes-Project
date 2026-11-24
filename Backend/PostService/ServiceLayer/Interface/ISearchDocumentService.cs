using PostService.DTOs;
using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>Cung cấp nội dung Post/Reel cho SearchService (qua RPC).</summary>
public interface ISearchDocumentService
{
    Task<SearchPostDocument?> GetAsync(ModerationTargetType targetType, Guid targetId, CancellationToken ct = default);

    /// <summary>Chỉ trả nội dung tìm kiếm được, phân trang keyset theo (CreatedAt, Id).</summary>
    Task<SearchPostExportRpcResponse> ExportAsync(
        ModerationTargetType targetType, DateTime? afterCreatedAt, Guid? afterId, int limit, CancellationToken ct = default);
}
