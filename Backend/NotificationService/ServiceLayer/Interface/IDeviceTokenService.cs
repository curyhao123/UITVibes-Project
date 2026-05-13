using NotificationService.Models;

namespace NotificationService.ServiceLayer.Interface
{
    public interface IDeviceTokenService
    {
        Task RegisterAsync(Guid userId, string token, DevicePlatform platform, CancellationToken ct = default);
        Task DeactivateAsync(IEnumerable<string> tokens, CancellationToken ct = default);
        Task<List<string>> GetActiveTokensAsync(Guid userId, CancellationToken ct = default);
    }
}
