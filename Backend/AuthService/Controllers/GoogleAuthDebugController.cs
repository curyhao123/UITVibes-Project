using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers
{
    /// <summary>
    /// Debug endpoint to help diagnose Google OAuth configuration issues.
    /// GET /api/googleauth/debug → shows what redirect URIs are valid for the Web Client.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class GoogleAuthDebugController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public GoogleAuthDebugController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet("debug")]
        public IActionResult Debug()
        {
            return Ok(new
            {
                webClientId = _configuration["GoogleAuth:WebClientId"],
                iosClientId = _configuration["GoogleAuth:iOSClientId"],
                androidClientId = _configuration["GoogleAuth:AndroidClientId"],
                hasClientSecret = !string.IsNullOrEmpty(_configuration["GoogleAuth:ClientSecret"]),
                // The URIs that the app will try to use.
                // Make sure these are added in Google Cloud Console!
                expectedRedirectUris = new[]
                {
                    "https://auth.expo.io/@anonymous/uitvibes",
                    "https://auth.expo.io/@anonymous/uitvibes/",
                    "uitvibes://",
                    "http://localhost:8081",
                    "http://localhost:19006"
                },
                // Step-by-step instructions
                instructions = new[]
                {
                    "1. Open https://console.cloud.google.com",
                    "2. Select your UITVibes project",
                    "3. APIs & Services → Credentials",
                    "4. Find the OAuth 2.0 Client ID: REDACTED-OLD-WEB-CLIENT-ID",
                    "5. Click on it to edit",
                    "6. Scroll to 'Authorized redirect URIs'",
                    "7. Click '+ ADD URI' for each of the expectedRedirectUris above",
                    "8. Click SAVE",
                    "9. Wait 2-5 minutes for Google to propagate the change"
                }
            });
        }
    }
}
