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
    /// Gỡ đúng một bản ghi strike theo id (dùng khi admin gỡ từng lỗi trong lịch sử).
    /// </summary>
    Task<int> RevokeStrikeByIdAsync(Guid userId, Guid strikeId, string? reason);

    /// <summary>
    /// Danh sách tài khoản bị khoá do vi phạm kiểm duyệt (dùng cho admin).
    /// </summary>
    Task<List<ModerationStrikeEntryDto>> GetTopViolatorsAsync(int take = 20);

    /// <summary>
    /// Danh sách tài khoản đang tích lũy strike, gom theo tài khoản (mức "Strike Manager").
    /// </summary>
    Task<List<ModerationStrikeUserDto>> GetStrikeUsersAsync(int take = 50);

    /// <summary>
    /// Toàn bộ lịch sử strike của một tài khoản (mới nhất trước).
    /// </summary>
    Task<List<ModerationStrikeEntryDto>> GetStrikeHistoryAsync(Guid userId, int take = 50);

    /// <summary>
    /// Số tài khoản hiện đang vượt ngưỡng khoá (chưa bị ban) — dùng cho dashboard.
    /// </summary>
    Task<int> CountUsersOverThresholdAsync();

    /// <summary>
    /// Admin khoá/gỡ khoá tài khoản thủ công từ Strike Manager.
    /// Không đụng vào strike — chỉ đổi trạng thái ban.
    /// </summary>
    Task<bool> SetBannedAsync(Guid userId, bool isBanned, string? reason);
}
