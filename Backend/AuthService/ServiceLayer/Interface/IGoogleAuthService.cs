using AuthService.DTOs;

namespace AuthService.ServiceLayer.Interface
{
    public interface IGoogleAuthService
    {
        /// <summary>
        /// Verifies a Google id_token against Google's tokeninfo endpoint,
        /// finds or creates a local user, and returns the same AuthResponse shape as password login.
        /// </summary>
        Task<AuthResponse> LoginWithGoogleAsync(string idToken, string platform);
    }
}
