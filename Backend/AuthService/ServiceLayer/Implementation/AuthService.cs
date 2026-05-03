using AuthService.DTOs;
using AuthService.Messaging;
using AuthService.Models;
using AuthService.ServiceLayer.Interface;
using Microsoft.EntityFrameworkCore;

namespace AuthService.ServiceLayer.Implementation
{
    public class AuthService : IAuthService
    {
        private readonly AuthDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly IConfiguration _configuration;
        private readonly IMessagePublisher _messagePublisher;
        private readonly IEmailService _emailService;

        public AuthService(
            AuthDbContext context,
            ITokenService tokenService,
            IConfiguration configuration,
            IMessagePublisher messagePublisher,
            IEmailService emailService)
        {
            _context = context;
            _tokenService = tokenService;
            _configuration = configuration;
            _messagePublisher = messagePublisher;
            _emailService = emailService;
        }


        //dang ky
        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            // Check if user exists
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                throw new Exception("Email already exists");
            }

            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
            {
                throw new Exception("Username already exists");
            }

            // Create user
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = request.Email,
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(user);

            // Generate tokens
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            var refreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                Token = refreshToken,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(Convert.ToDouble(_configuration["Jwt:RefreshTokenExpiresInDays"])),
                IsRevoked = false
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            // 👇 Publish UserCreated event to RabbitMQ
            try
            {
                await _messagePublisher.PublishUserCreatedAsync(user.Id, user.Email, user.Username);
            }
            catch (Exception ex)
            {
                // Log but don't fail registration
                // UserService can sync later if needed
                Console.WriteLine($"Failed to publish UserCreated event: {ex.Message}");
            }

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiresInMinutes"])),
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    Username = user.Username
                }
            };
        }


        //dang nhap
        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
            {
                throw new Exception("Invalid email or password");
            }

            if (!user.IsVerified)
            {
                throw new CustomAuthException("NOT_VERIFIED", "Account not verified. Please verify your email first.", user.Email);
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                throw new Exception("Invalid email or password");
            }

            if (!user.IsActive)
            {
                throw new Exception("User account is inactive");
            }

            // Generate tokens
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            var refreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                Token = refreshToken,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(Convert.ToDouble(_configuration["Jwt:RefreshTokenExpiresInDays"])),
                IsRevoked = false
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiresInMinutes"])),
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    Username = user.Username
                }
            };
        }

        //lam moi token
        public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
        {
            var token = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

            if (token == null || token.IsRevoked || token.ExpiresAt < DateTime.UtcNow)
            {
                throw new Exception("Invalid or expired refresh token");
            }

            // Revoke old token
            token.IsRevoked = true;

            // Generate new tokens
            var accessToken = _tokenService.GenerateAccessToken(token.User);
            var newRefreshToken = _tokenService.GenerateRefreshToken();

            var newRefreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                Token = newRefreshToken,
                UserId = token.UserId,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(Convert.ToDouble(_configuration["Jwt:RefreshTokenExpiresInDays"])),
                IsRevoked = false
            };

            _context.RefreshTokens.Add(newRefreshTokenEntity);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiresInMinutes"])),
                User = new UserInfo
                {
                    Id = token.User.Id,
                    Email = token.User.Email,
                    Username = token.User.Username
                }
            };
        }

        //validate token
        public async Task<bool> ValidateTokenAsync(string token)
        {
            var userId = _tokenService.ValidateAccessToken(token);

            if (userId == null)
            {
                return false;
            }

            var user = await _context.Users.FindAsync(userId);
            return user != null && user.IsActive;
        }

        //huy token
        public async Task RevokeTokenAsync(string refreshToken)
        {
            var token = await _context.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == refreshToken);

            if (token != null)
            {
                token.IsRevoked = true;
                await _context.SaveChangesAsync();
            }
        }

        public async Task DeleteAccountAsync(Guid userId, string password)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new Exception("User not found");
            }

            if (string.IsNullOrWhiteSpace(password) ||
                !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                throw new Exception("Invalid password");
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
        }

        // ─── Email Verification ─────────────────────────────────────────────────

        public async Task SendVerificationEmailAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
                throw new Exception("Email not found");

            // Rate-limit: minimum 60s between sends
            if (user.LastOtpSentAt.HasValue &&
                DateTime.UtcNow - user.LastOtpSentAt.Value < TimeSpan.FromSeconds(60))
            {
                var remaining = 60 - (int)(DateTime.UtcNow - user.LastOtpSentAt.Value).TotalSeconds;
                throw new Exception($"Please wait {remaining} seconds before requesting a new code.");
            }

            var otp = new Random().Next(100000, 999999).ToString();
            user.OtpCode = otp; // store as plain text so Verify() can compare directly
            user.OtpExpiry = DateTime.UtcNow.AddMinutes(5);
            user.LastOtpSentAt = DateTime.UtcNow;
            user.OtpResendCount += 1;

            await _context.SaveChangesAsync();

            var subject = "Your UITVibes verification code";
            var body = $@"<!DOCTYPE html>
