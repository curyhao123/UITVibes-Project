using PostService.DTOs;

namespace PostService.ServiceLayer.Interface
{
    public interface IBookmarkService
    {
        Task<BookmarkDto> CreateBookmarkAsync(CreateBookmarkRequest request);
        Task<bool> DeleteBookmarkAsync(Guid bookmarkId, Guid userId);
        Task<List<BookmarkDto>> GetBookmarksByUserAsync(Guid userId, string? collection = null, int skip = 0, int take = 20);
    }
}
