using PostService.DTOs.Moderation;
using PostService.Enums;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Quản trị hàng đợi kiểm duyệt: xem nội dung đang chờ duyệt, thống kê, và
/// áp dụng quyết định của admin (duyệt / từ chối).
///
/// Quyết định của admin LUÔN được ghi đè lên quyết định của LLM — vì vậy
/// mọi thao tác ở đây đều là thao tác ghi (write) và phải được audit.
/// </summary>
public interface IModerationAdminService
{
    /// Lấy danh sách bản ghi kiểm duyệt theo bộ lọc. Mặc định sắp xếp theo
    /// thời điểm tạo tăng dần (bản ghi cũ được xét trước).
    /// </summary>
    Task<List<ModerationResultDto>> GetModerationResultsAsync(
        ModerationQueryFilter filter);

    /// Lấy chi tiết một bản ghi kiểm duyệt.
    /// </summary>
    Task<ModerationResultDto?> GetModerationResultByIdAsync(Guid moderationResultId);

    /// Thống kê tổng quan cho dashboard admin.
    /// </summary>
    Task<ModerationStatsDto> GetModerationStatsAsync(ModerationTargetType? targetType = null);

    /// Admin duyệt nội dung: chuyển sang Approved, nội dung hiển thị công khai.
    /// </summary>
    Task<ModerationResultDto> ApproveAsync(Guid moderationResultId, Guid adminId, string? adminNote = null);

    /// Admin từ chối nội dung: chuyển sang Rejected, nội dung bị ẩn khỏi feed.
    /// </summary>
    Task<ModerationResultDto> RejectAsync(Guid moderationResultId, Guid adminId, string? adminNote = null);
}