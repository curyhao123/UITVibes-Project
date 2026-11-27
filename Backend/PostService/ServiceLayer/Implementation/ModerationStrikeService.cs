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
    private readonly IUserProfileRpcClient _userProfileRpcClient;
    private readonly ModerationStrikeOptions _options;
    private readonly ILogger<ModerationStrikeService> _logger;

    public ModerationStrikeService(
        PostDbContext context,
        IUserBannedPublisher bannedPublisher,
        IUserProfileRpcClient userProfileRpcClient,
        IOptions<ModerationStrikeOptions> options,
        ILogger<ModerationStrikeService> logger)
    {
        _context = context;
        _bannedPublisher = bannedPublisher;
        _userProfileRpcClient = userProfileRpcClient;
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

    public async Task<int> RevokeStrikeByIdAsync(Guid userId, Guid strikeId, string? reason)
    {
        var strike = await _context.UserStrikes
            .FirstOrDefaultAsync(s => s.Id == strikeId && s.UserId == userId && !s.IsRevoked);

        if (strike is null)
            return 0;

        strike.IsRevoked = true;
        strike.RevokedReason = reason;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Revoked strike {StrikeId} for user {UserId}. Reason: {Reason}", strikeId, userId, reason);

        return 1;
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

    public async Task<List<ModerationStrikeUserDto>> GetStrikeUsersAsync(int take = 50)
    {
        var now = DateTime.UtcNow;

        var grouped = await _context.UserStrikes
            .Where(s => !s.IsRevoked && (s.ExpiresAt == null || s.ExpiresAt > now))
            .GroupBy(s => s.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Count = g.Count(),
                Weight = g.Sum(s => s.Weight)
            })
            .OrderByDescending(x => x.Weight)
            .ThenByDescending(x => x.Count)
            .Take(Math.Clamp(take, 1, 200))
            .ToListAsync();

        if (grouped.Count == 0)
            return new List<ModerationStrikeUserDto>();

        var userIds = grouped.Select(g => g.UserId).ToList();

        var profiles = await Task.WhenAll(
            userIds.Select(id => _userProfileRpcClient.GetProfileAsync(id)));

        var profileLookup = userIds
            .Zip(profiles, (id, profile) => new { id, profile })
            .ToDictionary(x => x.id, x => x.profile);

        // Lấy bản ghi strike mới nhất của mỗi tài khoản để làm "đại diện".
        // Gom trong memory thay vì dùng GroupBy + First() — mẫu đó không dịch được
        // sang SQL trong một số trường hợp.
        var recentStrikes = await _context.UserStrikes
            .Where(s => userIds.Contains(s.UserId))
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        var latestLookup = new Dictionary<Guid, UserStrike>();
        foreach (var strike in recentStrikes)
        {
            if (!latestLookup.ContainsKey(strike.UserId))
                latestLookup[strike.UserId] = strike;
        }

        var result = new List<ModerationStrikeUserDto>();

        foreach (var item in grouped)
        {
            var profile = profileLookup.GetValueOrDefault(item.UserId);
            var latest = latestLookup.GetValueOrDefault(item.UserId);

            result.Add(new ModerationStrikeUserDto
            {
                UserId = item.UserId,
                DisplayName = profile?.DisplayName ?? string.Empty,
                AvatarUrl = profile?.AvatarUrl ?? string.Empty,
                IsBanned = profile?.IsBanned ?? false,
                ActiveStrikeCount = item.Count,
                ActiveStrikeWeight = item.Weight,
                BanThreshold = _options.BanThreshold,
                ShouldBeBanned = _options.Enabled
                    && _options.BanThreshold > 0
                    && item.Weight >= _options.BanThreshold,
                LastViolationAt = latest?.CreatedAt,
                LatestStrike = latest == null ? null : MapToEntry(latest)
            });
        }

        return result;
    }

    public async Task<List<ModerationStrikeEntryDto>> GetStrikeHistoryAsync(Guid userId, int take = 50)
    {
        var strikes = await _context.UserStrikes
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .Take(Math.Clamp(take, 1, 200))
            .ToListAsync();

        return strikes.Select(MapToEntry).ToList();
    }

    public async Task<int> CountUsersOverThresholdAsync()
    {
        if (!_options.Enabled || _options.BanThreshold <= 0)
            return 0;

        var now = DateTime.UtcNow;

        var grouped = await _context.UserStrikes
            .Where(s => !s.IsRevoked && (s.ExpiresAt == null || s.ExpiresAt > now))
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, Weight = g.Sum(s => s.Weight) })
            .ToListAsync();

        return grouped.Count(g => g.Weight >= _options.BanThreshold);
    }

    private static ModerationStrikeEntryDto MapToEntry(UserStrike strike) => new()
    {
        Id = strike.Id,
        UserId = strike.UserId,
        TargetId = strike.TargetId,
        TargetType = ((ModerationTargetType)strike.TargetType).ToString(),
        Severity = strike.Severity,
        Weight = strike.Weight,
        ReasonCode = strike.ReasonCode,
        IssuedBy = strike.IssuedBy,
        IsRevoked = strike.IsRevoked,
        CreatedAt = strike.CreatedAt,
        ExpiresAt = strike.ExpiresAt
    };

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

    public async Task<bool> SetBannedAsync(Guid userId, bool isBanned, string? reason)
    {
        if (userId == Guid.Empty)
            return false;

        try
        {
            await _bannedPublisher.PublishAsync(
                new UserBannedEvent
                {
                    UserId = userId,
                    IsBanned = isBanned,
                    Reason = reason,
                    UpdatedAt = DateTime.UtcNow
                });

            _logger.LogInformation(
                "Admin manually set IsBanned={IsBanned} for user {UserId}.", isBanned, userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to publish manual ban state change for user {UserId}.", userId);
            return false;
        }
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
