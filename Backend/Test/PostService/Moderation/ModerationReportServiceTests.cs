using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PostService.Configurations;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Implementation;
using PostService.ServiceLayer.Interface;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho <see cref="ModerationReportService"/> — liên kết report ↔ hàng đợi
/// kiểm duyệt (Phase 3.6).
///
/// Hành vi cần bảo vệ:
///   1. Khi còn lướt bị tắt → không đẩy vào queue, không đổi ưu tiên.
///   2. Khi đủ ngưỡng report → nội dung được đẩy lại hàng đợi kiểm duyệt.
///   3. Nội dung đã ở vùng xám / đã từ chối → không đẩy lại (admin sẽ xử lý).
///   4. Điểm ưu tiên = report × boost + severity × boost.
///   5. Lỗi nội bộ không được làm hỏng luồng report của người dùng.
/// </summary>
public class ModerationReportServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PostDbContext _context;
    private readonly Mock<IModerationEnqueuer> _enqueuer;

    public ModerationReportServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new PostDbContext(options);
        _context.Database.EnsureCreated();

        _enqueuer = new Mock<IModerationEnqueuer>();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task HandleReportAsync_WhenFeatureDisabled_DoesNothing()
    {
        var post = await SeedPostAsync(ModerationStatus.Approved);
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());

        var service = CreateService(enabled: false);

        var queued = await service.HandleReportAsync(post.Id, ModerationTargetType.Post);

        Assert.False(queued);
        _enqueuer.Verify(e => e.ResubmitAsync(
            It.IsAny<ModerationTargetType>(),
            It.IsAny<Guid>(),
            It.IsAny<string?>(),
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleReportAsync_BelowThreshold_OnlyUpdatesPriority()
    {
        var post = await SeedPostAsync(ModerationStatus.Approved);
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());

        var service = CreateService(enabled: true, autoQueueThreshold: 3);

        var queued = await service.HandleReportAsync(post.Id, ModerationTargetType.Post);

        Assert.False(queued);
        _enqueuer.Verify(e => e.ResubmitAsync(
            It.IsAny<ModerationTargetType>(),
            It.IsAny<Guid>(),
            It.IsAny<string?>(),
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Never);

        var moderation = await _context.ModerationResults.FirstAsync();
        Assert.Equal(1, moderation.ReportCount);
        Assert.True(moderation.Priority > 0);
    }

    [Fact]
    public async Task HandleReportAsync_ReachingThreshold_RequeuesContent()
    {
        var post = await SeedPostAsync(ModerationStatus.Approved);
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());

        var service = CreateService(enabled: true, autoQueueThreshold: 3);

        var queued = await service.HandleReportAsync(post.Id, ModerationTargetType.Post);

        Assert.True(queued);
        _enqueuer.Verify(e => e.ResubmitAsync(
            ModerationTargetType.Post,
            post.Id,
            It.IsAny<string?>(),
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleReportAsync_WhenAlreadyNeedsReview_DoesNotRequeue()
    {
        var post = await SeedPostAsync(ModerationStatus.NeedsReview);
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());

        var service = CreateService(enabled: true, autoQueueThreshold: 3);

        var queued = await service.HandleReportAsync(post.Id, ModerationTargetType.Post);

        Assert.False(queued);
        _enqueuer.Verify(e => e.ResubmitAsync(
            It.IsAny<ModerationTargetType>(),
            It.IsAny<Guid>(),
            It.IsAny<string?>(),
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleReportAsync_WhenTargetHasNoModerationRecord_DoesNothing()
    {
        var post = await SeedPostAsync(ModerationStatus.Approved, createModerationResult: false);
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());

        var service = CreateService(enabled: true, autoQueueThreshold: 1);

        var queued = await service.HandleReportAsync(post.Id, ModerationTargetType.Post);

        Assert.False(queued);
        _enqueuer.Verify(e => e.ResubmitAsync(
            It.IsAny<ModerationTargetType>(),
            It.IsAny<Guid>(),
            It.IsAny<string?>(),
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleReportAsync_WhenEnqueuerThrows_ReturnsFalseWithoutThrowing()
    {
        var post = await SeedPostAsync(ModerationStatus.Approved);
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());

        _enqueuer
            .Setup(e => e.ResubmitAsync(
                It.IsAny<ModerationTargetType>(),
                It.IsAny<Guid>(),
                It.IsAny<string?>(),
                It.IsAny<Action<ModerationStatus>>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        var service = CreateService(enabled: true, autoQueueThreshold: 1);

        var queued = await service.HandleReportAsync(post.Id, ModerationTargetType.Post);

        Assert.False(queued);
    }

    [Fact]
    public async Task ComputePriorityAsync_CountsReportsAndSeverity()
    {
        var post = await SeedPostAsync(ModerationStatus.Approved, severity: 2);
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());
        await SeedPendingReportAsync(post.Id, Guid.NewGuid());

        var service = CreateService(enabled: true, priorityBoostPerReport: 10, priorityBoostPerSeverity: 1);

        var priority = await service.ComputePriorityAsync(post.Id, ModerationTargetType.Post);

        // 2 report × 10 + severity 2 × 1 = 22
        Assert.Equal(22, priority);
    }

    [Fact]
    public async Task ComputePriorityAsync_CapsReportsAtMax()
    {
        var post = await SeedPostAsync(ModerationStatus.Approved);
        for (var i = 0; i < 5; i++)
            await SeedPendingReportAsync(post.Id, Guid.NewGuid());

        var service = CreateService(enabled: true, priorityBoostPerReport: 10, maxReportsForPriority: 2);

        var priority = await service.ComputePriorityAsync(post.Id, ModerationTargetType.Post);

        Assert.Equal(20, priority);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ModerationReportService CreateService(
        bool enabled,
        int autoQueueThreshold = 3,
        int priorityBoostPerReport = 10,
        int priorityBoostPerSeverity = 1,
        int maxReportsForPriority = 20)
    {
        return new ModerationReportService(
            _context,
            _enqueuer.Object,
            Options.Create(new ModerationReportOptions
            {
                Enabled = enabled,
                AutoQueueThreshold = autoQueueThreshold,
                PriorityBoostPerReport = priorityBoostPerReport,
                PriorityBoostPerSeverity = priorityBoostPerSeverity,
                MaxReportsForPriority = maxReportsForPriority
            }),
            NullLogger<ModerationReportService>.Instance);
    }

    private async Task<Post> SeedPostAsync(
        ModerationStatus status,
        int severity = 0,
        bool createModerationResult = true)
    {
        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Content = "nội dung",
            Visibility = PostVisibility.Public,
            PostType = PostType.Original,
            ModerationStatus = status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Posts.Add(post);

        if (createModerationResult)
        {
            _context.ModerationResults.Add(new ModerationResult
            {
                Id = Guid.NewGuid(),
                TargetId = post.Id,
                TargetType = ModerationTargetType.Post,
                Status = status,
                Source = ModerationSource.Llm,
                Severity = severity,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }

        await _context.SaveChangesAsync();
        return post;
    }

    private async Task<PostReport> SeedPendingReportAsync(Guid postId, Guid reporterId)
    {
        var report = new PostReport
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            ReporterId = reporterId,
            Reason = "spam",
            Status = ReportStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.PostReports.Add(report);
        await _context.SaveChangesAsync();
        return report;
    }
}
