using Microsoft.EntityFrameworkCore;

namespace PostService.Models;

public class PostDbContext : DbContext
{
    public PostDbContext(DbContextOptions<PostDbContext> options) : base(options)
    {
    }

    public DbSet<Post> Posts { get; set; }
    public DbSet<PostMedia> PostMedia { get; set; }
    public DbSet<Comment> Comments { get; set; }
    public DbSet<Like> Likes { get; set; }
    public DbSet<CommentLike> CommentLikes { get; set; }
    public DbSet<Hashtag> Hashtags { get; set; }
    public DbSet<PostHashtag> PostHashtags { get; set; }
    public DbSet<PostMention> PostMentions { get; set; }
    public DbSet<Bookmark> Bookmarks { get; set; }

    // Story entities
    public DbSet<StoryGroup> StoryGroups { get; set; }
    public DbSet<StoryItem> StoryItems { get; set; }
    public DbSet<StoryView> StoryViews { get; set; }

    public DbSet<PostReport> PostReports { get; set; }

    // Highlight entities
    public DbSet<HighlightGroup> HighlightGroups { get; set; }
    public DbSet<HighlightItem> HighlightItems { get; set; }

    public DbSet<Reel> Reels { get; set; }
    public DbSet<ReelLike> ReelLikes { get; set; }
    public DbSet<ReelComment> ReelComments { get; set; }
    public DbSet<ReelCommentLike> ReelCommentLikes { get; set; }
    public DbSet<ReelShare> ReelShares { get; set; }

    public DbSet<ModerationResult> ModerationResults { get; set; }

    /// Nhật ký append-only mọi quyết định kiểm duyệt (3.2) — dùng để đo độ
    /// chính xác của AI và đề xuất lại ngưỡng.
    public DbSet<ModerationDecisionLog> ModerationDecisionLogs { get; set; }

    /// Lịch sử vi phạm + tự động khoá tài khoản (3.5).
    public DbSet<UserStrike> UserStrikes { get; set; }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ===== POST CONFIGURATION =====
        modelBuilder.Entity<Post>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
            entity.HasIndex(e => e.IsDeleted);

            entity.Property(e => e.Content).HasMaxLength(5000);
            entity.Property(e => e.Location).HasMaxLength(200);
            entity.Property(e => e.Visibility).HasConversion<int>();
            entity.Property(e => e.PostType).HasConversion<int>();

            // Index để query "các bài repost của user X"
            entity.HasIndex(e => new { e.UserId, e.PostType });

            // Index để đếm repost của bài gốc
            entity.HasIndex(e => e.OriginalPostId);

            entity.HasIndex(p => new { p.ModerationStatus, p.CreatedAt });

            // Self-referencing for shared posts
            entity.HasOne(e => e.OriginalPost)
                .WithMany()
                .HasForeignKey(e => e.OriginalPostId)
                .OnDelete(DeleteBehavior.Restrict);

