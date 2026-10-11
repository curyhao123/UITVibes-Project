using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Reflection.Emit;
using Microsoft.EntityFrameworkCore.Design;

namespace AuthService.Models
{
    public class AuthDbContext : DbContext
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.Username).IsUnique();
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
                entity.Property(e => e.PasswordHash).IsRequired();
                entity.Property(e => e.Role).HasConversion<int>();

                // OAuth provider fields — nullable, indexed for fast lookup
                entity.Property(e => e.Provider).HasMaxLength(50);
                entity.Property(e => e.ProviderUserId).HasMaxLength(255);
                entity.Property(e => e.ProfilePictureUrl).HasMaxLength(1024);
                // Composite unique index for OAuth lookups: (Provider, ProviderUserId)
                // Filtered index — only when both are not null (PostgreSQL syntax)
                entity.HasIndex(e => new { e.Provider, e.ProviderUserId })
                    .IsUnique()
                    .HasFilter("\"Provider\" IS NOT NULL AND \"ProviderUserId\" IS NOT NULL");
            });

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Token).IsUnique();
                entity.Property(e => e.Token).IsRequired();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.RefreshTokens)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
