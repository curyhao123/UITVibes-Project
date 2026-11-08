using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.DTOs;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.Messaging.Interface;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Hiện thực <see cref="IModerationStrikeService"/> — cộng strike và tự động khoá tài khoản.
///
/// Quy tắc an toàn (rất quan trọng):
///   - Mặc định CHỈ tính strike khi admin xác nhận vi phạm. Lý do: AI có thể sai;
///     nếu khoá tài khoản dựa trên quyết định AI thì một lỗi model sẽ khóa oan
///     người dùng.
///   - Chỉ khi vượt ngưỡng mới publish event ban. Publish lỗi → nuốt, không ném.
/// </summary>
public class ModerationStrikeService : IModerationStrikeService
{
    private readonly PostDbContext _context;
    private readonly IUserBannedPublisher _bannedPublisher;
    private readonly ModerationStrikeOptions _options;
    private readonly ILogger<ModerationStrikeService> _logger;

    public ModerationStrikeService(
        PostDbContext context,
        IUserBannedPublisher bannedPublisher,
        IOptions<ModerationStrikeOptions> options,
        ILogger<ModerationStrikeService> logger)
    {
        _context = context;
        _bannedPublisher = bannedPublisher;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ModerationStrikeResultDto> RecordViolationAsync(
        Guid userId,
        Guid targetId,
        ModerationTargetType targetType,
        Guid? moderationResultId,
        int? severity,
        ModerationSource source,
        string reasonCode,
        CancellationToken cancellationToken = default)
    {
        var result = new ModerationStrikeResultDto
        {
            UserId = userId,
            BanThreshold = _options.BanThreshold,
            Enabled = _options.Enabled
        };

        if (!_options.Enabled || userId == Guid.Empty)
            return result;

        var weight = ResolveWeight(source);

        // Weight = 0 → không cộng strike (ví dụ AI chặn nhưng chưa có admin xác nhận).
        if (weight <= 0)
        {
            _logger.LogInformation(
                "Strike skipped for user {UserId}: weight is 0 for source {Source}.", userId, source);
            return await GetStrikeStatusAsync(userId);
        }

        var strike = new UserStrike
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TargetId = targetId,
            TargetType = (int)targetType,
            ModerationResultId = moderationResultId,
            Severity = severity ?? 0,
            Weight = weight,
            ReasonCode = reasonCode,
            IssuedBy = source == ModerationSource.Human ? "Admin" : "System",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = _options.StrikeExpiryDays > 0
                ? DateTime.UtcNow.AddDays(_options.StrikeExpiryDays)
                : null
        };

        _context.UserStrikes.Add(strike);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Recorded strike for user {UserId} (weight {Weight}, reason {ReasonCode}, target {TargetType} {TargetId}).",
            userId, weight, reasonCode, targetType, targetId);

        result = await GetStrikeStatusAsync(userId);

        // Đủ ngưỡng → khoá tài khoản.
        if (result.ShouldBeBanned && !result.IsBanned)
        {
            await BanUserAsync(userId, result.ActiveStrikeWeight, cancellationToken);
            result.IsBanned = true;
        }