<html>
<body style='font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;'>
  <div style='text-align: center;'>
    <h1 style='color: #D97757; font-size: 28px; margin-bottom: 8px;'>UITVibes</h1>
    <p style='color: #4A5568; font-size: 15px;'>Your verification code:</p>
    <div style='background: #F9F8F6; border: 2px dashed #D97757; border-radius: 12px;
                padding: 24px; margin: 24px 0; display: inline-block;'>
      <span style='font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #2D3748;'>
        {otp}
      </span>
    </div>
    <p style='color: #718096; font-size: 13px;'>
      This code expires in <strong>5 minutes</strong>.<br/>
      If you did not request this, please ignore this email.
    </p>
  </div>
</body>
</html>";

            await _emailService.SendEmailAsync(email, subject, body);
        }

        public async Task VerifyEmailAsync(string email, string otp)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
                throw new Exception("Email not found");

            if (string.IsNullOrWhiteSpace(user.OtpCode))
                throw new Exception("No verification code has been sent. Please request a new one.");

            if (user.OtpExpiry < DateTime.UtcNow)
                throw new Exception("Verification code has expired. Please request a new one.");

            if (!string.Equals(otp.Trim(), user.OtpCode.Trim(), StringComparison.Ordinal))
                throw new Exception("Invalid verification code. Please try again.");

            user.IsVerified = true;
            user.OtpCode = null;
            user.OtpExpiry = null;

            await _context.SaveChangesAsync();
        }

        public async Task ResendOtpAsync(string email)
        {
            await SendVerificationEmailAsync(email);
        }

        /// <summary>
        /// Verifies OTP then immediately generates and returns auth tokens.
        /// Used by the Login → Verify flow so the frontend gets tokens without a second login call.
        /// </summary>
        public async Task<AuthResponse> VerifyEmailAndLoginAsync(string email, string otp)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
                throw new Exception("Email not found");

            if (string.IsNullOrWhiteSpace(user.OtpCode))
                throw new Exception("No verification code has been sent. Please request a new one.");

            if (user.OtpExpiry < DateTime.UtcNow)
                throw new Exception("Verification code has expired. Please request a new one.");

            if (!string.Equals(otp.Trim(), user.OtpCode.Trim(), StringComparison.Ordinal))
                throw new Exception("Invalid verification code. Please try again.");

            user.IsVerified = true;
            user.OtpCode = null;
            user.OtpExpiry = null;

            // Generate tokens for the now-verified user
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            var refreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                Token = refreshToken,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(Convert.ToDouble(_configuration["Jwt:RefreshTokenExpiresInDays"])),
                IsRevoked = false
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiresInMinutes"])),
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    Username = user.Username
                }
            };
        }

    }
}
