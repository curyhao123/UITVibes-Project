using Microsoft.EntityFrameworkCore;
using NotificationService.Models;
using NotificationService.ServiceLayer.Interface;

namespace NotificationService.ServiceLayer.Implementation
{
    public class UserNotificationSettingService : IUserNotificationSettingService
    {
        private readonly NotificationDbContext _db;
        public UserNotificationSettingService(NotificationDbContext db) => _db = db;
        public async Task<bool> IsEnabledAsync(Guid userId, CancellationToken ct = default)
        {
            var setting = await _db.UserNotificationSettings
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);

            // Không có record = chưa từng tắt = enabled
            return setting?.IsEnabled ?? true;
        }

        public async Task UpdateAsync(Guid userId, bool isEnabled, CancellationToken ct = default)
        {
            var setting = await _db.UserNotificationSettings
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);

            if (setting is null)
            {
                _db.UserNotificationSettings.Add(new UserNotificationSetting
                {
                    UserId = userId,
                    IsEnabled = isEnabled
                });
            }
            else
            {
                if (isEnabled) setting.Enable();
                else setting.Disable();
            }

            await _db.SaveChangesAsync(ct);
        }
    }
}
