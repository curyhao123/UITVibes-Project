using NotificationService.Models;

namespace NotificationService.DTOs
{
    // Input khi React Native đăng ký token lúc app khởi động
    public record RegisterDeviceTokenRequest(
        string Token,
        DevicePlatform Platform   // "Android" | "iOS"
    );
}
