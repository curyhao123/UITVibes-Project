using AuthService.DTOs;

namespace AuthService.ServiceLayer.Interface
{
    public interface IAuthService
    {
        Task<AuthResponse> RegisterAsync(RegisterRequest request);
        Task<AuthResponse> LoginAsync(LoginRequest request);
        Task<AuthResponse> RefreshTokenAsync(string refreshToken);
        Task<bool> ValidateTokenAsync(string token);
        Task RevokeTokenAsync(string refreshToken);
        Task DeleteAccountAsync(Guid userId, string password);
        Task SendVerificationEmailAsync(string email);
        Task VerifyEmailAsync(string email, string otp);
        Task<AuthResponse> VerifyEmailAndLoginAsync(string email, string otp);
        Task ResendOtpAsync(string email);
    }
}
