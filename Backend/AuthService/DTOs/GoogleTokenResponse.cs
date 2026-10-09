using System.Text.Json.Serialization;

namespace AuthService.DTOs
{
    /// <summary>
    /// Subset of Google's OAuth token endpoint response.
    /// See: https://developers.google.com/identity/oauth2/web/guides/use-token-model
    /// </summary>
    public class GoogleTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("id_token")]
        public string IdToken { get; set; } = string.Empty;

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }

        [JsonPropertyName("scope")]
        public string Scope { get; set; } = string.Empty;

        [JsonPropertyName("token_type")]
        public string TokenType { get; set; } = "Bearer";
    }
}
