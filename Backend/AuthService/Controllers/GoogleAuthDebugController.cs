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
                // Make sure these are added in Google Cloud Console under
                // the Web OAuth Client → "Authorized redirect URIs".
                //
                // NOTE: "UITVibes" is the Expo slug from app.json — case-sensitive.
                expectedRedirectUris = new[]
                {
                    "https://auth.expo.io/@anonymous/UITVibes",
                    "https://auth.expo.io/@anonymous/UITVibes/",

                    // Web: same-origin callback page. Google will redirect the
                    // browser here directly after consent. The exact origin
                    // (localhost:8081, your-prod.com, …) must also be added.
                    $"{GetOriginHint()}/auth/google-callback",
                },

                // Step-by-step instructions
                instructions = new[]
                {
                    "1. Open https://console.cloud.google.com",
                    "2. Select your UITVibes project",
                    "3. APIs & Services → Credentials",
                    $"4. Find the OAuth 2.0 Web Client ID: {_configuration["GoogleAuth:WebClientId"]}",
                    "5. Click on it to edit",
                    "6. Scroll to 'Authorized redirect URIs'",
                    "7. Click '+ ADD URI' for each of the expectedRedirectUris above",
                    "8. Click SAVE",
                    "9. Wait 2-5 minutes for Google to propagate the change"
                }
            });
        }

        private string GetOriginHint()
        {
            // Prefer the X-Forwarded-Origin header if YARP / the dev server
            // forwarded it; otherwise fall back to a generic hint so the
            // developer at least sees the callback path.
            var forwarded = Request?.Headers["X-Forwarded-Origin"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwarded)) return forwarded;
            return "https://your-production-domain.com";
        }
    }
}
