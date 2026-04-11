namespace PostService.Models;

/// <summary>
/// Represents a user story — ephemeral media (image/video) that expires after 24 hours.
/// Stories are grouped by user: each user can have one active StoryGroup containing multiple StoryItems.
/// </summary>
public class StoryGroup
{
    public Guid Id { get; set; }

    /// Chủ sở hữu story
    public Guid UserId { get; set; }

    /// Denormalized display name để tránh gọi UserService khi hiển thị
    public string OwnerDisplayName { get; set; } = string.Empty;

    /// Denormalized avatar URL
    public string OwnerAvatarUrl { get; set; } = string.Empty;

    /// Story hết hạn sau 24h (tự động ẩn khỏi feed)
    public DateTime ExpiresAt { get; set; }

    /// Tổng số lượt xem của tất cả items trong group
    public int TotalViews { get; set; }

    public DateTime CreatedAt { get; set; }

    /// Các item media trong story
    public List<StoryItem> Items { get; set; } = new();
}

/// <summary>
/// Một item media (ảnh/video) trong story.
/// Mỗi StoryItem có thể được xem bởi nhiều user.
/// </summary>
public class StoryItem
{
    public Guid Id { get; set; }

    public Guid StoryGroupId { get; set; }

    /// Loại media: 0 = Image, 1 = Video
    public MediaType Type { get; set; }

    /// URL Cloudinary
    public string Url { get; set; } = string.Empty;

    /// PublicId để xóa khỏi Cloudinary
    public string? PublicId { get; set; }

    /// Ảnh thumbnail (cho video)
    public string? ThumbnailUrl { get; set; }

    /// Vị trí hiển thị trong story group
    public int DisplayOrder { get; set; }

    /// Thời lượng (cho video, tính bằng giây)
    public int? Duration { get; set; }

    public DateTime CreatedAt { get; set; }

    /// Navigation
    public StoryGroup StoryGroup { get; set; } = null!;

    /// Ai đã xem item này
    public List<StoryView> Views { get; set; } = new();
}

/// <summary>
/// Ghi nhận ai đã xem story item nào
/// </summary>
public class StoryView
{
    public Guid Id { get; set; }

    public Guid StoryItemId { get; set; }

    /// User đã xem
    public Guid UserId { get; set; }

    public DateTime ViewedAt { get; set; }

    /// Navigation
    public StoryItem StoryItem { get; set; } = null!;
}
