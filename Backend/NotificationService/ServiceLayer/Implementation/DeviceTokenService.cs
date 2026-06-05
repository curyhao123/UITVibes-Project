using Microsoft.EntityFrameworkCore;
using NotificationService.Models;
using NotificationService.ServiceLayer.Interface;

namespace NotificationService.ServiceLayer.Implementation
{
    public class DeviceTokenService : IDeviceTokenService
    {
        private readonly ILogger<DeviceTokenService> _logger;
        private readonly NotificationDbContext _db;
        public DeviceTokenService(ILogger<DeviceTokenService> logger, NotificationDbContext dbContext)
        {
            _logger = logger;
            _db = dbContext;
        }
        public async Task RegisterAsync(Guid userId, string token, DevicePlatform platform, CancellationToken ct = default)
        {
            if (userId == Guid.Empty)
            {
                throw new InvalidOperationException("A valid user id is required to register a device token.");
            }

            if (string.IsNullOrWhiteSpace(token))
            {
                throw new ArgumentException("Device token is required.", nameof(token));
            }

            // Token đã tồn tại chưa (có thể của user khác khi đổi thiết bị)
            var existing = await _db.DeviceTokens
                .FirstOrDefaultAsync(x => x.Token == token, ct);

            if (existing is not null)
            {
                existing.Reassign(userId, token, platform);
                await _db.SaveChangesAsync(ct);
                return;
            }

            _db.DeviceTokens.Add(DeviceToken.Create(userId, token, platform));
            await _db.SaveChangesAsync(ct);
        }

        public async Task DeactivateAsync(IEnumerable<string> tokens, CancellationToken ct = default)
        {
            await _db.DeviceTokens
                .Where(x => tokens.Contains(x.Token))
                .ExecuteUpdateAsync(x => x.SetProperty(t => t.IsActive, false), ct);
        }
        public async Task<List<string>> GetActiveTokensAsync(Guid userId, CancellationToken ct = default)
        => await _db.DeviceTokens
            .Where(x => x.UserId == userId && x.IsActive)
            .Select(x => x.Token)
            .ToListAsync(ct);

    }
}
