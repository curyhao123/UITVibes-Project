using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Tạo / tái tạo bản ghi kiểm duyệt cho nội dung mới hoặc nội dung vừa được sửa.
/// Xem <see cref="IModerationEnqueuer"/> để hiểu quy ước.
/// </summary>
public class ModerationEnqueuer : IModerationEnqueuer
{
    private readonly PostDbContext _context;
    private readonly ModerationOptions _options;
    private readonly ILogger<ModerationEnqueuer> _logger;

    public ModerationEnqueuer(
        PostDbContext context,
        IOptions<ModerationOptions> options,
        ILogger<ModerationEnqueuer> logger)
    {
        _context = context;
        _options = options.Value;
        _logger = logger;
    }

    public async Task EnqueueAsync(
        ModerationTargetType targetType,
        Guid targetId,
        string? content,
        Action<ModerationStatus>? applyTargetStatus = null,
        CancellationToken cancellationToken = default)
    {
        await UpsertAsync(targetType, targetId, content, applyTargetStatus, cancellationToken);
    }

    public async Task ResubmitAsync(
        ModerationTargetType targetType,
        Guid targetId,
        string? content,
        Action<ModerationStatus>? applyTargetStatus = null,
        CancellationToken cancellationToken = default)
    {
        await UpsertAsync(targetType, targetId, content, applyTargetStatus, cancellationToken);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task UpsertAsync(
        ModerationTargetType targetType,
        Guid targetId,
        string? content,
        Action<ModerationStatus>? applyTargetStatus,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        // Moderation bị tắt: duyệt thẳng, không tạo bản ghi, không gọi LLM.
        if (!_options.Enabled)
        {
            applyTargetStatus?.Invoke(ModerationStatus.Approved);

            // Phải lưu lại: callback chỉ gán giá trị trên entity, nếu không SaveChanges
            // thì Post.ModerationStatus vẫn là Pending trong DB (bài sẽ vô hình với
            // người khác dù đã được duyệt thẳng).
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Moderation disabled — content {TargetType} {TargetId} approved without review.",
                targetType, targetId);
            return;
        }

        var existing = await _context.ModerationResults
            .FirstOrDefaultAsync(m => m.TargetId == targetId && m.TargetType == targetType, cancellationToken);

        if (existing is null)
        {
            existing = new ModerationResult
            {
                Id = Guid.NewGuid(),
                TargetId = targetId,
                TargetType = targetType,
                CreatedAt = now,
            };
            _context.ModerationResults.Add(existing);
        }

        // Reset về trạng thái "chờ xử lý" và xoá dấu vết của lần đánh giá trước.
        // LlmDecision / Severity / Confidence / Categories bị xoá vì chúng mô tả kết quả
        // của lần chạy cũ — giữ lại sẽ gây hiểu nhầm khi admin đọc hồ sơ.
        existing.Status = ModerationStatus.Pending;
        existing.Source = ModerationSource.Rule;
        existing.InternalReasonCode = "pending_worker";
        existing.LlmDecision = null;
        existing.Severity = null;
        existing.Confidence = null;
        existing.Categories = null;
        existing.AuthorReason = null;
        existing.AdminNote = null;
        existing.ReviewedBy = null;
        existing.ReviewedAt = null;
        existing.AttemptCount = 0;
        existing.LeaseExpiresAt = null;
        existing.WorkerId = null;
        existing.UpdatedAt = now;

        applyTargetStatus?.Invoke(ModerationStatus.Pending);

        _logger.LogInformation(
            "Enqueued {TargetType} {TargetId} for moderation (content length: {Length}).",
            targetType, targetId, content?.Length ?? 0);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
