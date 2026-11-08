using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Trích text từ ảnh (OCR) để đưa vào pipeline kiểm duyệt text (Phase 3.0).
///
/// Vì sao OCR thay vì vision model:
///   - Rẻ hơn nhiều (1 lần OCR cho 1 ảnh, không sinh token ra).
///   - Tái sử dụng được toàn bộ pipeline sẵn có (rule filter → LLM).
///   - Bắt được phần rủi ro cao nhất: đề thi, điểm, căn cước, số điện thoại,
///     email, đường dẫn đáng ngờ nằm trong ảnh.
///
/// Kết quả được cache theo URL ảnh để không OCR lại cùng một ảnh.
/// </summary>
public interface IOcrService
{
    /// <summary>
    /// Trích text từ một ảnh. Trả về null nếu không có text hoặc provider lỗi.
    /// </summary>
    Task<string?> ExtractTextAsync(
        string imageUrl,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Trích text từ nhiều ảnh và ghép lại thành một khối text.
    /// Trả về chuỗi rỗng nếu không ảnh nào có text.
    /// </summary>
    Task<string> ExtractTextFromImagesAsync(
        IEnumerable<string> imageUrls,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Bật/tắt OCR — quyết định có ghép OCR text vào nội dung hay không.
    /// </summary>
    bool IsEnabled { get; }
}
