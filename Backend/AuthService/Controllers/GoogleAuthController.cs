using AuthService.DTOs;
using AuthService.ServiceLayer.Interface;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GoogleAuthController : ControllerBase
    {
        private readonly IGoogleAuthService _googleAuthService;
        private readonly ILogger<GoogleAuthController> _logger;

        public GoogleAuthController(
            IGoogleAuthService googleAuthService,
            ILogger<GoogleAuthController> logger)
        {
            _googleAuthService = googleAuthService;
            _logger = logger;
        }

        /// <summary>
        /// Verifies a Google id_token and returns the same AuthResponse as password login.
        /// </summary>
        /// <remarks>
        /// POST /api/googleauth/login
        /// Body: { "idToken": "eyJhbGc...", "platform": "web" | "ios" | "android" }
        ///
        /// Behavior:
        /// - If user with (Provider="Google", ProviderUserId=sub) exists → login.
        /// - If user with same email exists (password account) → attach Google provider (account linking).
        /// - Otherwise → create new user, publish user.created, return tokens.
        /// </remarks>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] GoogleLoginRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Code))
                return BadRequest(new ErrorResponse
                {
                    ErrorCode = "INVALID_REQUEST",
                    Message = "code is required"
                });
            if (string.IsNullOrWhiteSpace(request.CodeVerifier))
                return BadRequest(new ErrorResponse
                {
                    ErrorCode = "INVALID_REQUEST",
                    Message = "codeVerifier is required (PKCE)"
                });
            if (string.IsNullOrWhiteSpace(request.RedirectUri))
                return BadRequest(new ErrorResponse
                {
                    ErrorCode = "INVALID_REQUEST",
                    Message = "redirectUri is required"
                });

            try
            {
                var response = await _googleAuthService.LoginWithGoogleAsync(
                    request.Code,
                    request.CodeVerifier,
                    request.RedirectUri,
                    string.IsNullOrWhiteSpace(request.Platform) ? "web" : request.Platform);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Google login failed (platform={Platform})", request.Platform);

                var msg = ex.Message ?? "Google login failed";
                if (msg.Contains("id_token", StringComparison.OrdinalIgnoreCase) ||
                    msg.Contains("expired", StringComparison.OrdinalIgnoreCase) ||
                    msg.Contains("issuer", StringComparison.OrdinalIgnoreCase) ||
                    msg.Contains("audience", StringComparison.OrdinalIgnoreCase) ||
                    msg.Contains("not configured", StringComparison.OrdinalIgnoreCase) ||
                    msg.Contains("redirect_uri", StringComparison.OrdinalIgnoreCase) ||
                    msg.Contains("code", StringComparison.OrdinalIgnoreCase))
                {
                    return Unauthorized(new ErrorResponse
                    {
                        ErrorCode = "INVALID_GOOGLE_TOKEN",
                        Message = msg
                    });
                }

                return BadRequest(new ErrorResponse
                {
                    ErrorCode = "GOOGLE_LOGIN_ERROR",
                    Message = msg
                });
            }
        }
    }
}