            // Relationships
            entity.HasMany(e => e.Media)
                .WithOne(m => m.Post)
                .HasForeignKey(m => m.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Comments)
                .WithOne(c => c.Post)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Likes)
                .WithOne(l => l.Post)
                .HasForeignKey(l => l.PostId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== POST MEDIA CONFIGURATION =====
        modelBuilder.Entity<PostMedia>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PostId);
            entity.HasIndex(e => new { e.PostId, e.DisplayOrder });

            entity.Property(e => e.Type).HasConversion<int>();
            entity.Property(e => e.Url).IsRequired().HasMaxLength(500);
            entity.Property(e => e.PublicId).HasMaxLength(500);
            entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);
        });

        // ===== COMMENT CONFIGURATION =====
        modelBuilder.Entity<Comment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PostId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ParentCommentId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.IsDeleted);

            entity.Property(e => e.Content).IsRequired().HasMaxLength(2000);

            entity.Property(e => e.ModerationStatus).HasConversion<int>();

            // Query "bình luận đã duyệt của bài X" — index phủ vừa filter vừa sort.
            entity.HasIndex(e => new { e.PostId, e.ModerationStatus });

            // Self-referencing for nested comments
            entity.HasOne(e => e.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(e => e.ParentCommentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Likes)
                .WithOne(l => l.Comment)
                .HasForeignKey(l => l.CommentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== LIKE CONFIGURATION =====
        modelBuilder.Entity<Like>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Composite unique index to prevent duplicate likes
            entity.HasIndex(e => new { e.PostId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
        });

        // ===== COMMENT LIKE CONFIGURATION =====
        modelBuilder.Entity<CommentLike>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Composite unique index to prevent duplicate likes
            entity.HasIndex(e => new { e.CommentId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.UserId);
        });

        // ===== HASHTAG CONFIGURATION =====
        modelBuilder.Entity<Hashtag>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Unique index on normalized name
            entity.HasIndex(e => e.NormalizedName).IsUnique();
            entity.HasIndex(e => e.UsageCount);
            entity.HasIndex(e => e.LastUsedAt);

            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.NormalizedName).IsRequired().HasMaxLength(100);
        });

        // ===== POST HASHTAG CONFIGURATION =====
        modelBuilder.Entity<PostHashtag>(entity =>
        {
            // Composite primary key
            entity.HasKey(e => new { e.PostId, e.HashtagId });

            entity.HasIndex(e => e.HashtagId);
            entity.HasIndex(e => e.CreatedAt);

            entity.HasOne(e => e.Post)
                .WithMany(p => p.Hashtags)
                .HasForeignKey(e => e.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Hashtag)
                .WithMany(h => h.Posts)
                .HasForeignKey(e => e.HashtagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== POST MENTION CONFIGURATION =====
        modelBuilder.Entity<PostMention>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PostId);
            entity.HasIndex(e => e.MentionedUserId);

            entity.HasOne(e => e.Post)
                .WithMany(p => p.Mentions)
                .HasForeignKey(e => e.PostId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== BOOKMARK CONFIGURATION =====
        modelBuilder.Entity<Bookmark>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Composite unique index to prevent duplicate bookmarks
            entity.HasIndex(e => new { e.PostId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Collection);
            entity.HasIndex(e => e.CreatedAt);

            entity.Property(e => e.Collection).HasMaxLength(100);

            entity.HasOne(e => e.Post)
                .WithMany()
                .HasForeignKey(e => e.PostId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== STORY GROUP CONFIGURATION =====
        modelBuilder.Entity<StoryGroup>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ExpiresAt);
            entity.HasIndex(e => new { e.UserId, e.ExpiresAt });

            entity.Property(e => e.OwnerDisplayName).HasMaxLength(100);
            entity.Property(e => e.OwnerAvatarUrl).HasMaxLength(500);

            entity.HasMany(e => e.Items)
                .WithOne(i => i.StoryGroup)
                .HasForeignKey(i => i.StoryGroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== STORY ITEM CONFIGURATION =====
        modelBuilder.Entity<StoryItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.StoryGroupId);
            entity.HasIndex(e => new { e.StoryGroupId, e.DisplayOrder });

            entity.Property(e => e.Type).HasConversion<int>();
            entity.Property(e => e.Url).IsRequired().HasMaxLength(500);
            entity.Property(e => e.PublicId).HasMaxLength(500);
            entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);
            entity.Property(e => e.ModerationStatus).HasConversion<int>();

            // Query "story item đã duyệt của group X" — index phủ vừa filter vừa sort.
            entity.HasIndex(e => new { e.StoryGroupId, e.ModerationStatus });

            entity.HasMany(e => e.Views)
                .WithOne(v => v.StoryItem)
                .HasForeignKey(v => v.StoryItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== STORY VIEW CONFIGURATION =====
        modelBuilder.Entity<StoryView>(entity =>
        {
            entity.HasKey(e => e.Id);
            // Mỗi user chỉ xem 1 item 1 lần
            entity.HasIndex(e => new { e.StoryItemId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<PostReport>()
            .HasOne(r => r.Post)
            .WithMany(p => p.Reports)
            .HasForeignKey(r => r.PostId)
            .OnDelete(DeleteBehavior.Restrict);

        // ===== HIGHLIGHT GROUP CONFIGURATION =====
        modelBuilder.Entity<HighlightGroup>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);

            entity.Property(e => e.Title).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CoverImage).HasMaxLength(500);

            entity.HasMany(e => e.Items)
                .WithOne(i => i.HighlightGroup)
                .HasForeignKey(i => i.HighlightGroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== HIGHLIGHT ITEM CONFIGURATION =====
        modelBuilder.Entity<HighlightItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.HighlightGroupId);
            entity.HasIndex(e => e.StoryItemId);
            // Composite unique index to prevent duplicate highlight items
            entity.HasIndex(e => new { e.HighlightGroupId, e.StoryItemId }).IsUnique();

            entity.HasOne(e => e.StoryItem)
                .WithMany()
                .HasForeignKey(e => e.StoryItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });


        // ===== REEL CONFIGURATION =====
        modelBuilder.Entity<Reel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.UserId, e.CreatedAt });

            entity.Property(e => e.Caption).HasMaxLength(500);
            entity.Property(e => e.VideoUrl).IsRequired().HasMaxLength(500);
            entity.Property(e => e.VideoPublicId).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);
            entity.Property(e => e.ThumbnailPublicId).HasMaxLength(500);

            entity.Property(e => e.ModerationStatus).HasConversion<int>();

            // Query "reel đã duyệt" cho feed discover.
            entity.HasIndex(e => e.ModerationStatus);

            entity.HasMany(e => e.Likes)
                .WithOne(l => l.Reel)
                .HasForeignKey(l => l.ReelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Comments)
                .WithOne(c => c.Reel)
                .HasForeignKey(c => c.ReelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Shares)
                .WithOne(s => s.Reel)
                .HasForeignKey(s => s.ReelId)
                .OnDelete(DeleteBehavior.Cascade);
        });


        modelBuilder.Entity<ReelLike>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Chống like trùng lặp
            entity.HasIndex(e => new { e.ReelId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);

            entity.HasOne(e => e.Reel)
                .WithMany(r => r.Likes)
                .HasForeignKey(e => e.ReelId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReelComment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ReelId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ParentCommentId);
            entity.HasIndex(e => e.CreatedAt);

            entity.Property(e => e.Content).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.ModerationStatus).HasConversion<int>();

            // Query "bình luận đã duyệt của reel X" — index phủ vừa filter vừa sort.
            entity.HasIndex(e => new { e.ReelId, e.ModerationStatus });

            // Query danh sách bình luận đã duyệt, sắp xếp theo thời gian.
            entity.HasIndex(e => new { e.ModerationStatus, e.CreatedAt });

            // Self-referencing for nested comments
            entity.HasOne(e => e.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(e => e.ParentCommentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Likes)
                .WithOne(l => l.ReelComment)
                .HasForeignKey(l => l.ReelCommentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== REEL COMMENT LIKE CONFIGURATION =====
        modelBuilder.Entity<ReelCommentLike>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Chống like trùng lặp
            entity.HasIndex(e => new { e.ReelCommentId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.UserId);

            entity.HasOne(e => e.ReelComment)
                .WithMany(c => c.Likes)
                .HasForeignKey(e => e.ReelCommentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== REEL SHARE CONFIGURATION =====
        modelBuilder.Entity<ReelShare>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ReelId, e.UserId });
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);

            entity.HasOne(e => e.Reel)
                .WithMany(r => r.Shares)
                .HasForeignKey(e => e.ReelId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        // ===== MODERATION RESULT CONFIGURATION =====
        modelBuilder.Entity<ModerationResult>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.TargetType).HasConversion<int>();
            entity.Property(e => e.Status).HasConversion<int>();
            entity.Property(e => e.Source).HasConversion<int>();

            entity.Property(e => e.LlmDecision).HasMaxLength(20);
            entity.Property(e => e.Categories).HasMaxLength(200);
            entity.Property(e => e.AuthorReason).HasMaxLength(300);
            entity.Property(e => e.InternalReasonCode).IsRequired().HasMaxLength(100);
            entity.Property(e => e.AdminNote).HasMaxLength(500);
            entity.Property(e => e.WorkerId).HasMaxLength(100);
            entity.Property(e => e.AppealStatus).HasConversion<int>();
            entity.Property(e => e.AppealReason).HasMaxLength(500);

            // ===== Versioning + observability (3.3 / 3.4) =====
            entity.Property(e => e.PromptVersion).HasMaxLength(20);
            entity.Property(e => e.ModelName).HasMaxLength(60);
            entity.Property(e => e.ShadowDecision).HasMaxLength(20);
            entity.Property(e => e.ShadowModel).HasMaxLength(60);
            entity.Property(e => e.ShadowPromptVersion).HasMaxLength(20);
            entity.Property(e => e.ShadowStatus).HasConversion<int>();
            // Raw response + snapshot media: giữ ở dạng text (không giới hạn) vì
            // độ dài phụ thuộc nội dung; đã cắt ngắn ở tầng service trước khi ghi.
            entity.Property(e => e.RawLlmResponse).HasColumnType("text");
            entity.Property(e => e.TargetMediaUrlsSnapshot).HasColumnType("text");

            entity.HasIndex(e => new { e.TargetId, e.TargetType }).IsUnique();

            // Index cho worker: query "các bản ghi Pending của loại X chưa xử lý"
            entity.HasIndex(e => new { e.TargetType, e.Status, e.UpdatedAt });

            // Index cho admin queue: lọc nhanh các bản ghi đang có khiếu nại.
            entity.HasIndex(e => e.AppealStatus);

            // Index cho worker: tìm bản ghi Pending mà lease đã hết hạn (để giành lại
            // sau khi worker chết giữa chừng) — phục vụ cơ chế chống xử lý trùng.
            entity.HasIndex(e => new { e.Status, e.LeaseExpiresAt });
        });

        // ===== MODERATION DECISION LOG CONFIGURATION =====
        // Bảng append-only: ghi mọi quyết định, không bao giờ sửa/xoá lịch sử.
        modelBuilder.Entity<ModerationDecisionLog>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.TargetType).HasConversion<int>();
            entity.Property(e => e.Decision).HasConversion<int>();
            entity.Property(e => e.Source).HasConversion<int>();

            entity.Property(e => e.Stage).IsRequired().HasMaxLength(30);
            entity.Property(e => e.InternalReasonCode).HasMaxLength(100);
            entity.Property(e => e.LlmDecision).HasMaxLength(20);
            entity.Property(e => e.Categories).HasMaxLength(200);
            entity.Property(e => e.ActorRole).HasMaxLength(30);
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.PromptVersion).HasMaxLength(20);
            entity.Property(e => e.ModelName).HasMaxLength(60);

            // Query thống kê đồng thuận: lọc theo thời gian + loại nội dung.
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.TargetType, e.CreatedAt });

            // Truy vết toàn bộ lịch sử của một nội dung.
            entity.HasIndex(e => new { e.ModerationResultId, e.CreatedAt });
        });

        // ===== USER STRIKE CONFIGURATION =====
        // Lịch sử vi phạm dùng để tự động khoá tài khoản (3.5).
        modelBuilder.Entity<UserStrike>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.UserId, e.IsRevoked });
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.ModerationResultId);

            entity.Property(e => e.ReasonCode).IsRequired().HasMaxLength(100);
            entity.Property(e => e.IssuedBy).IsRequired().HasMaxLength(30);
            entity.Property(e => e.RevokedReason).HasMaxLength(500);
        });
    }
}
