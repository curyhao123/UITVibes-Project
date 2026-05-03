using System.Security.Claims;
using AuthService.DTOs;
using AuthService.Models;
using AuthService.ServiceLayer;
using AuthService.ServiceLayer.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class AuthController: ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                var response = await _authService.RegisterAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var response = await _authService.LoginAsync(request);
                return Ok(response);
            }
            catch (CustomAuthException ex)
            {
                if (ex.ErrorCode == "NOT_VERIFIED")
                {
                    return StatusCode(403, new
                    {
                        errorCode = ex.ErrorCode,
                        message = ex.Message,
                        email = ex.Email
                    });
                }
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login");
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                var response = await _authService.RefreshTokenAsync(request.RefreshToken);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token refresh");
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPost("validate")]
        public async Task<IActionResult> ValidateToken([FromBody] ValidateTokenRequest request)
        {
            try
            {
                var isValid = await _authService.ValidateTokenAsync(request.Token);
                return Ok(new { isValid });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token validation");
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPost("revoke")]
        public async Task<IActionResult> RevokeToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                await _authService.RevokeTokenAsync(request.RefreshToken);
                return Ok(new { message = "Token revoked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token revocation");
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("delete-account")]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing user identity" });
            }

            try
            {
                await _authService.DeleteAccountAsync(userId, request?.Password ?? string.Empty);
                return Ok(new { message = "Account deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account for user {UserId}", userId);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("send-verification")]
        public async Task<IActionResult> SendVerificationEmail([FromBody] SendVerificationRequest request)
        {
            try
            {
                await _authService.SendVerificationEmailAsync(request.Email);
                return Ok(new { message = "Verification code has been sent to your email." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending verification email to {Email}", request.Email);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
        {
            try
            {
                await _authService.VerifyEmailAsync(request.Email, request.Otp);
                return Ok(new { message = "Email verified successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying email {Email}", request.Email);
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Verifies OTP then returns auth tokens.
        /// Used by the Login → Verify flow so the frontend gets tokens immediately.
        /// </summary>
        [HttpPost("verify-email-and-login")]
        public async Task<IActionResult> VerifyEmailAndLogin([FromBody] VerifyEmailRequest request)
        {
            try
            {
                var response = await _authService.VerifyEmailAndLoginAsync(request.Email, request.Otp);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying email and logging in for {Email}", request.Email);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp([FromBody] ResendOtpRequest request)
        {
            try
            {
                await _authService.ResendOtpAsync(request.Email);
                return Ok(new { message = "A new verification code has been sent." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resending OTP to {Email}", request.Email);
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
