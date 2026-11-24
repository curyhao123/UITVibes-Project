using SearchService.DTOs;

namespace SearchService.ServiceLayer.Interface;

public interface IReindexJob
{
    /// <summary>Chạy backfill ở nền; trả false nếu đang có job chạy.</summary>
    bool TryStart();

    ReindexStatusDto GetStatus();
}
