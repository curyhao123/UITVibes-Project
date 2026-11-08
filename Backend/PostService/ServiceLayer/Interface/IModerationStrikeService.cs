using PostService.DTOs.Moderation;
using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Hệ thống strike & tự động khoá tài khoản (Phase 3.5).
///
/// Luồng:
///   Nội dung bị từ chối → cộng strike cho tác giả → nếu tổng strike còn hiệu lực
///   vượt ngưỡng → publish event "user.banned" để AuthService khoá tài khoản.
/// </summary>
public interface IModerationStrikeService
{
    /// <summary>
    /// Ghi nhận một vi phạm và cộng strike cho tác giả.
    ///
    /// Trả về kết quả gồm tổng strike còn hiệu lực và trạng thái khoá.
    /// </summary>
    Task<ModerationStrikeResultDto> RecordViolationAsync(
        Guid userId,
        Guid targetId,
        ModerationTargetType targetType,
        Guid? moderationResultId,
        int? severity,
        ModerationSource source,
        string reasonCode,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Lấy thông tin strike của một tài khoản (dùng cho màn hình admin).
    /// </summary>
    Task<ModerationStrikeResultDto> GetStrikeStatusAsync(Guid userId);

    /// <summary>
    /// Xoá (gỡ) strike của một tài khoản — dùng khi khiếu nại thành công hoặc
    /// admin nhận ra AI sai.
    /// </summary>
    Task<int> RevokeStrikesAsync(Guid userId, Guid? moderationResultId, string? reason);

    /// <summary>
    /// Danh sách tài khoản bị khoá do vi phạm kiểm duyệt (dùng cho admin).
    /// </summary>
    Task<List<ModerationStrikeEntryDto>> GetTopViolatorsAsync(int take = 20);
}
