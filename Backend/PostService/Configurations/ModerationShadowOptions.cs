namespace PostService.Configurations;

/// <summary>
/// Cấu hình shadow mode (Phase 3.3).
///
/// Shadow mode chạy MỘT lần gọi LLM thứ hai bằng model khác (model "bóng") và ghi
/// lại kết quả — nhưng **không áp dụng** kết quả đó lên nội dung. Mục tiêu là đo
/// độ chính xác của model/prompt mới trước khi bật nó làm mặc định, mà không làm
/// ảnh hưởng trải nghiệm người dùng trong thời gian thử nghiệm.
///
/// Ràng buộc an toàn:
///   - Kết quả shadow KHÔNG bao giờ quyết định trạng thái của nội dung.
///   - Lỗi shadow KHÔNG được làm fail quyết định chính (best-effort).
///
/// Bind từ section "Moderation:Shadow".
/// </summary>
public class ModerationShadowOptions
{
    public const string SectionName = "Moderation:Shadow";

    /// Bật/tắt shadow mode.
    public bool Enabled { get; set; } = false;

    /// Model dùng cho shadow run.
    public string Model { get; set; } = "deepseek-chat";

    /// Bật/tắt thinking mode cho shadow model.
    public bool EnableThinking { get; set; } = false;

    /// Mức độ suy luận của shadow model.
    public string ReasoningEffort { get; set; } = "medium";

    /// Phiên bản prompt dùng cho shadow run (để biết đang so sánh prompt nào).
    /// Null = dùng chung prompt hiện tại.
    public string? PromptVersion { get; set; }

    /// <summary>
    /// Tỉ lệ nội dung được chạy shadow (0.0 – 1.0).
    /// Chọn ngẫu nhiên có chủ đích ở đây (khác với A/B routing) vì mục tiêu là
    /// lấy mẫu đại diện, không cần tính đồng thuận giữa các bucket.
    /// </summary>
    public double SampleRate { get; set; } = 0.1;

    /// Số token tối đa cho shadow run (giữ nhỏ hơn để shadow rẻ).
    public int MaxCompletionTokens { get; set; } = 2048;
}
