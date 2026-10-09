using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
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

        // Google tokeninfo endpoint — public, no API key required.
        // We use this (instead of Google's client library) to keep the surface minimal.
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

        public async Task<AuthResponse> LoginWithGoogleAsync(string idToken, string platform)
        {
            if (string.IsNullOrWhiteSpace(idToken))
                throw new ArgumentException("idToken is required");

            // ── 1. Verify id_token with Google ───────────────────────────────
            var googleUser = await VerifyGoogleIdTokenAsync(idToken, platform);

            // ── 2. Find existing user by ProviderUserId, or by Email ────────
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Provider == "Google" && u.ProviderUserId == googleUser.Sub);

            if (user == null && !string.IsNullOrEmpty(googleUser.Email))
            {
                // Account linking: if a password account with same email exists,
                // attach the Google provider to it instead of creating a duplicate.
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

            // ── 3. Create new user if no match found ─────────────────────────
            if (user == null)
            {
                user = await CreateUserFromGoogleAsync(googleUser);
            }

            // ── 4. Always mark verified + update picture on Google login ────
            user.IsVerified = true; // Google already verified the email
            if (!string.IsNullOrEmpty(googleUser.Picture))
                user.ProfilePictureUrl = googleUser.Picture;

            // ── 5. Issue access + refresh tokens (same as password login) ──
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

        private async Task<GoogleUserInfo> VerifyGoogleIdTokenAsync(string idToken, string platform)
        {
            // 1. Fetch Google's verification endpoint
            var http = _httpClientFactory.CreateClient("Google");
            var response = await http.GetAsync($"{GoogleTokenInfoUrl}?id_token={Uri.EscapeDataString(idToken)}");

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

            // 2. Validate issuer
            if (info.Iss != "https://accounts.google.com" && info.Iss != "accounts.google.com")
                throw new Exception("Invalid Google id_token issuer");

            // 3. Validate audience (aud) — must match one of our configured ClientIds
            var validAudiences = new List<string>();
            var webId = _configuration["GoogleAuth:WebClientId"];
            var iosId = _configuration["GoogleAuth:iOSClientId"];
            var androidId = _configuration["GoogleAuth:AndroidClientId"];
            if (!string.IsNullOrEmpty(webId)) validAudiences.Add(webId);
            if (!string.IsNullOrEmpty(iosId)) validAudiences.Add(iosId);
            if (!string.IsNullOrEmpty(androidId)) validAudiences.Add(androidId);

            if (validAudiences.Count == 0)
            {
                _logger.LogError("No Google ClientIds configured in GoogleAuth:* settings");
                throw new Exception("Google authentication is not configured on the server");
            }

            if (!validAudiences.Contains(info.Aud))
            {
                _logger.LogWarning(
                    "Google id_token aud={Actual} does not match any configured client ID (platform={Platform})",
                    info.Aud, platform);
                throw new Exception("Google id_token was not issued for this application");
            }

            // 4. Validate expiration (Google returns exp as Unix seconds)
            var expTime = DateTimeOffset.FromUnixTimeSeconds(info.Exp);
            if (expTime < DateTimeOffset.UtcNow)
                throw new Exception("Google id_token has expired");

            // 5. Require verified email
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
                // Append 4 random hex chars (up to 10 attempts to keep things bounded)
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
                // OAuth users have no password — store a non-null random hash so DB constraint
                // (`PasswordHash` is NOT NULL) is satisfied. They cannot log in via /auth/login.
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
                Provider = "Google",
                ProviderUserId = info.Sub,
                ProfilePictureUrl = info.Picture,
                IsActive = true,
                IsVerified = true, // Google already verified
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Publish user.created so UserService provisions the UserProfile (same as password register)
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
