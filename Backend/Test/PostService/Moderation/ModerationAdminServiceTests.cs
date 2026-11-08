using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PostService.Configurations;
using PostService.DTOs;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.Messaging.Interface;
using PostService.Models;
using PostService.ServiceLayer.Implementation;
using PostService.ServiceLayer.Interface;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho hàng đợi kiểm duyệt của admin (Phase 2.5).
///
/// Hành vi cần bảo vệ:
///   1. Phân trang trả về đúng `Total` (không phải số bản ghi trang hiện tại).
///   2. Lọc theo targetType / severity / confidence / appeal / khoảng thời gian / tác giả.
///   3. Sắp xếp theo severity (mặc định ưu tiên cao nhất).
///   4. Bulk resolve: bản ghi hợp lệ được xử lý, bản ghi lỗi bị bỏ qua mà
///      không làm hỏng cả lô.
///   5. Quyết định của admin giữ nguyên kết quả LLM để đối chiếu, và đánh dấu
///      khiếu nại đã xử lý.
/// </summary>
public class ModerationAdminServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PostDbContext _context;
    private readonly ModerationAdminService _service;
    private readonly Mock<IContentModerationNotifier> _notifier;

    public ModerationAdminServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new PostDbContext(options);
        _context.Database.EnsureCreated();

        _notifier = new Mock<IContentModerationNotifier>();

        var profileClient = new Mock<IUserProfileRpcClient>();
        profileClient
            .Setup(c => c.GetProfileAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid id, CancellationToken _) => new UserProfileRpcResponse
            {
                UserId = id,
                DisplayName = "Người dùng",
                Found = true
            });

        _service = new ModerationAdminService(
            _context,
            profileClient.Object,
            new ModerationTargetAccessor(),
            _notifier.Object,
            new ModerationDecisionLogger(_context, NullLogger<ModerationDecisionLogger>.Instance),
            new ModerationStrikeService(
                _context,
                Mock.Of<IUserBannedPublisher>(),
                Options.Create(new ModerationStrikeOptions
                {
                    Enabled = true,
                    BanThreshold = 3,
                    AiConfirmedWeight = 1,
                    AdminConfirmedWeight = 1,
                    StrikeExpiryDays = 90
                }),
                NullLogger<ModerationStrikeService>.Instance),
            new ModerationMetrics(),
            NullLogger<ModerationAdminService>.Instance);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_ReturnsTotalOfAllMatchingRecords()
    {
        for (var i = 0; i < 5; i++)
            await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, severity: 2);

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            Status = ModerationStatus.NeedsReview,
            Skip = 0,
            Take = 2
        });

        Assert.Equal(5, paged.Total);
        Assert.Equal(2, paged.Items.Count);
        Assert.Equal(0, paged.Skip);
        Assert.Equal(2, paged.Take);
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_FiltersByTargetType()
    {
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview);
        await SeedResultAsync(ModerationTargetType.Comment, ModerationStatus.NeedsReview);
        await SeedResultAsync(ModerationTargetType.Reel, ModerationStatus.NeedsReview);

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            TargetType = ModerationTargetType.Comment
        });

        Assert.Equal(1, paged.Total);
        Assert.Equal(ModerationTargetType.Comment, paged.Items[0].TargetType);
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_FiltersByMinSeverity()
    {
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, severity: 1);
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, severity: 3);

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            MinSeverity = 2
        });

        Assert.Equal(1, paged.Total);
        Assert.Equal(3, paged.Items[0].Severity);
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_FiltersByMinConfidence()
    {
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, confidence: 0.5);
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, confidence: 0.9);

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            MinConfidence = 0.8
        });

        Assert.Equal(1, paged.Total);
        Assert.Equal(0.9, paged.Items[0].Confidence);
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_FiltersOnlyRecordsWithPendingAppeal()
    {
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview,
            appealStatus: ModerationAppealStatus.Pending);
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview,
            appealStatus: ModerationAppealStatus.None);

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            OnlyWithAppeal = true
        });

        Assert.Equal(1, paged.Total);
        Assert.Equal(ModerationAppealStatus.Pending.ToString(), paged.Items[0].AppealStatus);
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_FiltersByAuthor()
    {
        var authorId = Guid.NewGuid();
        var otherAuthorId = Guid.NewGuid();

        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, authorId: authorId);
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, authorId: otherAuthorId);

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            AuthorId = authorId
        });

        Assert.Equal(1, paged.Total);
        Assert.Equal(authorId, paged.Items[0].AuthorId);
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_FiltersByDateRange()
    {
        var old = await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview);
        old.CreatedAt = DateTime.UtcNow.AddDays(-10);
        await _context.SaveChangesAsync();

        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview);

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            FromUtc = DateTime.UtcNow.AddDays(-1)
        });

        Assert.Equal(1, paged.Total);
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_OrdersBySeverityDescending()
    {
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, severity: 1);
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, severity: 3);
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, severity: 2);

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            OrderBySeverity = true
        });

        Assert.Equal(new int?[] { 3, 2, 1 }, paged.Items.Select(i => i.Severity).ToArray());
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_OrdersByPriorityDescending()
    {
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, priority: 5);
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, priority: 50);
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, priority: 20);

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            OrderByPriority = true
        });

        Assert.Equal(new[] { 50, 20, 5 }, paged.Items.Select(i => i.Priority).ToArray());
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_FiltersByMinReportCount()
    {
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, reportCount: 1);
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview, reportCount: 4);

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            MinReportCount = 3
        });

        Assert.Equal(1, paged.Total);
        Assert.Equal(4, paged.Items[0].ReportCount);
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_SearchesContentOfModeratedPost()
    {
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview,
            postContent: "mật khẩu wifi là 123456");

        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview,
            postContent: "nội dung vô hại");

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            Search = "123456"
        });

        Assert.Equal(1, paged.Total);
        Assert.Contains("mật khẩu wifi", paged.Items[0].TargetContent);
    }

    [Fact]
    public async Task GetModerationResultsPagedAsync_SearchesAuthorReasonAndCategory()
    {
        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview,
            authorReason: "Contains leaked exam answers");

        await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview,
            authorReason: "không liên quan");

        var paged = await _service.GetModerationResultsPagedAsync(new ModerationQueryFilter
        {
            Search = "leaked exam"
        });

        Assert.Equal(1, paged.Total);
    }

    [Fact]
    public async Task ApproveAsync_KeepsLlmDecisionAndResolvesPendingAppeal()
    {
        var result = await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview,
            appealStatus: ModerationAppealStatus.Pending);
        var adminId = Guid.NewGuid();

        var dto = await _service.ApproveAsync(result.Id, adminId, "Nội dung hợp lệ");

        Assert.Equal(ModerationStatus.Approved, dto.Status);
        Assert.Equal(ModerationSource.Human, dto.Source);
        Assert.Equal(adminId, dto.ReviewedBy);
        Assert.NotNull(dto.ReviewedAt);

        // Kết quả LLM được giữ nguyên để admin đối chiếu.
        Assert.Equal("reject", dto.LlmDecision);
        Assert.Equal(2, dto.Severity);
        Assert.Equal(0.9, dto.Confidence);

        Assert.Equal(ModerationAppealStatus.Resolved.ToString(), dto.AppealStatus);
        Assert.NotNull(dto.AppealResolvedAt);
    }

    [Fact]
    public async Task RejectAsync_WhenRecordIsApproved_Throws()
    {
        var result = await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.Approved);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.RejectAsync(result.Id, Guid.NewGuid()));
    }

    [Fact]
    public async Task RejectAsync_NotifiesAuthorWithReason()
    {
        var result = await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview);

        await _service.RejectAsync(result.Id, Guid.NewGuid(), "Vi phạm nghiêm trọng");

        _notifier.Verify(n => n.NotifyRejectedAsync(
            It.IsAny<Guid>(),
            result.TargetId,
            ModerationTargetType.Post,
            "Vi phạm nghiêm trọng",
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task BulkResolveAsync_ApprovesAllValidRecords()
    {
        var first = await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview);
        var second = await SeedResultAsync(ModerationTargetType.Comment, ModerationStatus.NeedsReview);

        var bulk = await _service.BulkResolveAsync(new BulkModerationRequest
        {
            Ids = new List<Guid> { first.Id, second.Id },
            Action = "approve"
        }, Guid.NewGuid());

        Assert.Equal(2, bulk.SucceededCount);
        Assert.Equal(0, bulk.FailedCount);
        Assert.Equal(2, bulk.SucceededIds.Count);
    }

    [Fact]
    public async Task BulkResolveAsync_SkipsInvalidRecordsWithoutFailingTheWholeBatch()
    {
        var valid = await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.NeedsReview);
        var notReviewable = await SeedResultAsync(ModerationTargetType.Post, ModerationStatus.Approved);

        var bulk = await _service.BulkResolveAsync(new BulkModerationRequest
        {
            Ids = new List<Guid> { valid.Id, notReviewable.Id, Guid.NewGuid() },
            Action = "reject"
        }, Guid.NewGuid());

        Assert.Equal(1, bulk.SucceededCount);
        Assert.Equal(2, bulk.FailedCount);
        Assert.Contains(bulk.Failures, f => f.Id == notReviewable.Id);
        Assert.Contains(bulk.Failures, f => f.Id != valid.Id);
    }

    [Fact]
    public async Task BulkResolveAsync_WhenActionIsInvalid_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.BulkResolveAsync(new BulkModerationRequest
            {
                Ids = new List<Guid> { Guid.NewGuid() },
                Action = "delete"
            }, Guid.NewGuid()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<ModerationResult> SeedResultAsync(
        ModerationTargetType targetType,
        ModerationStatus status,
        int? severity = 2,
        double? confidence = 0.9,
        ModerationAppealStatus appealStatus = ModerationAppealStatus.None,
        Guid? authorId = null,
        int reportCount = 0,
        int priority = 0,
        string? postContent = null,
        string? authorReason = null)
    {
        var owner = authorId ?? Guid.NewGuid();
        var targetId = Guid.NewGuid();

        switch (targetType)
        {
            case ModerationTargetType.Post:
                _context.Posts.Add(new Post
                {
                    Id = targetId,
                    UserId = owner,
                    Content = postContent ?? "nội dung",
                    Visibility = PostVisibility.Public,
                    PostType = PostType.Original,
                    ModerationStatus = status,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
                break;

            case ModerationTargetType.Comment:
                var postId = Guid.NewGuid();
                _context.Posts.Add(new Post
                {
                    Id = postId,
                    UserId = owner,
                    Content = "bài gốc",
                    Visibility = PostVisibility.Public,
                    PostType = PostType.Original,
                    ModerationStatus = ModerationStatus.Approved,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
                _context.Comments.Add(new Comment
                {
                    Id = targetId,
                    PostId = postId,
                    UserId = owner,
                    Content = "bình luận",
                    ModerationStatus = status,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
                break;

            case ModerationTargetType.Reel:
                _context.Reels.Add(new Reel
                {
                    Id = targetId,
                    UserId = owner,
                    VideoUrl = "https://example.com/video.mp4",
                    VideoPublicId = "video_public_id",
                    Caption = "caption",
                    ModerationStatus = status,
                    CreatedAt = DateTime.UtcNow,
                });
                break;
        }

        var result = new ModerationResult
        {
            Id = Guid.NewGuid(),
            TargetId = targetId,
            TargetType = targetType,
            Status = status,
            Source = ModerationSource.Llm,
            LlmDecision = "reject",
            Severity = severity,
            Confidence = confidence,
            Categories = "harassment",
            AuthorReason = authorReason ?? "lý do",
            InternalReasonCode = "llm_reject",
            AppealStatus = appealStatus,
            ReportCount = reportCount,
            Priority = priority,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.ModerationResults.Add(result);
        await _context.SaveChangesAsync();

        return result;
    }
}
