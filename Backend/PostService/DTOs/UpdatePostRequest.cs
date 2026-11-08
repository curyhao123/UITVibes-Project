using System.ComponentModel.DataAnnotations;

namespace PostService.DTOs;

public class UpdatePostRequest
{
    [Required]
    [MaxLength(5000)]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Địa điểm gắn với bài. <c>null</c> = giữ nguyên giá trị hiện tại,
    /// chuỗi rỗng = xoá địa điểm.
    /// </summary>
    [MaxLength(200)]
    public string? Location { get; set; }

    /// <summary>
    /// Quyền hiển thị. <c>null</c> = giữ nguyên quyền hiện tại.
    /// Trước đây mặc định là <see cref="PostVisibilityDto.Public"/>, khiến việc sửa bài
    /// âm thầm biến bài "Followers"/"Private" thành "Public".
    /// </summary>
    public PostVisibilityDto? Visibility { get; set; }
}
