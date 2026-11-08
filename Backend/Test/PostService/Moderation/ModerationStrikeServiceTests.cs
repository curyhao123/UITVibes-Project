using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PostService.Configurations;
using PostService.DTOs;
using PostService.Enums;
using PostService.Messaging.Interface;
using PostService.Models;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho <see cref="ModerationStrikeService"/> — strike + tự động khoá tài khoản
/// (Phase 3.5).
///
/// Hành vi cần bảo vệ:
///   1. Quyết định của AI KHÔNG cộng strike khi yêu cầu admin xác nhận (tránh khoá oan).
///   2. Quyết định của admin cộng strike đúng trọng số.
///   3. Vượt ngưỡng → publish event `user.banned` đúng payload.
///   4. Strike hết hạn / bị thu hồi không còn tính vào ngưỡng.
///   5. Lỗi publish ban không được làm hỏng luồng strike.
/// </summary>
public class ModerationStrikeServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PostDbContext _context;
    private readonly Mock<IUserBannedPublisher> _bannedPublisher;

    public ModerationStrikeServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new PostDbContext(options);
        _context.Database.EnsureCreated();

        _bannedPublisher = new Mock<IUserBannedPublisher>();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task RecordViolationAsync_WhenAdminConfirmationRequired_AiDecisionAddsNoStrike()
    {
        var service = CreateService(requireAdminConfirmation: true, aiWeight: 0, adminWeight: 1);
        var userId = Guid.NewGuid();

        var result = await service.RecordViolationAsync(
            userId, Guid.NewGuid(), ModerationTargetType.Post, null, 3,
            ModerationSource.Llm, "llm_reject");

        Assert.Equal(0, result.ActiveStrikeCount);
        Assert.Equal(0, result.ActiveStrikeWeight);
        Assert.False(result.ShouldBeBanned);
        Assert.Empty(_context.UserStrikes);
    }

    [Fact]
    public async Task RecordViolationAsync_WhenAdminDecides_AddsStrike()
    {
        var service = CreateService(requireAdminConfirmation: true, aiWeight: 0, adminWeight: 1);
        var userId = Guid.NewGuid();

        var result = await service.RecordViolationAsync(
            userId, Guid.NewGuid(), ModerationTargetType.Post, null, 2,
            ModerationSource.Human, "admin_reject");

        Assert.Equal(1, result.ActiveStrikeCount);
        Assert.Equal(1, result.ActiveStrikeWeight);
        Assert.Single(_context.UserStrikes);
    }

    [Fact]
    public async Task RecordViolationAsync_WhenThresholdReached_PublishesBanEvent()
    {
        var service = CreateService(requireAdminConfirmation: true, aiWeight: 0, adminWeight: 1, banThreshold: 2);
        var userId = Guid.NewGuid();

        await service.RecordViolationAsync(
            userId, Guid.NewGuid(), ModerationTargetType.Post, null, 2,
            ModerationSource.Human, "admin_reject");

        _bannedPublisher.Verify(p => p.PublishAsync(
            It.Is<UserBannedEvent>(e =>
                e.UserId == userId &&
                e.IsBanned &&
                !string.IsNullOrWhiteSpace(e.Reason)),
            It.IsAny<CancellationToken>()), Times.Never);

        await service.RecordViolationAsync(
            userId, Guid.NewGuid(), ModerationTargetType.Post, null, 2,
            ModerationSource.Human, "admin_reject");

        _bannedPublisher.Verify(p => p.PublishAsync(
            It.Is<UserBannedEvent>(e => e.UserId == userId && e.IsBanned),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RecordViolationAsync_WhenPublisherThrows_DoesNotThrow()
    {
        _bannedPublisher
            .Setup(p => p.PublishAsync(It.IsAny<UserBannedEvent>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("rabbit down"));

        var service = CreateService(requireAdminConfirmation: true, aiWeight: 0, adminWeight: 1, banThreshold: 1);
        var userId = Guid.NewGuid();

        var result = await service.RecordViolationAsync(
            userId, Guid.NewGuid(), ModerationTargetType.Post, null, 3,
            ModerationSource.Human, "admin_reject");

        Assert.Equal(1, result.ActiveStrikeCount);
    }

    [Fact]
    public async Task GetStrikeStatusAsync_IgnoresExpiredStrikes()
    {
        var service = CreateService();
        var userId = Guid.NewGuid();

        _context.UserStrikes.Add(new UserStrike
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TargetId = Guid.NewGuid(),
            TargetType = (int)ModerationTargetType.Post,
            Severity = 2,
            Weight = 1,
            ReasonCode = "admin_reject",
            IssuedBy = "Admin",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            ExpiresAt = DateTime.UtcNow.AddDays(-1)
        });
        await _context.SaveChangesAsync();

        var status = await service.GetStrikeStatusAsync(userId);

        Assert.Equal(0, status.ActiveStrikeCount);
        Assert.Equal(0, status.ActiveStrikeWeight);
    }

    [Fact]
    public async Task RevokeStrikesAsync_RemovesStrikeFromActiveWeight()
    {
        var service = CreateService();
        var userId = Guid.NewGuid();

        await service.RecordViolationAsync(
            userId, Guid.NewGuid(), ModerationTargetType.Post, null, 2,
            ModerationSource.Human, "admin_reject");

        var revoked = await service.RevokeStrikesAsync(userId, null, "khiếu nại hợp lệ");

        Assert.Equal(1, revoked);

        var status = await service.GetStrikeStatusAsync(userId);
        Assert.Equal(0, status.ActiveStrikeWeight);
    }

    [Fact]
    public async Task GetTopViolatorsAsync_ReturnsHighestWeightFirst()
    {
        var service = CreateService();
        var lightUser = Guid.NewGuid();
        var heavyUser = Guid.NewGuid();

        await service.RecordViolationAsync(
            lightUser, Guid.NewGuid(), ModerationTargetType.Post, null, 1,
            ModerationSource.Human, "admin_reject");

        await service.RecordViolationAsync(
            heavyUser, Guid.NewGuid(), ModerationTargetType.Post, null, 3,
            ModerationSource.Human, "admin_reject");
        await service.RecordViolationAsync(
            heavyUser, Guid.NewGuid(), ModerationTargetType.Post, null, 3,
            ModerationSource.Human, "admin_reject");

        var top = await service.GetTopViolatorsAsync(10);

        Assert.Equal(2, top.Count);
        Assert.Equal(heavyUser, top[0].UserId);
    }

    [Fact]
    public async Task RecordViolationAsync_WhenDisabled_DoesNothing()
    {
        var service = CreateService(enabled: false);
        var userId = Guid.NewGuid();

        var result = await service.RecordViolationAsync(
            userId, Guid.NewGuid(), ModerationTargetType.Post, null, 3,
            ModerationSource.Human, "admin_reject");

        Assert.False(result.Enabled);
        Assert.Equal(0, result.ActiveStrikeCount);
        Assert.Empty(_context.UserStrikes);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ModerationStrikeService CreateService(
        bool enabled = true,
        bool requireAdminConfirmation = true,
        int aiWeight = 0,
        int adminWeight = 1,
        int banThreshold = 3)
    {
        return new ModerationStrikeService(
            _context,
            _bannedPublisher.Object,
            Options.Create(new ModerationStrikeOptions
            {
                Enabled = enabled,
                RequireAdminConfirmation = requireAdminConfirmation,
                AiConfirmedWeight = aiWeight,
                AdminConfirmedWeight = adminWeight,
                BanThreshold = banThreshold,
                StrikeExpiryDays = 90
            }),
            NullLogger<ModerationStrikeService>.Instance);
    }
}
