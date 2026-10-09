namespace AuthService.DTOs
{
    /// <summary>
    /// Request body for POST /api/googleauth/login.
    ///
    /// Modern flow (Google OAuth 2.0 — Authorization Code + PKCE):
    /// 1. Frontend opens Google OAuth via expo-auth-session with `response_type=code`.
    /// 2. Google redirects back with an authorization `code`.
    /// 3. Frontend sends the `code` to this endpoint.
    /// 4. Backend exchanges the `code` for an `id_token` using the configured
    ///    `ClientSecret` (server-side, secure) — no secrets ever touch the client.
    /// 5. Backend verifies the `id_token` against Google's tokeninfo endpoint
    ///    and provisions / links the local user account.
    /// </summary>
    public class GoogleLoginRequest
    {
        /// <summary>Authorization code returned by Google in the OAuth callback.</summary>
        public string Code { get; set; } = string.Empty;

        /// <summary>
        /// PKCE code_verifier that was used to mint the auth request.
        /// Backend forwards it to Google's token endpoint along with the code.
        /// </summary>
        public string CodeVerifier { get; set; } = string.Empty;

        /// <summary>
        /// The exact redirect URI the FE used when initiating the OAuth flow.
        /// Must match the one sent to Google's token endpoint, otherwise the
        /// code exchange will fail with `redirect_uri_mismatch`.
        /// </summary>
        public string RedirectUri { get; set; } = string.Empty;

        /// <summary>Client platform that initiated the sign-in — used for audience (aud) validation.</summary>
        /// <remarks>"web" | "ios" | "android"</remarks>
        public string Platform { get; set; } = "web";
    }
}
