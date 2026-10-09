using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AuthService.DTOs;
using AuthService.Messaging;
using AuthService.Models;
using AuthService.ServiceLayer.Interface;
using Microsoft.EntityFrameworkCore;

namespace AuthService.ServiceLayer.Implementation
{
    public class GoogleAuthService : IGoogleAuthService
    {
        private readonly AuthDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly IConfiguration _configuration;
        private readonly IMessagePublisher _messagePublisher;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<GoogleAuthService> _logger;

        // Google OAuth 2.0 endpoints
        private const string GoogleTokenEndpoint = "https://oauth2.googleapis.com/token";
        private const string GoogleTokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo";

        public GoogleAuthService(
            AuthDbContext context,
            ITokenService tokenService,
            IConfiguration configuration,
            IMessagePublisher messagePublisher,
            IHttpClientFactory httpClientFactory,
            ILogger<GoogleAuthService> logger)
        {
            _context = context;
            _tokenService = tokenService;
            _configuration = configuration;
            _messagePublisher = messagePublisher;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<AuthResponse> LoginWithGoogleAsync(
            string code,
            string codeVerifier,
            string redirectUri,
            string platform)
        {
            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("code is required");
            if (string.IsNullOrWhiteSpace(codeVerifier))
                throw new ArgumentException("codeVerifier is required (PKCE)");
            if (string.IsNullOrWhiteSpace(redirectUri))
                throw new ArgumentException("redirectUri is required");

            // ── 1. Resolve client credentials for the platform ─────────────────
            var (clientId, clientSecret) = GetClientCredentialsForPlatform(platform);

            // ── 2. Exchange code → id_token (server-side) ──────────────────────
            // For public clients (SPAs, native mobile apps using PKCE), the
            // client_secret is optional. We only include it if configured.
            var clientSecret = _configuration["GoogleAuth:ClientSecret"];
            var idToken = await ExchangeCodeForIdTokenAsync(
                code, codeVerifier, redirectUri, clientId,
                string.IsNullOrEmpty(clientSecret) ? null : clientSecret);

            // ── 3. Verify id_token against Google's tokeninfo endpoint ─────────
            var googleUser = await VerifyGoogleIdTokenAsync(idToken, platform);

            // ── 4. Find existing user by (Provider, ProviderUserId), else by email ─
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Provider == "Google" && u.ProviderUserId == googleUser.Sub);

            if (user == null && !string.IsNullOrEmpty(googleUser.Email))
            {
                // Account linking: attach Google provider to existing password account
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == googleUser.Email);
                if (user != null)
                {
                    _logger.LogInformation(
                        "Linking Google provider to existing user {UserId} via email match",
                        user.Id);
                    user.Provider = "Google";
                    user.ProviderUserId = googleUser.Sub;
                }
            }

            // ── 5. Create new user if no match found ────────────────────────────
            if (user == null)
            {
                user = await CreateUserFromGoogleAsync(googleUser);
            }

            // ── 6. Always mark verified + update picture on Google login ────────
            user.IsVerified = true;
            if (!string.IsNullOrEmpty(googleUser.Picture))
                user.ProfilePictureUrl = googleUser.Picture;

