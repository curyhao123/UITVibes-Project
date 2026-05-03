using AuthService.DTOs;
using AuthService.Messaging;
using AuthService.Models;
using AuthService.ServiceLayer.Interface;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

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
            IEmailService emailService)  // 👈 Add this
        {
            _context = context;
            _tokenService = tokenService;
            _configuration = configuration;
            _messagePublisher = messagePublisher;  // 👈 Add this
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

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
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
                    Username = user.Username,
                    IsVerified = user.IsVerified ? "True" : "False"
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



        private static string GenerateOtpCode()
        {
            return RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
        }


        // Hàm private dùng chung — chỉ lo việc tạo và lưu OTP
        private async Task<User> GenerateAndSaveOtpAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) throw new Exception("User not found");

            if (user.LastOtpSentAt.HasValue &&
                DateTime.UtcNow - user.LastOtpSentAt.Value < TimeSpan.FromMinutes(1))
            {
                throw new Exception("Vui lòng chờ 1 phút trước khi gửi lại OTP");
            }

            var otp = GenerateOtpCode();
            user.OtpCode = BCrypt.Net.BCrypt.HashPassword(otp);
            user.OtpExpiry = DateTime.UtcNow.AddMinutes(5);
            user.LastOtpSentAt = DateTime.UtcNow;

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

            return user;
        }

        // Hàm private dùng chung — chỉ lo việc check OTP có hợp lệ không
        private async Task<User> ValidateOtpAsync(string email, string inputOtp)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) throw new Exception("User not found");

            if (user.OtpCode == null || user.OtpExpiry == null)
                throw new Exception("Bạn chưa yêu cầu gửi OTP");

            if (DateTime.UtcNow > user.OtpExpiry)
                throw new Exception("Mã OTP đã hết hạn");

            if (!BCrypt.Net.BCrypt.Verify(inputOtp, user.OtpCode))
                throw new Exception("Mã OTP không đúng");

            // Xóa OTP sau khi validate xong
            user.OtpCode = null;
            user.OtpExpiry = null;
            user.LastOtpSentAt = null;

            return user;
        }

        // Xác thực tài khoản — require JWT
        public async Task SendOtpAsync(string email)
        {
            await GenerateAndSaveOtpAsync(email);
        }

        public async Task VerifyOtpAsync(string email, string inputOtp)
        {
            var user = await ValidateOtpAsync(email, inputOtp);
            user.IsVerified = true;         // 👈 logic riêng
            await _context.SaveChangesAsync();
        }

        // Forgot password — không cần JWT
        public async Task SendForgotPasswordOtpAsync(string email)
        {
            await GenerateAndSaveOtpAsync(email);  // tái sử dụng
        }

        public async Task VerifyForgotPasswordOtpAsync(string email, string inputOtp, string newPassword)
        {
            var user = await ValidateOtpAsync(email, inputOtp);  // tái sử dụng
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);  // 👈 logic riêng
            await _context.SaveChangesAsync();
        }

    }
}
