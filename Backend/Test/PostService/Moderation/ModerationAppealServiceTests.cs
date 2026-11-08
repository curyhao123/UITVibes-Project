using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho luồng khiếu nại (appeal) của tác giả.
///
/// Hành vi cần bảo vệ:
///   1. Khiếu nại hợp lệ → bản ghi chuyển sang NeedsReview, AppealStatus = Pending,
///      và trạng thái trên chính entity nội dung cũng được đồng bộ.
///   2. Chỉ tác giả mới được khiếu nại.
///   3. Chỉ nội dung đang Rejected mới khiếu nại được.
///   4. Không có hai khiếu nại pending cho cùng một bản ghi.
///   5. Lý do khiếu nại bị cắt còn tối đa 500 ký tự.
/// </summary>
public class ModerationAppealServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PostDbContext _context;
    private readonly ModerationAppealService _service;

    public ModerationAppealServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new PostDbContext(options);
        _context.Database.EnsureCreated();

        _service = new ModerationAppealService(
            _context,
            new ModerationTargetAccessor(),
            NullLogger<ModerationAppealService>.Instance);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task SubmitAppealAsync_WhenValid_MovesToNeedsReviewAndSyncsContentStatus()
    {
        var (result, authorId) = await SeedRejectedPostAsync();

        var dto = await _service.SubmitAppealAsync(result.Id, authorId, "Nội dung này không vi phạm gì");

        Assert.Equal(ModerationAppealStatus.Pending.ToString(), dto.AppealStatus);
        Assert.Equal(ModerationStatus.NeedsReview.ToString(), dto.ModerationStatus);
        Assert.Equal("Nội dung này không vi phạm gì", dto.AppealReason);
        Assert.NotNull(dto.AppealSubmittedAt);

        var record = await _context.ModerationResults.FirstAsync(m => m.Id == result.Id);
        Assert.Equal(ModerationStatus.NeedsReview, record.Status);
        Assert.Equal(ModerationAppealStatus.Pending, record.AppealStatus);

        // Trạng thái trên chính entity nội dung cũng phải được đồng bộ.
        var post = await _context.Posts.FirstAsync(p => p.Id == result.TargetId);
        Assert.Equal(ModerationStatus.NeedsReview, post.ModerationStatus);
    }

    [Fact]
    public async Task SubmitAppealAsync_WhenUserIsNotAuthor_Throws()
    {
        var (result, _) = await SeedRejectedPostAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.SubmitAppealAsync(result.Id, Guid.NewGuid(), "Tôi không đồng ý với quyết định này"));
    }

    [Fact]
    public async Task SubmitAppealAsync_WhenContentIsNotRejected_Throws()
    {
        var (result, authorId) = await SeedRejectedPostAsync();
        result.Status = ModerationStatus.Approved;
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.SubmitAppealAsync(result.Id, authorId, "Tôi không đồng ý với quyết định này"));
    }

    [Fact]
    public async Task SubmitAppealAsync_WhenAppealAlreadyPending_Throws()
    {
        var (result, authorId) = await SeedRejectedPostAsync();

        await _service.SubmitAppealAsync(result.Id, authorId, "Khiếu nại lần đầu");
        result.Status = ModerationStatus.Rejected;
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.SubmitAppealAsync(result.Id, authorId, "Khiếu nại lần hai"));
    }

    [Fact]
    public async Task SubmitAppealAsync_WhenReasonIsBlank_Throws()
    {
        var (result, authorId) = await SeedRejectedPostAsync();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.SubmitAppealAsync(result.Id, authorId, "   "));
    }

    [Fact]
    public async Task SubmitAppealAsync_WhenReasonTooLong_TruncatesTo500Chars()
    {
        var (result, authorId) = await SeedRejectedPostAsync();

        var dto = await _service.SubmitAppealAsync(result.Id, authorId, new string('a', 900));

        Assert.Equal(500, dto.AppealReason!.Length);
    }

    [Fact]
    public async Task SubmitAppealAsync_WhenResultNotFound_Throws()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _service.SubmitAppealAsync(Guid.NewGuid(), Guid.NewGuid(), "Lý do khiếu nại của tôi"));
    }

    [Fact]
    public async Task GetAppealAsync_WhenUserIsAuthor_ReturnsAppealInfo()
    {
        var (result, authorId) = await SeedRejectedPostAsync();
        await _service.SubmitAppealAsync(result.Id, authorId, "Nội dung này không vi phạm gì");

        var dto = await _service.GetAppealAsync(result.Id, authorId);

        Assert.NotNull(dto);
        Assert.Equal(ModerationAppealStatus.Pending.ToString(), dto!.AppealStatus);
    }

    [Fact]
    public async Task GetAppealAsync_WhenUserIsNotAuthor_Throws()
    {
        var (result, _) = await SeedRejectedPostAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.GetAppealAsync(result.Id, Guid.NewGuid()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(ModerationResult Result, Guid AuthorId)> SeedRejectedPostAsync()
    {
        var authorId = Guid.NewGuid();

        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = authorId,
            Content = "Nội dung bị từ chối",
            Visibility = PostVisibility.Public,
            PostType = PostType.Original,
            ModerationStatus = ModerationStatus.Rejected,
            ModeratedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        var result = new ModerationResult
        {
            Id = Guid.NewGuid(),
            TargetId = post.Id,
            TargetType = ModerationTargetType.Post,
            Status = ModerationStatus.Rejected,
            Source = ModerationSource.Llm,
            LlmDecision = "reject",
            Severity = 2,
            Confidence = 0.9,
            Categories = "harassment",
            AuthorReason = "Nội dung công kích",
            InternalReasonCode = "llm_reject",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Posts.Add(post);
        _context.ModerationResults.Add(result);
        await _context.SaveChangesAsync();

        return (result, authorId);
    }
}
