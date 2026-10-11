using AuthService.DTOs;

namespace AuthService.ServiceLayer.Interface
{
    public interface IGoogleAuthService
    {
        /// <summary>
        /// Exchanges an authorization `code` for a Google id_token (server-side, using
        /// configured ClientSecret + PKCE code_verifier), then verifies the id_token
        /// against Google's tokeninfo endpoint, finds/creates a local user, and
        /// returns the same AuthResponse shape as password login.
        /// </summary>
        Task<AuthResponse> LoginWithGoogleAsync(
            string code,
            string codeVerifier,
            string redirectUri,
            string platform);
    }
}
