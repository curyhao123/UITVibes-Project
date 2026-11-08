using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Hiện thực <see cref="IModerationReportService"/> — liên kết report ↔ hàng đợi kiểm duyệt.
///
/// Vì sao cần:
///   - Nội dung đăng lúc AI "ngoan" có thể vẫn vi phạm (ngữ cảnh đổi, model sai).
///     Người dùng report là tín hiệu đáng tin → đẩy lại vào hàng đợi kiểm duyệt.
///   - Nội dung bị report nhiều nên được admin xét trước → tăng điểm ưu tiên.
///
/// Ràng buộc:
///   - Chỉ nội dung ĐANG ĐƯỢC DUYỆT (Approved) mới được đẩy lại queue — nội dung
///     đã ở NeedsReview/Rejected thì không cần kiểm duyệt lại lần nữa.
///   - Best-effort: lỗi không được làm hỏng luồng report của người dùng.
/// </summary>
public class ModerationReportService : IModerationReportService
{
    private readonly PostDbContext _context;
    private readonly IModerationEnqueuer _enqueuer;
    private readonly ModerationReportOptions _options;
    private readonly ILogger<ModerationReportService> _logger;

    public ModerationReportService(
        PostDbContext context,
        IModerationEnqueuer enqueuer,
        IOptions<ModerationReportOptions> options,
        ILogger<ModerationReportService> logger)
    {
        _context = context;
        _enqueuer = enqueuer;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<bool> HandleReportAsync(
        Guid targetId,
        ModerationTargetType targetType,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
            return false;

        try
        {
            var pendingReports = await CountPendingReportsAsync(targetId, targetType);

            var moderation = await _context.ModerationResults
                .FirstOrDefaultAsync(
                    m => m.TargetId == targetId && m.TargetType == targetType,
                    cancellationToken);

            if (moderation is null)
                return false;

            // Cập nhật số report + điểm ưu tiên lên bản ghi kiểm duyệt.
            moderation.ReportCount = pendingReports;
            moderation.Priority = await ComputePriorityInternalAsync(
                targetId, targetType, pendingReports, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            // Đạt ngưỡng → đẩy lại vào hàng đợi để AI đánh giá lại.
            // Chỉ nội dung đang Approved mới cần — nội dung đã vào vùng xám thì admin
            // sẽ xử lý rồi.
            var shouldAutoQueue = _options.AutoQueueThreshold > 0
                && pendingReports >= _options.AutoQueueThreshold
                && moderation.Status == ModerationStatus.Approved;

            if (!shouldAutoQueue)
                return false;

            var content = await GetContentAsync(targetId, targetType, cancellationToken);

            await _enqueuer.ResubmitAsync(
                targetType,
                targetId,
                content,
                status => moderation.Status = status,
                cancellationToken);

            _logger.LogInformation(
                "Content {TargetType} {TargetId} auto-queued for re-moderation after {Count} reports.",
                targetType, targetId, pendingReports);

            return true;
        }
        catch (Exception ex)
        {
            // Best-effort — không được làm hỏng luồng report của người dùng.
            _logger.LogError(ex,
                "Failed to handle moderation report for {TargetType} {TargetId}.",
                targetType, targetId);
            return false;
        }
    }

    public async Task<int> ComputePriorityAsync(
        Guid targetId,
        ModerationTargetType targetType,
        CancellationToken cancellationToken = default)
    {
        var pendingReports = await CountPendingReportsAsync(targetId, targetType);
        return await ComputePriorityInternalAsync(targetId, targetType, pendingReports, cancellationToken);
    }

    /// <summary>
    /// Điểm ưu tiên = report × boost + severity × boost.
    /// Severity lấy từ bản ghi kiểm duyệt gần nhất (nếu có).
    /// </summary>
    private async Task<int> ComputePriorityInternalAsync(
        Guid targetId,
        ModerationTargetType targetType,
        int pendingReports,
        CancellationToken cancellationToken)
    {
        var cappedReports = Math.Min(pendingReports, Math.Max(0, _options.MaxReportsForPriority));

        var severity = await _context.ModerationResults
            .Where(m => m.TargetId == targetId && m.TargetType == targetType)
            .Select(m => (int?)m.Severity)
            .FirstOrDefaultAsync(cancellationToken) ?? 0;

        var reportBoost = cappedReports * Math.Max(0, _options.PriorityBoostPerReport);
        var severityBoost = severity * Math.Max(0, _options.PriorityBoostPerSeverity);

        return reportBoost + severityBoost;
    }

    /// <summary>
    /// Đếm số report đang mở (chưa xử lý) cho nội dung.
    /// Hiện chỉ hỗ trợ Post (bảng PostReport) — Comment/Reel chưa có bảng report riêng.
    /// </summary>
    private async Task<int> CountPendingReportsAsync(
        Guid targetId,
        ModerationTargetType targetType,
        CancellationToken cancellationToken = default)
    {
        if (targetType != ModerationTargetType.Post)
            return 0;

        return await _context.PostReports
            .CountAsync(
                r => r.PostId == targetId && r.Status == ReportStatus.Pending,
                cancellationToken);
    }

    /// <summary>
    /// Lấy nội dung text của nội dung bị report (để đưa vào hàng đợi kiểm duyệt).
    /// </summary>
    private async Task<string> GetContentAsync(
        Guid targetId,
        ModerationTargetType targetType,
        CancellationToken cancellationToken)
    {
        return targetType switch
        {
            ModerationTargetType.Post => await _context.Posts
                .Where(p => p.Id == targetId)
                .Select(p => p.Content)
                .FirstOrDefaultAsync(cancellationToken) ?? string.Empty,

            ModerationTargetType.Comment => await _context.Comments
                .Where(c => c.Id == targetId)
                .Select(c => c.Content)
                .FirstOrDefaultAsync(cancellationToken) ?? string.Empty,

            ModerationTargetType.Reel => await _context.Reels
                .Where(r => r.Id == targetId)
                .Select(r => r.Caption)
                .FirstOrDefaultAsync(cancellationToken) ?? string.Empty,

            _ => string.Empty
        };
    }
}
