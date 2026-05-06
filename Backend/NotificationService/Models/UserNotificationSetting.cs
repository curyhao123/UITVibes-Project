namespace NotificationService.Models
{
    public class UserNotificationSetting
    {
        public Guid UserId { get; init; }  // PK luôn, không cần Id riêng
        public bool IsEnabled { get; set; } = true;
    }
}
