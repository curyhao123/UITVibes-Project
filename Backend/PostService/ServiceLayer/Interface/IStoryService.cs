using PostService.DTOs;

namespace PostService.ServiceLayer.Interface;

public interface IStoryService
{
    /// <summary>
    /// Tạo story group mới cho user (hoặc thêm vào story group hiện tại nếu chưa hết hạn)
    /// </summary>
    Task<StoryDto> CreateStoryAsync(Guid userId, CreateStoryRequest request);

    /// <summary>
    /// Lấy story đang hoạt động (chưa hết hạn) cho feed
    /// </summary>
    Task<List<StoryFeedDto>> GetActiveStoriesAsync(Guid currentUserId, int limit = 20);

    /// <summary>
    /// Đánh dấu user đã xem story item
    /// </summary>
    Task MarkStoryViewedAsync(Guid storyItemId, Guid userId);

    /// <summary>
    /// Xóa story group của user
    /// </summary>
    Task DeleteStoryAsync(Guid storyGroupId, Guid userId);

    /// <summary>
    /// Upload media story lên Cloudinary
    /// </summary>
    Task<StoryMediaUploadResponse> UploadStoryMediaAsync(IFormFile file);
}
