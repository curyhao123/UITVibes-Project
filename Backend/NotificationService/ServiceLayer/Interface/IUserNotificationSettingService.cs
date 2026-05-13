namespace NotificationService.ServiceLayer.Interface
{
    public interface IUserNotificationSettingService
    {
        Task<bool> IsEnabledAsync(Guid userId, CancellationToken ct = default);
        Task UpdateAsync(Guid userId, bool isEnabled, CancellationToken ct = default);
    }
}
