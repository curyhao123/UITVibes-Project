using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho ModerationEnqueuer — điểm vào duy nhất để đưa nội dung vào hàng đợi.
/// Kiểm tra 3 hành vi quan trọng:
///   1. Nội dung mới luôn ở trạng thái Pending và có bản ghi kiểm duyệt.
///   2. Sửa nội dung (resubmit) tái sử dụng bản ghi cũ và xoá dấu vết lần đánh giá cũ.
///   3. Khi moderation bị tắt, nội dung được duyệt thẳng và không tạo bản ghi.
/// </summary>
public class ModerationEnqueuerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PostDbContext _context;
    private readonly ModerationOptions _options;

    public ModerationEnqueuerTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new PostDbContext(options);
        _context.Database.EnsureCreated();

        _options = new ModerationOptions { Enabled = true };
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    private ModerationEnqueuer CreateEnqueuer()
    {
        return new ModerationEnqueuer(
            _context,
            Options.Create(_options),
            NullLogger<ModerationEnqueuer>.Instance);
    }

    [Fact]
    public async Task EnqueueAsync_WhenContentIsNew_CreatesPendingRecord()
    {
        var targetId = Guid.NewGuid();
        var appliedStatus = (ModerationStatus?)null;

        await CreateEnqueuer().EnqueueAsync(
            ModerationTargetType.Post,
            targetId,
            "Nội dung cần kiểm duyệt",
            status => appliedStatus = status);

        var record = await _context.ModerationResults
            .SingleAsync(m => m.TargetId == targetId);

        Assert.Equal(ModerationStatus.Pending, record.Status);
        Assert.Equal(ModerationTargetType.Post, record.TargetType);
        Assert.Equal("pending_worker", record.InternalReasonCode);
        Assert.Equal(0, record.AttemptCount);
        Assert.Equal(ModerationStatus.Pending, appliedStatus);
    }

    [Fact]
    public async Task EnqueueAsync_WhenCalledTwice_ReusesTheSameRecord()
    {
        var targetId = Guid.NewGuid();
        var enqueuer = CreateEnqueuer();

        await enqueuer.EnqueueAsync(ModerationTargetType.Post, targetId, "Nội dung");
        await enqueuer.EnqueueAsync(ModerationTargetType.Post, targetId, "Nội dung");

        var count = await _context.ModerationResults.CountAsync(m => m.TargetId == targetId);

        Assert.Equal(1, count);
    }

    [Fact]
    public async Task ResubmitAsync_WhenRecordWasReviewed_ClearsPreviousDecision()
    {
        var targetId = Guid.NewGuid();
        var enqueuer = CreateEnqueuer();

        await enqueuer.EnqueueAsync(ModerationTargetType.Post, targetId, "Nội dung gốc");

        var record = await _context.ModerationResults.SingleAsync(m => m.TargetId == targetId);
        record.Status = ModerationStatus.Rejected;
        record.Source = ModerationSource.Llm;
        record.LlmDecision = "reject";
        record.Severity = 3;
        record.Confidence = 0.95;
        record.Categories = "violence";
        record.AuthorReason = "Nội dung bạo lực";
        record.AdminNote = "ghi chú admin";
        record.ReviewedBy = Guid.NewGuid();
        record.ReviewedAt = DateTime.UtcNow;
        record.AttemptCount = 3;
        await _context.SaveChangesAsync();

        await enqueuer.ResubmitAsync(ModerationTargetType.Post, targetId, "Nội dung đã sửa");

        var updated = await _context.ModerationResults.SingleAsync(m => m.TargetId == targetId);

        Assert.Equal(ModerationStatus.Pending, updated.Status);
        Assert.Equal("pending_worker", updated.InternalReasonCode);
        Assert.Equal(0, updated.AttemptCount);
        Assert.Null(updated.LlmDecision);
        Assert.Null(updated.Severity);
        Assert.Null(updated.Confidence);
        Assert.Null(updated.Categories);
        Assert.Null(updated.AuthorReason);
        Assert.Null(updated.AdminNote);
        Assert.Null(updated.ReviewedBy);
        Assert.Null(updated.ReviewedAt);
    }

    [Fact]
    public async Task EnqueueAsync_WhenModerationDisabled_ApprovesWithoutCreatingRecord()
    {
        _options.Enabled = false;

        var targetId = Guid.NewGuid();
        var appliedStatus = (ModerationStatus?)null;

        await CreateEnqueuer().EnqueueAsync(
            ModerationTargetType.Post,
            targetId,
            "Nội dung",
            status => appliedStatus = status);

        var count = await _context.ModerationResults.CountAsync(m => m.TargetId == targetId);

        Assert.Equal(0, count);
        Assert.Equal(ModerationStatus.Approved, appliedStatus);
    }
}
