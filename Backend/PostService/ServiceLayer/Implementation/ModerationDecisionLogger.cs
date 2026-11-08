using Microsoft.EntityFrameworkCore;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Hiện thực <see cref="IModerationDecisionLogger"/> — ghi vào bảng ModerationDecisionLog.
///
/// Ghi log là best-effort: nếu DB lỗi thì chỉ log warning, không ném exception ra
/// ngoài. Lý do: nhật ký phục vụ đo lường, không được phép làm hỏng việc kiểm duyệt.
/// </summary>
public class ModerationDecisionLogger : IModerationDecisionLogger
{
    private readonly PostDbContext _context;
    private readonly ILogger<ModerationDecisionLogger> _logger;

    public ModerationDecisionLogger(
        PostDbContext context,
        ILogger<ModerationDecisionLogger> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogAsync(
        ModerationResult result,
        ModerationStatus decision,
        ModerationSource source,
        string stage,
        Guid? actorId = null,
        string? actorRole = null,
        string? note = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var entry = new ModerationDecisionLog
            {
                Id = Guid.NewGuid(),
                ModerationResultId = result.Id,
                TargetId = result.TargetId,
                TargetType = result.TargetType,
                Decision = decision,
                Source = source,
                Stage = stage,
                InternalReasonCode = result.InternalReasonCode,
                LlmDecision = result.LlmDecision,
                Severity = result.Severity,
                Confidence = result.Confidence,
                Categories = result.Categories,
                ActorId = actorId,
                ActorRole = actorRole,
                Note = note,
                PromptVersion = result.PromptVersion,
                ModelName = result.ModelName,
                CreatedAt = DateTime.UtcNow,
            };

            _context.ModerationDecisionLogs.Add(entry);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Logged moderation decision for {TargetType} {TargetId}: decision={Decision} source={Source} stage={Stage} actor={ActorId}.",
                result.TargetType, result.TargetId, decision, source, stage, actorId);
        }
        catch (Exception ex)
        {
            // Nhật ký là best-effort — không được làm hỏng nghiệp vụ kiểm duyệt.
            _logger.LogWarning(ex,
                "Failed to write moderation decision log for {TargetType} {TargetId}.",
                result.TargetType, result.TargetId);
        }
    }
}
