using SearchService.DTOs;
using SearchService.Enums;

namespace SearchService.ServiceLayer.Interface;

public interface IIndexingService
{
    /// <summary>Lấy trạng thái mới nhất từ PostService rồi index hoặc xoá, nên thứ tự event không quan trọng.</summary>
    Task<IndexOutcome> IndexAsync(Guid targetId, ChunkTargetType targetType, CancellationToken ct = default);

    Task<IndexOutcome> IndexDocumentAsync(SearchPostDocument document, CancellationToken ct = default);
}
