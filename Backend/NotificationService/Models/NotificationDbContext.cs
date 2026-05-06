using Microsoft.EntityFrameworkCore;

namespace NotificationService.Models
{
    public class NotificationDbContext : DbContext
    {
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<DeviceToken> DeviceTokens => Set<DeviceToken>();
        public DbSet<UserNotificationSetting> UserNotificationSettings => Set<UserNotificationSetting>();
        public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

        protected override void OnModelCreating(ModelBuilder b)
        {
            b.Entity<Notification>(e =>
            {
                e.HasKey(x => x.Id);
                e.Property(x => x.Type).HasConversion<string>();
                e.HasIndex(x => new { x.UserId, x.CreatedAt });     // query theo user + thời gian
                e.HasIndex(x => new { x.UserId, x.IsRead });        // đếm unread nhanh
            });

            b.Entity<DeviceToken>(e =>
            {
                e.HasKey(x => x.Id);
                e.HasIndex(x => x.Token).IsUnique();
                e.HasIndex(x => new { x.UserId, x.IsActive });
                e.Property(x => x.Platform).HasConversion<string>();
            });

            b.Entity<UserNotificationSetting>(e =>
            {
                e.HasKey(x => x.UserId);
            });

            b.Entity<OutboxMessage>(e =>
            {
                e.HasKey(x => x.Id);
                // Index để background job poll Pending messages hiệu quả
                e.HasIndex(x => new { x.Status, x.CreatedAt })
                 .HasFilter("\"Status\" = 'Pending'");
                e.Property(x => x.Status).HasConversion<string>();
                e.Property(x => x.Channel).HasConversion<string>();
            });
        }
    }
}
