using PostService.DTOs;

namespace PostService.ServiceLayer.Interface;

public interface IStoryService
{
    /// <summary>
    /// Tạo story group mới cho user (hoặc thêm vào story group hiện tại nếu chưa hết hạn)
    /// </summary>
    Task<StoryDto> CreateStoryAsync(Guid userId, CreateStoryRequest request);

    /// <summary>
    /// Upload media và tạo story trong một request
    /// </summary>
    Task<StoryDto> CreateStoryWithMediaAsync(Guid userId, CreateStoryWithMediaRequest request);

    /// <summary>
    /// Lấy story đang hoạt động (chưa hết hạn) cho feed
    /// </summary>
    Task<List<StoryFeedDto>> GetActiveStoriesAsync(Guid currentUserId, int limit = 20);

    /// <summary>
    /// Lấy story groups của một user cụ thể (profile page)
    /// </summary>
    Task<List<StoryFeedDto>> GetUserStoriesAsync(Guid userId, Guid currentUserId, int limit = 20);

    /// <summary>
    /// Lấy tất cả items của một story group (dùng cho profile StoryGrid)
    /// </summary>
    Task<List<StoryItemDto>> GetStoryGroupItemsAsync(Guid storyGroupId);

    /// <summary>
    /// Lấy chi tiết một story group (dùng cho story viewer)
    /// </summary>
    Task<StoryDto?> GetStoryByIdAsync(Guid storyGroupId);

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
