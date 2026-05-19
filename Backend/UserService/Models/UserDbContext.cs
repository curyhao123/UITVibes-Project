using Microsoft.EntityFrameworkCore;

namespace UserService.Models;

public class UserDbContext : DbContext
{
    public UserDbContext(DbContextOptions<UserDbContext> options) : base(options)
    {
    }

    public DbSet<UserProfile> UserProfiles { get; set; }
    public DbSet<SocialLink> SocialLinks { get; set; }
    public DbSet<Follow> Follows { get; set; }

    public DbSet<Block> Blocks { get; set; }
    public DbSet<UserReport> UserReports { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasAlternateKey(e => e.UserId);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasIndex(e => e.DisplayName).IsUnique();
            entity.Property(e => e.DisplayName).HasMaxLength(100);
            entity.Property(e => e.Bio).HasMaxLength(500);
            entity.Property(e => e.AvatarUrl).HasMaxLength(500);
            entity.Property(e => e.AvatarPublicId).HasMaxLength(500);
            entity.Property(e => e.CoverImagePublicId).HasMaxLength(500);
            entity.Property(e => e.CoverImageUrl).HasMaxLength(500);
            entity.Property(e => e.Location).HasMaxLength(100);
            entity.Property(e => e.Website).HasMaxLength(200);
            entity.Property(e => e.FullName).HasMaxLength(200);
        });

        modelBuilder.Entity<SocialLink>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Platform).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Url).IsRequired().HasMaxLength(500);
            
            entity.HasOne(e => e.UserProfile)
                .WithMany(u => u.SocialLinks)
                .HasForeignKey(e => e.UserProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Follow>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            // Composite index to prevent duplicate follows
            entity.HasIndex(e => new { e.FollowerId, e.FollowingId }).IsUnique();
            
            // Index for queries
            entity.HasIndex(e => e.FollowerId);
            entity.HasIndex(e => e.FollowingId);

            // ✅ NO FOREIGN KEY CONSTRAINTS
            // FollowerId and FollowingId reference UserId from AuthService, not UserProfile.Id
            // We'll handle referential integrity in application logic
        });

        modelBuilder.Entity<Block>(entity =>
        {
            entity.HasKey(e => e.Id);
            // Composite index to prevent duplicate blocks
            entity.HasIndex(e => new { e.BlockerId, e.BlockedId }).IsUnique();
            // Index for queries
            entity.HasIndex(e => e.BlockerId);
            entity.HasIndex(e => e.BlockedId);

        });

        modelBuilder.Entity<UserReport>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Composite index chống report trùng
            entity.HasIndex(e => new { e.ReporterId, e.TargetUserId });

            // Index cho query
            entity.HasIndex(e => e.TargetUserId);
            entity.HasIndex(e => e.ReporterId);
            entity.HasIndex(e => e.Status);

            // Không có FK constraint
            // ReporterId và TargetUserId tham chiếu UserId từ AuthService
            // Referential integrity xử lý ở application logic
        });
    }
}