using Microsoft.AspNetCore.Http;

using Microsoft.AspNetCore.Http;

namespace PostService.DTOs;

// ============ REQUEST ============

/// <summary>
/// Body khi tạo story mới. Client upload media trước qua POST /story/media,
/// rồi gửi URL đã nhận kèm request này.
/// </summary>
public class CreateStoryRequest
{
    /// Tên hiển thị của chủ story (frontend gửi từ currentUser.displayName)
    public string OwnerDisplayName { get; set; } = string.Empty;

    /// Avatar URL của chủ story (frontend gửi từ currentUser.avatar)
    public string OwnerAvatarUrl { get; set; } = string.Empty;

    /// Danh sách media đã upload (URL từ Cloudinary)
    public List<StoryMediaItem> Media { get; set; } = new();
}

/// <summary>
/// Upload media và tạo story trong một request
/// </summary>
public class CreateStoryWithMediaRequest
{
    /// <summary>
    /// IFormFileCollection binds reliably to multiple files with the same field name
    /// in multipart/form-data (List&lt;IFormFile&gt; has known model-binding issues).
    /// </summary>
    public IFormFileCollection Files { get; set; } = null!;

    public List<int>? DisplayOrders { get; set; }
}

/// <summary>
/// Upload media request cho story
/// </summary>
public class StoryMediaUploadRequest
{
    public IFormFile File { get; set; } = null!;
}

/// <summary>
/// Một media item trong story
/// </summary>
public class StoryMediaItem
{
    /// 0 = Image, 1 = Video
    public int Type { get; set; }

    /// URL Cloudinary đã upload
    public string Url { get; set; } = string.Empty;

    /// PublicId để xóa sau này
    public string? PublicId { get; set; }

    /// Thumbnail cho video
    public string? ThumbnailUrl { get; set; }

    /// Thứ tự hiển thị trong story
    public int DisplayOrder { get; set; }

    /// Thời lượng video (giây)
    public int? Duration { get; set; }
}

// ============ RESPONSE ============

/// <summary>
/// Trả về khi tạo story thành công
/// </summary>
public class StoryDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<StoryItemDto> Items { get; set; } = new();
}

/// <summary>
/// Một item trong story
/// </summary>
public class StoryItemDto
{
    public Guid Id { get; set; }
    public int Type { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public int DisplayOrder { get; set; }
    public int? Duration { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Story item dùng trong active-story feed (kèm thông tin user và trạng thái đã xem)
///
/// Mapped trực tiếp từ StoryGroup entity
/// </summary>
public class StoryFeedDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    /// Tên hiển thị của chủ story (denormalized từ UserService)
    public string DisplayName { get; set; } = string.Empty;

    /// Avatar của chủ story (denormalized từ UserService)
    public string AvatarUrl { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public bool IsViewed { get; set; }
    /// URL ảnh đầu tiên (dùng làm thumbnail trên story bar)
    public string PreviewUrl { get; set; } = string.Empty;
    public int TotalItems { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Upload media response từ Cloudinary
/// </summary>
public class StoryMediaUploadResponse
{
    public string Url { get; set; } = string.Empty;
    public string PublicId { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public int Type { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? Duration { get; set; }
}
