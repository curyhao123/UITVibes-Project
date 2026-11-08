using System.ComponentModel.DataAnnotations;

namespace PostService.Configurations;

/// <summary>
/// Cấu hình OCR cho kiểm duyệt ảnh (Phase 3.0).
///
/// OCR trích text từ ảnh rồi ghép vào nội dung để đi lại pipeline kiểm duyệt
/// text hiện có. Nhờ vậy không phải dùng vision model (đắt, chậm) cho phần lớn
/// trường hợp — vẫn bắt được đề thi, điểm, căn cước, số điện thoại trong ảnh.
///
/// Bind từ section "Moderation:Ocr".
/// </summary>
public class ModerationOcrOptions
{
    public const string SectionName = "Moderation:Ocr";

    /// Bật/tắt OCR. Tắt mặc định để không gọi provider khi chưa cấu hình.
    public bool Enabled { get; set; } = false;

    /// Provider OCR. Hiện hỗ trợ "generic_http" (endpoint HTTP trả JSON).
    public string Provider { get; set; } = "generic_http";

    /// Endpoint của provider OCR. Provider nhận body:
    /// <c>{ "url": "...", "publicId": "..." }</c>
    /// và trả về <c>{ "text": "..." }</c>.
    [Required(AllowEmptyStrings = false)]
    public string Endpoint { get; set; } = string.Empty;

    /// API key gửi kèm (header "X-Api-Key") nếu provider yêu cầu.
    public string? ApiKey { get; set; }

    /// Timeout gọi provider (giây).
    [Range(1, 120)]
    public int TimeoutSeconds { get; set; } = 20;

    /// Thời gian cache kết quả OCR (giờ). Cùng một ảnh không OCR lại.
    [Range(1, 720)]
    public int CacheTtlHours { get; set; } = 168;

    /// Số ảnh tối đa được OCR cho một nội dung (tránh tốn thời gian/quota).
    [Range(1, 10)]
    public int MaxImagesPerContent { get; set; } = 3;

    /// Số ký tự tối đa của text OCR đưa vào prompt.
    [Range(100, 4000)]
    public int MaxOcrChars { get; set; } = 2000;
}
