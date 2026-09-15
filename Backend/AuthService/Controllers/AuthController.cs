using System.Security.Claims;
using AuthService.DTOs;
using AuthService.ServiceLayer.Interface;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class AuthController : ControllerBase
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
                return BadRequest(new ErrorResponse { ErrorCode = "REGISTER_ERROR", Message = ex.Message });
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login");
                if (ex.Message.StartsWith("IS_BANNED|"))
                {
                    var banReason = ex.Message.Substring("IS_BANNED|".Length);
                    return BadRequest(new ErrorResponse { ErrorCode = "IS_BANNED", Message = banReason });
                }
                return BadRequest(new ErrorResponse { ErrorCode = "LOGIN_ERROR", Message = ex.Message });
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
                if (ex.Message.StartsWith("IS_BANNED|"))
                {
                    var banReason = ex.Message.Substring("IS_BANNED|".Length);
                    return BadRequest(new ErrorResponse { ErrorCode = "IS_BANNED", Message = banReason });
                }
                return BadRequest(new ErrorResponse { ErrorCode = "REFRESH_TOKEN_ERROR", Message = ex.Message });
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
                return BadRequest(new ErrorResponse { ErrorCode = "VALIDATE_TOKEN_ERROR", Message = ex.Message });
            }
        }

        [HttpPost("revoke")]
        public async Task<IActionResult> RevokeToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                await _authService.RevokeTokenAsync(request.RefreshToken);
                return Ok(new SuccessResponse { Message = "Token revoked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token revocation");
                return BadRequest(new ErrorResponse { ErrorCode = "REVOKE_TOKEN_ERROR", Message = ex.Message });
            }
        }

        [HttpPost("delete-account")]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new ErrorResponse { ErrorCode = "UNAUTHORIZED", Message = "Invalid or missing user identity" });
            }

            try
            {
                await _authService.DeleteAccountAsync(userId, request?.Password ?? string.Empty);
                return Ok(new SuccessResponse { Message = "Account deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account for user {UserId}", userId);
                return BadRequest(new ErrorResponse { ErrorCode = "ERROR", Message = ex.Message });
            }
        }

        // ==================== SEND OTP (xác thực tài khoản) ====================
        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest request)
        {
            try
            {
                await _authService.SendOtpAsync(request.Email);
                return Ok(new SuccessResponse { Message = "Mã OTP đã được gửi về email của bạn" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending OTP to {Email}", request.Email);
                return BadRequest(new ErrorResponse { ErrorCode = "OTP_ERROR", Message = ex.Message });
            }
        }

        // ==================== VERIFY OTP (xác thực tài khoản) ====================
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            try
            {
                await _authService.VerifyOtpAsync(request.Email, request.OtpCode);
                return Ok(new SuccessResponse { Message = "Xác thực tài khoản thành công" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying OTP for {Email}", request.Email);
                return BadRequest(new ErrorResponse { ErrorCode = "OTP_ERROR", Message = ex.Message });
            }
        }

        // ==================== FORGOT PASSWORD ====================
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                await _authService.SendForgotPasswordOtpAsync(request.Email);
                return Ok(new SuccessResponse { Message = "Mã OTP đã được gửi về email của bạn" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending forgot password OTP to {Email}", request.Email);
                return BadRequest(new ErrorResponse { ErrorCode = "OTP_ERROR", Message = ex.Message });
            }
        }

        // ==================== RESET PASSWORD ====================
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                await _authService.VerifyForgotPasswordOtpAsync(
                    request.Email,
                    request.OtpCode,
                    request.NewPassword);
                return Ok(new SuccessResponse { Message = "Đổi mật khẩu thành công" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password for {Email}", request.Email);
                return BadRequest(new ErrorResponse { ErrorCode = "ERROR", Message = ex.Message });
            }
        }

        // ==================== CHANGE PASSWORD (send OTP) ====================
        [HttpPost("change-password/send-otp")]
        public async Task<IActionResult> SendChangePasswordOtp([FromBody] ChangePasswordOtpRequest request)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new ErrorResponse { ErrorCode = "UNAUTHORIZED", Message = "User ID not found in request headers" });
            }

            try
            {
                await _authService.SendChangePasswordOtpAsync(userId, request.OldPassword);
                return Ok(new SuccessResponse { Message = "Mã OTP đã được gửi về email của bạn" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending change password OTP for user {UserId}", userId);
                return BadRequest(new ErrorResponse { ErrorCode = "ERROR", Message = ex.Message });
            }
        }

        [HttpPost("ban-user/{userId}")]
        public async Task<IActionResult> BanUser(Guid userId)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
            {
                return Unauthorized(new ErrorResponse { ErrorCode = "UNAUTHORIZED", Message = "User ID not found in request headers" });
            }

            try
            {
                var result = await _authService.BanUserAsync(userId);
                if (result)
                {
                    return Ok(new SuccessResponse { Message = "User banned successfully" });
                }
                else
                {
                    return NotFound(new ErrorResponse { ErrorCode = "NOT_FOUND", Message = "User not found or already banned" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error banning user {UserId}", userId);
                return BadRequest(new ErrorResponse { ErrorCode = "BAN_USER_ERROR", Message = ex.Message });
            }
        }

        [HttpPost("unban-user/{userId}")]
        public async Task<IActionResult> UnbanUser(Guid userId)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
            {
                return Unauthorized(new ErrorResponse { ErrorCode = "UNAUTHORIZED", Message = "User ID not found in request headers" });
            }

            try
            {
                var result = await _authService.UnbanUserAsync(userId);
                if (result)
                {
                    return Ok(new SuccessResponse { Message = "User unbanned successfully" });
                }
                else
                {
                    return NotFound(new ErrorResponse { ErrorCode = "NOT_FOUND", Message = "User not found or not banned" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unbanning user {UserId}", userId);
                return BadRequest(new ErrorResponse { ErrorCode = "ERROR", Message = ex.Message });
            }
        }
    }
}
