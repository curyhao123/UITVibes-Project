namespace NotificationService.Models
{
    public class DeviceToken
    {
        public Guid Id { get; private set; } = Guid.NewGuid();

        public Guid UserId { get; private set; }
        public string Token { get; private set; } = string.Empty;
        public DevicePlatform Platform { get; init; }

        public bool IsActive { get; private set; } = true;
        public DateTime LastUsedAt { get; private set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

        public static DeviceToken Create(Guid userId, string token, DevicePlatform platform)
            => new() { UserId = userId, Token = token, Platform = platform };

        public void Refresh(string newToken)
        {
            Token = newToken;
            LastUsedAt = DateTime.UtcNow;
            IsActive = true;
        }

        public void Deactivate() => IsActive = false;

        public void UpdateUser(Guid newUserId)
        {
            UserId = newUserId;
        }
    }

    public enum DevicePlatform { Android, iOS }
}
