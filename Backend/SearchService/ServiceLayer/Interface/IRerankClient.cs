using SearchService.DTOs;

namespace SearchService.ServiceLayer.Interface;

/// <summary>Rerank bằng cross-encoder; chậm nên chỉ dùng cho vài chục ứng viên.</summary>
public interface IRerankClient
{
    /// <summary>Trả điểm giảm dần; Index trỏ về vị trí trong texts.</summary>
    Task<IReadOnlyList<RerankResult>> RerankAsync(
        string query,
        IReadOnlyList<string> texts,
        CancellationToken ct = default);
}
