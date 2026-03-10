using Microsoft.EntityFrameworkCore;

namespace MessageService.Models;

public class MessageDbContext : DbContext
{
    public MessageDbContext(DbContextOptions<MessageDbContext> options) : base(options)
    {
    }

    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<ConversationMember> ConversationMembers { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<MessageReadReceipt> MessageReadReceipts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ===== CONVERSATION =====
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CreatedByUserId);
            entity.HasIndex(e => e.LastMessageAt);
            entity.HasIndex(e => e.IsDeleted);

            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.AvatarUrl).HasMaxLength(500);
            entity.Property(e => e.LastMessageContent).HasMaxLength(500);
            entity.Property(e => e.Type).HasConversion<int>();

            entity.HasMany(e => e.Members)
                .WithOne(m => m.Conversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Messages)
                .WithOne(m => m.Conversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== CONVERSATION MEMBER =====
        modelBuilder.Entity<ConversationMember>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ConversationId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.UserId);

            entity.Property(e => e.Nickname).HasMaxLength(50);
            entity.Property(e => e.Role).HasConversion<int>();
        });

        // ===== MESSAGE =====
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ConversationId);
            entity.HasIndex(e => e.SenderId);
            entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });
            entity.HasIndex(e => e.IsDeleted);

            entity.Property(e => e.Content).HasMaxLength(4000);
            entity.Property(e => e.MediaUrl).HasMaxLength(500);
            entity.Property(e => e.MediaPublicId).HasMaxLength(500);
            entity.Property(e => e.FileName).HasMaxLength(255);
            entity.Property(e => e.Type).HasConversion<int>();

            entity.HasOne(e => e.ReplyToMessage)
                .WithMany()
                .HasForeignKey(e => e.ReplyToMessageId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.ReadReceipts)
                .WithOne(r => r.Message)
                .HasForeignKey(r => r.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== MESSAGE READ RECEIPT =====
        modelBuilder.Entity<MessageReadReceipt>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.MessageId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.UserId);
        });
    }
}