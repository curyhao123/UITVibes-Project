using System.Text.Json.Serialization;

namespace AuthService.DTOs
{
    /// <summary>
    /// Decoded Google ID token payload (subset of fields we need).
    /// See: https://developers.google.com/identity/sign-in/web/backend-auth
    /// </summary>
    public class GoogleUserInfo
    {
        /// <summary>Google's unique user ID (stable across logins for the same Google account).</summary>
        [JsonPropertyName("sub")]
        public string Sub { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Google's email_verified claim. The tokeninfo endpoint serializes this
        /// as the JSON string "true" / "false" rather than a boolean, so we keep
        /// it as a string and parse it via the <see cref="EmailVerified"/> helper.
        /// </summary>
        [JsonPropertyName("email_verified")]
        public string? EmailVerifiedRaw { get; set; }

        /// <summary>
        /// True iff Google's <c>email_verified</c> claim is the string "true"
        /// (case-insensitive). Anything else — null, "false", "0", missing — is
        /// treated as not verified, so we don't accept unverified Google accounts.
        /// </summary>
        [JsonIgnore]
        public bool EmailVerified
        {
            get
            {
                if (string.IsNullOrEmpty(EmailVerifiedRaw)) return false;
                return EmailVerifiedRaw.Equals("true", StringComparison.OrdinalIgnoreCase);
            }
        }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("given_name")]
        public string GivenName { get; set; } = string.Empty;

        [JsonPropertyName("family_name")]
        public string FamilyName { get; set; } = string.Empty;

        [JsonPropertyName("picture")]
        public string Picture { get; set; } = string.Empty;

        /// <summary>OAuth client ID the token was issued for — must match one of our configured ClientIds.</summary>
        [JsonPropertyName("aud")]
        public string Aud { get; set; } = string.Empty;

        /// <summary>Token issuer — should always be "https://accounts.google.com" or "accounts.google.com".</summary>
        [JsonPropertyName("iss")]
        public string Iss { get; set; } = string.Empty;

        /// <summary>
        /// Token expiration (Unix seconds).
        /// Google's tokeninfo endpoint occasionally serializes this as a
        /// JSON string instead of a number, so we keep it as a string and
        /// parse it ourselves in <c>GoogleAuthService.VerifyGoogleIdTokenAsync</c>.
        /// </summary>
        [JsonPropertyName("exp")]
        public string Exp { get; set; } = string.Empty;
    }
}
