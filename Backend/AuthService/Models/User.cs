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
        public bool IsVerified { get; set; } = false;

        public string? OtpCode { get; set; }
        public DateTime? OtpExpiry { get; set; }
        public int OtpResendCount { get; set; } = 0;      // chống spam gửi lại
        public DateTime? LastOtpSentAt { get; set; }

        public List<RefreshToken> RefreshTokens { get; set; } = new();
    }
}
