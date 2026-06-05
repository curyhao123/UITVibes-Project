namespace NotificationService.Models
{
    public class DeviceToken
    {
        public Guid Id { get; private set; } = Guid.NewGuid();

        public Guid UserId { get; private set; }
        public string Token { get; private set; } = string.Empty;
        public DevicePlatform Platform { get; private set; }

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

        public void Reassign(Guid userId, string newToken, DevicePlatform platform)
        {
            UserId = userId;
            Platform = platform;
            Refresh(newToken);
        }

        public void Deactivate() => IsActive = false;
    }

    public enum DevicePlatform { Android, iOS }
}
