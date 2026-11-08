using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho <see cref="ModerationDecisionLogger"/> — nhật ký quyết định append-only
/// (Phase 3.2).
///
/// Hành vi cần bảo vệ:
///   1. Mỗi quyết định tạo MỘT bản ghi log, không ghi đè bản ghi cũ.
///   2. Log giữ lại đầy đủ ngữ cảnh: LLM decision, severity, confidence, categories,
///      prompt version, model, actor.
///   3. Ghi log lỗi → ném exception bị nuốt (best-effort), không làm hỏng nghiệp vụ.
/// </summary>
public class ModerationDecisionLoggerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PostDbContext _context;
    private readonly ModerationDecisionLogger _logger;

    public ModerationDecisionLoggerTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new PostDbContext(options);
        _context.Database.EnsureCreated();

        _logger = new ModerationDecisionLogger(_context, NullLogger<ModerationDecisionLogger>.Instance);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task LogAsync_WritesEntryWithFullContext()
    {
        var result = await SeedResultAsync();

        await _logger.LogAsync(
            result,
            ModerationStatus.Rejected,
            ModerationSource.Llm,
            "llm",
            note: "Nội dung chửi thề");

        var entry = await _context.ModerationDecisionLogs.SingleAsync();

        Assert.Equal(result.Id, entry.ModerationResultId);
        Assert.Equal(result.TargetId, entry.TargetId);
        Assert.Equal(ModerationTargetType.Post, entry.TargetType);
        Assert.Equal(ModerationStatus.Rejected, entry.Decision);
        Assert.Equal(ModerationSource.Llm, entry.Source);
        Assert.Equal("llm", entry.Stage);
        Assert.Equal("reject", entry.LlmDecision);
        Assert.Equal(3, entry.Severity);
        Assert.Equal(0.91, entry.Confidence);
        Assert.Equal("harassment", entry.Categories);
        Assert.Equal("v3", entry.PromptVersion);
        Assert.Equal("deepseek-flash", entry.ModelName);
        Assert.Equal("Nội dung chửi thề", entry.Note);
    }

    [Fact]
    public async Task LogAsync_IsAppendOnly_KeepsPreviousEntries()
    {
        var result = await SeedResultAsync();

        await _logger.LogAsync(result, ModerationStatus.NeedsReview, ModerationSource.Llm, "llm");
        await _logger.LogAsync(result, ModerationStatus.Rejected, ModerationSource.Human, "admin",
            actorId: Guid.NewGuid(), actorRole: "Admin");

        var entries = await _context.ModerationDecisionLogs
            .OrderBy(e => e.CreatedAt)
            .ToListAsync();

        Assert.Equal(2, entries.Count);
        Assert.Equal(ModerationStatus.NeedsReview, entries[0].Decision);
        Assert.Equal(ModerationStatus.Rejected, entries[1].Decision);
        Assert.Equal("admin", entries[1].Stage);
        Assert.NotNull(entries[1].ActorId);
        Assert.Equal("Admin", entries[1].ActorRole);
    }

    [Fact]
    public async Task LogAsync_WhenContextIsDisposed_DoesNotThrow()
    {
        var result = await SeedResultAsync();

        // Đóng context để mọi truy vấn DB thất bại → logger phải nuốt lỗi.
        await _context.DisposeAsync();

        await _logger.LogAsync(result, ModerationStatus.Approved, ModerationSource.Llm, "llm");
    }

    private async Task<ModerationResult> SeedResultAsync()
    {
        var result = new ModerationResult
        {
            Id = Guid.NewGuid(),
            TargetId = Guid.NewGuid(),
            TargetType = ModerationTargetType.Post,
            Status = ModerationStatus.NeedsReview,
            Source = ModerationSource.Llm,
            LlmDecision = "reject",
            Severity = 3,
            Confidence = 0.91,
            Categories = "harassment",
            InternalReasonCode = "llm_reject",
            PromptVersion = "v3",
            ModelName = "deepseek-flash",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ModerationResults.Add(result);
        await _context.SaveChangesAsync();
        return result;
    }
}
