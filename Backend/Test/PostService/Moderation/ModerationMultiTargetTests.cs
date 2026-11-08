using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PostService.DTOs;
using PostService.Enums;
using PostService.Messaging.Interface;
using PostService.Models;
using PostService.ServiceLayer.Implementation;
using PostService.ServiceLayer.Interface;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho kiểm duyệt ở cấp Comment và Reel (Phase 2.1).
///
/// Hành vi cần bảo vệ:
///   1. Tạo bình luận → vào hàng đợi kiểm duyệt với TargetType = Comment,
///      bình luận ở trạng thái Pending.
///   2. Sửa nội dung bình luận → resubmit; sửa metadata thì không resubmit.
///   3. Người khác không thấy bình luận chưa duyệt; tác giả vẫn thấy của mình.
///   4. Tạo reel → vào hàng đợi kiểm duyệt với TargetType = Reel.
///   5. Feed reel ẩn reel chưa duyệt với người khác, hiện với tác giả.
/// </summary>
public class ModerationMultiTargetTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PostDbContext _context;
    private readonly Mock<IModerationEnqueuer> _enqueuer;

    public ModerationMultiTargetTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new PostDbContext(options);
        _context.Database.EnsureCreated();

        _enqueuer = new Mock<IModerationEnqueuer>();
        _enqueuer
            .Setup(e => e.EnqueueAsync(
                It.IsAny<ModerationTargetType>(),
                It.IsAny<Guid>(),
                It.IsAny<string?>(),
                It.IsAny<Action<ModerationStatus>>(),
                It.IsAny<CancellationToken>()))
            .Callback<ModerationTargetType, Guid, string?, Action<ModerationStatus>, CancellationToken>(
                (_, _, _, applyStatus, _) => applyStatus?.Invoke(ModerationStatus.Pending));

        _enqueuer
            .Setup(e => e.ResubmitAsync(
                It.IsAny<ModerationTargetType>(),
                It.IsAny<Guid>(),
                It.IsAny<string?>(),
                It.IsAny<Action<ModerationStatus>>(),
                It.IsAny<CancellationToken>()))
            .Callback<ModerationTargetType, Guid, string?, Action<ModerationStatus>, CancellationToken>(
                (_, _, _, applyStatus, _) => applyStatus?.Invoke(ModerationStatus.Pending));
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── Comment ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateCommentAsync_EnqueuesCommentForModeration()
    {
        var service = CreateCommentService();
        var post = await SeedPostAsync(ModerationStatus.Approved);
        var authorId = Guid.NewGuid();

        var dto = await service.CreateCommentAsync(post.Id, authorId, new CreateCommentRequest
        {
            Content = "Nội dung bình luận"
        });

        _enqueuer.Verify(e => e.EnqueueAsync(
            ModerationTargetType.Comment,
            dto.Id,
            "Nội dung bình luận",
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Once);

        Assert.Equal(ModerationStatus.Pending.ToString(), dto.ModerationStatus);
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenContentChanged_ResubmitsForModeration()
    {
        var service = CreateCommentService();
        var post = await SeedPostAsync(ModerationStatus.Approved);
        var authorId = Guid.NewGuid();

        var dto = await service.CreateCommentAsync(post.Id, authorId, new CreateCommentRequest
        {
            Content = "Nội dung cũ"
        });

        await service.UpdateCommentAsync(dto.Id, authorId, new UpdateCommentRequest
        {
            Content = "Nội dung đã sửa"
        });

        _enqueuer.Verify(e => e.ResubmitAsync(
            ModerationTargetType.Comment,
            dto.Id,
            "Nội dung đã sửa",
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenContentUnchanged_DoesNotResubmit()
    {
        var service = CreateCommentService();
        var post = await SeedPostAsync(ModerationStatus.Approved);
        var authorId = Guid.NewGuid();

        var dto = await service.CreateCommentAsync(post.Id, authorId, new CreateCommentRequest
        {
            Content = "Nội dung giữ nguyên"
        });

        _enqueuer.Reset();

        await service.UpdateCommentAsync(dto.Id, authorId, new UpdateCommentRequest
        {
            Content = "Nội dung giữ nguyên"
        });

        _enqueuer.Verify(e => e.ResubmitAsync(
            It.IsAny<ModerationTargetType>(),
            It.IsAny<Guid>(),
            It.IsAny<string?>(),
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetPostCommentsAsync_HidesUnapprovedCommentsFromOthersButNotFromAuthor()
    {
        var service = CreateCommentService();
        var post = await SeedPostAsync(ModerationStatus.Approved);

        var authorId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        await service.CreateCommentAsync(post.Id, authorId, new CreateCommentRequest
        {
            Content = "Bình luận đang chờ duyệt"
        });

        // Tác giả vẫn thấy bình luận của mình.
        var authorView = await service.GetPostCommentsAsync(post.Id, authorId);
        Assert.Single(authorView);

        // Người khác không thấy.
        var otherView = await service.GetPostCommentsAsync(post.Id, otherUserId);
        Assert.Empty(otherView);

        // Khách (không đăng nhập) cũng không thấy.
        var anonymousView = await service.GetPostCommentsAsync(post.Id, null);
        Assert.Empty(anonymousView);
    }

    [Fact]
    public async Task GetPostCommentsAsync_ReturnsApprovedCommentsToEveryone()
    {
        var service = CreateCommentService();
        var post = await SeedPostAsync(ModerationStatus.Approved);

        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            PostId = post.Id,
            UserId = Guid.NewGuid(),
            Content = "Bình luận đã duyệt",
            ModerationStatus = ModerationStatus.Approved,
            ModeratedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        var view = await service.GetPostCommentsAsync(post.Id, Guid.NewGuid());

        Assert.Single(view);
    }

    // ── Reel ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateReelAsync_EnqueuesReelCaptionForModeration()
    {
        var service = CreateReelService();
        var authorId = Guid.NewGuid();

        var dto = await service.CreateReelAsync(authorId, new CreateReelRequest
        {
            VideoUrl = "https://example.com/video.mp4",
            VideoPublicId = "video_public_id",
            Caption = "Caption của reel",
            Duration = 15
        });

        _enqueuer.Verify(e => e.EnqueueAsync(
            ModerationTargetType.Reel,
            dto.Id,
            "Caption của reel",
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Once);

        Assert.Equal(ModerationStatus.Pending.ToString(), dto.ModerationStatus);
    }

    [Fact]
    public async Task GetReelsByUserAsync_HidesUnapprovedReelsFromOthersButNotFromAuthor()
    {
        var service = CreateReelService();
        var authorId = Guid.NewGuid();

        await service.CreateReelAsync(authorId, new CreateReelRequest
        {
            VideoUrl = "https://example.com/video.mp4",
            VideoPublicId = "video_public_id",
            Caption = "Reel đang chờ duyệt",
            Duration = 15
        });

        // Tác giả thấy reel của mình ở mọi trạng thái.
        var authorView = await service.GetReelsByUserAsync(authorId, 0, 20, authorId);
        Assert.Single(authorView);

        // Người khác không thấy reel chưa được duyệt.
        var otherView = await service.GetReelsByUserAsync(authorId, 0, 20, Guid.NewGuid());
        Assert.Empty(otherView);
    }

    [Fact]
    public async Task GetReelByIdAsync_WhenNotApprovedAndNotOwner_Throws()
    {
        var service = CreateReelService();
        var authorId = Guid.NewGuid();

        var dto = await service.CreateReelAsync(authorId, new CreateReelRequest
        {
            VideoUrl = "https://example.com/video.mp4",
            VideoPublicId = "video_public_id",
            Caption = "Reel đang chờ duyệt",
            Duration = 15
        });

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            service.GetReelByIdAsync(dto.Id, Guid.NewGuid()));

        // Tác giả vẫn xem được reel của mình.
        var ownReel = await service.GetReelByIdAsync(dto.Id, authorId);
        Assert.Equal(dto.Id, ownReel.Id);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private CommentService CreateCommentService()
    {
        var profileClient = new Mock<IUserProfileRpcClient>();
        profileClient
            .Setup(c => c.GetProfileAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid id, CancellationToken _) => new UserProfileRpcResponse
            {
                UserId = id,
                DisplayName = "Người dùng",
                Found = true
            });

        profileClient
            .Setup(c => c.GetProfileAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string _, CancellationToken _) => new UserProfileRpcResponse { Found = false });

        return new CommentService(
            _context,
            NullLogger<CommentService>.Instance,
            Mock.Of<IPostCommentedPublisher>(),
            profileClient.Object,
            Mock.Of<ICommentMentionedPublisher>(),
            _enqueuer.Object);
    }

    private ReelService CreateReelService()
    {
        var profileClient = new Mock<IUserProfileRpcClient>();
        profileClient
            .Setup(c => c.GetProfileAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid id, CancellationToken _) => new UserProfileRpcResponse
            {
                UserId = id,
                DisplayName = "Người dùng",
                Found = true
            });

        return new ReelService(
            _context,
            NullLogger<ReelService>.Instance,
            profileClient.Object,
            Mock.Of<ICloudinaryService>(),
            Mock.Of<IPostLikedPublisher>(),
            Mock.Of<IPostCommentedPublisher>(),
            Mock.Of<ICommentMentionedPublisher>(),
            _enqueuer.Object);
    }

    private async Task<Post> SeedPostAsync(ModerationStatus status)
    {
        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Content = "Bài gốc",
            Visibility = PostVisibility.Public,
            PostType = PostType.Original,
            ModerationStatus = status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        return post;
    }
}
