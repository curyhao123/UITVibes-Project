using StackExchange.Redis;
using Role = AuthService.Enums.Role;

namespace AuthService.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsBanned { get; set; } = false;
        public bool IsVerified { get; set; } = false;

        public Role Role { get; set; } = Role.User;

        public string? OtpCode { get; set; }
        public DateTime? OtpExpiry { get; set; }
        public int OtpResendCount { get; set; } = 0;      // chống spam gửi lại
        public DateTime? LastOtpSentAt { get; set; }

        // ─── OAuth / External login providers (Google, Apple, Facebook, ...) ─────
        public string? Provider { get; set; }                  // "Google" | "Apple" | null = password account
        public string? ProviderUserId { get; set; }            // Google `sub` / Apple `sub`
        public string? ProfilePictureUrl { get; set; }         // từ Google `picture` claim

        public List<RefreshToken> RefreshTokens { get; set; } = new();
    }
}

