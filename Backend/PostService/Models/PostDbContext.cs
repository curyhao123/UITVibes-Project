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
    }
}
