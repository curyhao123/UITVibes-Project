namespace AuthService.DTOs
{
    /// <summary>
    /// Decoded Google ID token payload (subset of fields we need).
    /// See: https://developers.google.com/identity/sign-in/web/backend-auth
    /// </summary>
    public class GoogleUserInfo
    {
        /// <summary>Google's unique user ID (stable across logins for the same Google account).</summary>
        public string Sub { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public bool EmailVerified { get; set; }

        public string Name { get; set; } = string.Empty;

        public string GivenName { get; set; } = string.Empty;

        public string FamilyName { get; set; } = string.Empty;

        public string Picture { get; set; } = string.Empty;

        /// <summary>OAuth client ID the token was issued for — must match one of our configured ClientIds.</summary>
        public string Aud { get; set; } = string.Empty;

        /// <summary>Token issuer — should always be "https://accounts.google.com" or "accounts.google.com".</summary>
        public string Iss { get; set; } = string.Empty;

        /// <summary>Token expiration (Unix seconds).</summary>
        public long Exp { get; set; }
    }
}
