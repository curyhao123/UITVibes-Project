using Microsoft.EntityFrameworkCore;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Hiện thực luồng khiếu nại dành cho tác giả nội dung.
///
/// Nguyên tắc quan trọng: khiếu nại KHÔNG tự đảo ngược quyết định của AI.
/// Nó chỉ chuyển bản ghi sang vùng xám (NeedsReview) để admin xử lại — đây là
/// điểm khác biệt so với việc tác giả sửa nội dung rồi resubmit.
/// </summary>
public class ModerationAppealService : IModerationAppealService
{
    private const int ReasonMaxLength = 500;

    private readonly PostDbContext _context;
    private readonly IModerationTargetAccessor _targetAccessor;
    private readonly ILogger<ModerationAppealService> _logger;

    public ModerationAppealService(
        PostDbContext context,
        IModerationTargetAccessor targetAccessor,
        ILogger<ModerationAppealService> logger)
    {
        _context = context;
        _targetAccessor = targetAccessor;
        _logger = logger;
    }

    public async Task<ModerationAppealResultDto> SubmitAppealAsync(
        Guid moderationResultId,
        Guid userId,
        string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Appeal reason is required");

        var trimmed = reason.Trim();
        if (trimmed.Length > ReasonMaxLength)
            trimmed = trimmed[..ReasonMaxLength];

        var result = await _context.ModerationResults
            .FirstOrDefaultAsync(m => m.Id == moderationResultId);

        if (result == null)
            throw new KeyNotFoundException("Moderation result not found");

        // Chỉ tác giả của chính nội dung mới được khiếu nại.
        var authorId = await _targetAccessor.GetAuthorIdAsync(
            _context, result.TargetType, result.TargetId);

        if (authorId == null)
            throw new KeyNotFoundException("Moderated content not found");

        if (authorId.Value != userId)
            throw new UnauthorizedAccessException("You can only appeal your own content");

        // Chỉ khiếu nại được khi nội dung đang bị từ chối.
        if (result.Status != ModerationStatus.Rejected)
            throw new InvalidOperationException("Only rejected content can be appealed");

        // Mỗi bản ghi chỉ có một khiếu nại đang chờ xử lý — tránh spam khiếu nại.
        if (result.AppealStatus == ModerationAppealStatus.Pending)
            throw new InvalidOperationException("An appeal for this content is already pending");

        var now = DateTime.UtcNow;

        result.AppealStatus = ModerationAppealStatus.Pending;
        result.AppealReason = trimmed;
        result.AppealSubmittedAt = now;
        result.AppealResolvedAt = null;
        result.InternalReasonCode = "author_appeal";
        result.UpdatedAt = now;

        // Nội dung vào vùng xám để admin quyết định lần cuối.
        result.Status = ModerationStatus.NeedsReview;

        // Đồng bộ trạng thái trên chính entity của nội dung.
        await _targetAccessor.ApplyStatusAsync(
            _context,
            result.TargetType,
            result.TargetId,
            ModerationStatus.NeedsReview,
            now);

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "User {UserId} submitted an appeal for moderation result {ModerationId} (target {TargetType} {TargetId})",
            userId, moderationResultId, result.TargetType, result.TargetId);

        return MapToDto(result);
    }

    public async Task<ModerationAppealResultDto?> GetAppealAsync(Guid moderationResultId, Guid userId)
    {
        var result = await _context.ModerationResults
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == moderationResultId);

        if (result == null)
            return null;

        var authorId = await _targetAccessor.GetAuthorIdAsync(
            _context, result.TargetType, result.TargetId);

        // Chỉ tác giả (và admin, xem qua API admin) được xem chi tiết khiếu nại.
        if (authorId != userId)
            throw new UnauthorizedAccessException("You can only view appeals for your own content");

        return MapToDto(result);
    }

    private static ModerationAppealResultDto MapToDto(ModerationResult result) => new()
    {
        ModerationResultId = result.Id,
        TargetId = result.TargetId,
        TargetType = result.TargetType,
        AppealStatus = result.AppealStatus.ToString(),
        AppealReason = result.AppealReason,
        AppealSubmittedAt = result.AppealSubmittedAt,
        AppealResolvedAt = result.AppealResolvedAt,
        ModerationStatus = result.Status.ToString()
    };
}