        return result;
    }

    public async Task<ModerationStrikeResultDto> GetStrikeStatusAsync(Guid userId)
    {
        var result = new ModerationStrikeResultDto
        {
            UserId = userId,
            BanThreshold = _options.BanThreshold,
            Enabled = _options.Enabled
        };

        var now = DateTime.UtcNow;

        var activeStrikes = await _context.UserStrikes
            .Where(s => s.UserId == userId
                     && !s.IsRevoked
                     && (s.ExpiresAt == null || s.ExpiresAt > now))
            .ToListAsync();

        result.ActiveStrikeCount = activeStrikes.Count;
        result.ActiveStrikeWeight = activeStrikes.Sum(s => s.Weight);
        result.ShouldBeBanned = _options.Enabled
            && result.ActiveStrikeWeight >= _options.BanThreshold
            && _options.BanThreshold > 0;

        return result;
    }

    public async Task<int> RevokeStrikesAsync(
        Guid userId,
        Guid? moderationResultId,
        string? reason)
    {
        var query = _context.UserStrikes.Where(s => s.UserId == userId && !s.IsRevoked);

        if (moderationResultId.HasValue)
            query = query.Where(s => s.ModerationResultId == moderationResultId.Value);

        var strikes = await query.ToListAsync();

        foreach (var strike in strikes)
        {
            strike.IsRevoked = true;
            strike.RevokedReason = reason;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Revoked {Count} strike(s) for user {UserId}. Reason: {Reason}", strikes.Count, userId, reason);

        return strikes.Count;
    }

    public async Task<List<ModerationStrikeEntryDto>> GetTopViolatorsAsync(int take = 20)
    {
        var now = DateTime.UtcNow;

        var query = _context.UserStrikes
            .Where(s => !s.IsRevoked && (s.ExpiresAt == null || s.ExpiresAt > now))
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, Weight = g.Sum(s => s.Weight), Count = g.Count() })
            .OrderByDescending(x => x.Weight)
            .Take(Math.Clamp(take, 1, 100));

        var top = await query.ToListAsync();

        // Lấy chi tiết strike mới nhất của mỗi user để admin có ngữ cảnh.
        var entries = new List<ModerationStrikeEntryDto>();

        foreach (var item in top)
        {
            var latest = await _context.UserStrikes
                .Where(s => s.UserId == item.UserId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            if (latest is null)
                continue;

            entries.Add(new ModerationStrikeEntryDto
            {
                Id = latest.Id,
                UserId = latest.UserId,
                TargetId = latest.TargetId,
                TargetType = ((ModerationTargetType)latest.TargetType).ToString(),
                Severity = latest.Severity,
                Weight = latest.Weight,
                ReasonCode = latest.ReasonCode,
                IssuedBy = latest.IssuedBy,
                IsRevoked = latest.IsRevoked,
                CreatedAt = latest.CreatedAt,
                ExpiresAt = latest.ExpiresAt
            });
        }

        return entries;
    }

    /// <summary>
    /// Trọng số strike cho một quyết định.
    /// - Admin xác nhận → <see cref="ModerationStrikeOptions.AdminConfirmedWeight"/>.
    /// - AI tự quyết định → <see cref="ModerationStrikeOptions.AiConfirmedWeight"/>
    ///   (mặc định 0 → không tính, tránh khoá oan do AI sai).
    /// </summary>
    private int ResolveWeight(ModerationSource source)
    {
        if (source == ModerationSource.Human)
            return Math.Max(0, _options.AdminConfirmedWeight);

        if (_options.RequireAdminConfirmation)
            return Math.Max(0, _options.AiConfirmedWeight);

        return source switch
        {
            ModerationSource.Rule => Math.Max(0, _options.AiConfirmedWeight),
            ModerationSource.Llm => Math.Max(0, _options.AiConfirmedWeight),
            _ => 0
        };
    }

    /// <summary>
    /// Khoá tài khoản bằng cách publish event "user.banned".
    /// Best-effort: lỗi publish được log và nuốt — không ném ra ngoài.
    /// </summary>
    private async Task BanUserAsync(Guid userId, int strikeWeight, CancellationToken cancellationToken)
    {
        try
        {
            await _bannedPublisher.PublishAsync(
                new UserBannedEvent
                {
                    UserId = userId,
                    IsBanned = true,
                    Reason = $"Your account has been suspended for repeatedly violating community guidelines ({strikeWeight} violations).",
                    UpdatedAt = DateTime.UtcNow
                },
                cancellationToken);

            _logger.LogWarning(
                "User {UserId} banned automatically after accumulating {StrikeWeight} strike(s).",
                userId, strikeWeight);
        }
        catch (Exception ex)
        {
            // Không ném — admin sẽ xử lý thủ công nếu publish lỗi.
            _logger.LogError(ex,
                "Failed to publish ban event for user {UserId}. Manual action required.", userId);
        }
    }
}
