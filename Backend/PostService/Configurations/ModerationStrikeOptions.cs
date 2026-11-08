namespace PostService.Configurations;

/// <summary>
/// Cấu hình strike & tự động khoá tài khoản (Phase 3.5).
///
/// Nguyên tắc an toàn:
///   - Chỉ nội dung bị **admin xác nhận** vi phạm mới tính strike nặng. Nội dung
///     bị AI từ chối nhưng admin chưa xem chỉ tính strike nhẹ (hoặc không tính),
///     tránh khoá nhầm tài khoản do AI sai.
///   - Mặc định TẮT — bật khi đã sẵn sàng và đã thống nhất ngưỡng với admin.
///
/// Bind từ section "Moderation:Strikes".
/// </summary>
public class ModerationStrikeOptions
{
    public const string SectionName = "Moderation:Strikes";

    /// Bật/tắt hệ thống strike.
    public bool Enabled { get; set; } = false;

    /// Chỉ tính strike cho nội dung bị admin xác nhận (bỏ qua quyết định của AI).
    public bool RequireAdminConfirmation { get; set; } = true;

    /// Số strike tối đa được tính từ quyết định của AI (khi không yêu cầu admin xác nhận).
    public int AiConfirmedWeight { get; set; } = 0;

    /// Số strike cộng khi admin xác nhận vi phạm.
    public int AdminConfirmedWeight { get; set; } = 1;

    /// Số strike tối đa trước khi tài khoản bị khoá.
    public int BanThreshold { get; set; } = 3;

    /// Thời gian một strike còn hiệu lực (ngày). 0 = không hết hạn.
    public int StrikeExpiryDays { get; set; } = 90;

    /// Có gửi thông báo cho user khi bị khoá không.
    public bool NotifyOnBan { get; set; } = true;
}
