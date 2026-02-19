using AuthService.Models;

namespace AuthService.ServiceLayer.Interface
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);
        string GenerateRefreshToken();
        Guid? ValidateAccessToken(string token);
    }
}