            // ── 7. Issue access + refresh tokens (same as password login) ──────
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            var refreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                Token = refreshToken,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(
                    Convert.ToDouble(_configuration["Jwt:RefreshTokenExpiresInDays"])),
                IsRevoked = false
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Google login successful for user {UserId} (provider={Provider}, sub={Sub})",
                user.Id, user.Provider, googleUser.Sub);

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(
                    Convert.ToDouble(_configuration["Jwt:ExpiresInMinutes"])),
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    Username = user.Username,
                    IsVerified = user.IsVerified ? "True" : "False",
                    Role = user.Role.ToString()
                }
            };
        }

        // ─── Helpers ────────────────────────────────────────────────────────

        private (string ClientId, string ClientSecret) GetClientCredentialsForPlatform(string platform)
        {
            string? clientId;
            string? clientSecret;

            // iOS and Android use the platform-specific ClientId.
            // Web (and Expo Go / dev) use the Web ClientId.
            // All of them share the same ClientSecret.
            if (string.Equals(platform, "ios", StringComparison.OrdinalIgnoreCase))
            {
                clientId = _configuration["GoogleAuth:iOSClientId"];
            }
            else if (string.Equals(platform, "android", StringComparison.OrdinalIgnoreCase))
            {
                clientId = _configuration["GoogleAuth:AndroidClientId"];
            }
            else
            {
                clientId = _configuration["GoogleAuth:WebClientId"];
            }

            clientSecret = _configuration["GoogleAuth:ClientSecret"];

            if (string.IsNullOrEmpty(clientId))
            {
                _logger.LogError(
                    "Google client ID missing for platform={Platform}",
                    platform);
                throw new Exception("Google authentication is not configured on the server");
            }

            // client_secret is optional for public clients using PKCE.
            // Only required for confidential server-side clients.

            return (clientId!, clientSecret);
        }

        private async Task<string> ExchangeCodeForIdTokenAsync(
            string code,
            string codeVerifier,
            string redirectUri,
            string clientId,
            string? clientSecret)
        {
            // OAuth 2.0 Token Request (RFC 6749 §4.1.3) + PKCE (RFC 7636)
            // POST https://oauth2.googleapis.com/token
            // application/x-www-form-urlencoded body
            //
            // NOTE: client_secret is optional for public clients (SPAs, native mobile
            // apps) that use PKCE. The PKCE code_verifier is the proof-of-possession
            // instead. See: https://developers.google.com/identity/oauth2/web/guides/use-code-model
            var form = new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = clientId,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code",
                ["code_verifier"] = codeVerifier,
            };

            // Only include client_secret if configured (for confidential clients like
            // server-side web apps). Native/SPA clients should NOT include it.
            if (!string.IsNullOrEmpty(clientSecret))
            {
                form["client_secret"] = clientSecret;
            }

            var http = _httpClientFactory.CreateClient("Google");
            var response = await http.PostAsync(
                GoogleTokenEndpoint,
                new FormUrlEncodedContent(form));

            var raw = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Google token exchange failed: {Status} {Body}",
                    response.StatusCode, raw);
                throw new Exception(
                    "Failed to exchange authorization code with Google. " +
                    "Check that the redirect URI matches the one registered in Google Cloud Console.");
            }

            var token = JsonSerializer.Deserialize<GoogleTokenResponse>(raw,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (token == null || string.IsNullOrEmpty(token.IdToken))
            {
                _logger.LogWarning("Google token response missing id_token: {Body}", raw);
                throw new Exception("Google token response did not contain an id_token");
            }

            return token.IdToken;
        }

        private async Task<GoogleUserInfo> VerifyGoogleIdTokenAsync(string idToken, string platform)
        {
            // Fetch Google's verification endpoint
            var http = _httpClientFactory.CreateClient("Google");
            var response = await http.GetAsync(
                $"{GoogleTokenInfoUrl}?id_token={Uri.EscapeDataString(idToken)}");

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Google tokeninfo rejected id_token: {Status} {Body}", response.StatusCode, body);
                throw new Exception("Invalid Google id_token");
            }

            var info = await response.Content.ReadFromJsonAsync<GoogleUserInfo>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (info == null || string.IsNullOrEmpty(info.Sub))
                throw new Exception("Invalid Google id_token payload");

            // Validate issuer
            if (info.Iss != "https://accounts.google.com" && info.Iss != "accounts.google.com")
                throw new Exception("Invalid Google id_token issuer");

            // Validate audience (aud) — must match one of our configured ClientIds
            var validAudiences = new List<string>();
            var webId = _configuration["GoogleAuth:WebClientId"];
            var iosId = _configuration["GoogleAuth:iOSClientId"];
            var androidId = _configuration["GoogleAuth:AndroidClientId"];
            if (!string.IsNullOrEmpty(webId)) validAudiences.Add(webId);
            if (!string.IsNullOrEmpty(iosId)) validAudiences.Add(iosId);
            if (!string.IsNullOrEmpty(androidId)) validAudiences.Add(androidId);

            if (!validAudiences.Contains(info.Aud))
            {
                _logger.LogWarning(
                    "Google id_token aud={Actual} does not match any configured client ID (platform={Platform})",
                    info.Aud, platform);
                throw new Exception("Google id_token was not issued for this application");
            }

            // Validate expiration
            var expTime = DateTimeOffset.FromUnixTimeSeconds(info.Exp);
            if (expTime < DateTimeOffset.UtcNow)
                throw new Exception("Google id_token has expired");

            // Require verified email
            if (!info.EmailVerified)
                throw new Exception("Google account email is not verified");

            if (string.IsNullOrEmpty(info.Email))
                throw new Exception("Google account has no email");

            return info;
        }

        private async Task<User> CreateUserFromGoogleAsync(GoogleUserInfo info)
        {
            // Generate a unique username from email local-part + random suffix
            var baseUsername = (info.Email.Split('@')[0] ?? "user")
                .Replace(".", "").Replace("-", "").Replace("_", "");
            if (baseUsername.Length > 20) baseUsername = baseUsername.Substring(0, 20);
            if (baseUsername.Length < 3) baseUsername = "user";

            var username = baseUsername;
            var attempts = 0;
            while (await _context.Users.AnyAsync(u => u.Username == username))
            {
                attempts++;
                if (attempts > 10)
                {
                    username = $"u_{Guid.NewGuid():N}".Substring(0, 16);
                    break;
                }
                var suffix = RandomNumberGenerator.GetInt32(0x1000, 0xFFFF).ToString("x4");
                username = $"{baseUsername}_{suffix}";
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = info.Email,
                Username = username,
                // OAuth users have no password — random hash so DB NOT NULL constraint is satisfied.
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
                Provider = "Google",
                ProviderUserId = info.Sub,
                ProfilePictureUrl = info.Picture,
                IsActive = true,
                IsVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Publish user.created so UserService provisions the UserProfile
            try
            {
                await _messagePublisher.PublishUserCreatedAsync(user.Id, user.Email, user.Username);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to publish UserCreated event for Google signup {UserId}", user.Id);
            }

            _logger.LogInformation("Created new user {UserId} from Google (sub={Sub})", user.Id, info.Sub);
            return user;
        }
    }
}
