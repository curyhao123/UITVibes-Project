using AuthService.DTOs;
using Microsoft.AspNetCore.Mvc;

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
        Task SendOtpAsync(string email);
        Task VerifyOtpAsync(string email, string inputOtp);
        Task SendForgotPasswordOtpAsync(string email);
        Task VerifyForgotPasswordOtpAsync(string email, string inputOtp, string newPassword);
    }
}
