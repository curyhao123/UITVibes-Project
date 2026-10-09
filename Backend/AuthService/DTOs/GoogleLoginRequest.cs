namespace AuthService.DTOs
{
    /// <summary>
    /// Request body for POST /api/googleauth/login.
    /// Frontend (Expo app) obtains id_token from Google via expo-auth-session,
    /// then sends it to backend for verification + account provisioning.
    /// </summary>
    public class GoogleLoginRequest
    {
        /// <summary>Google ID token (JWT) from the native/Web Google Sign-In flow.</summary>
        public string IdToken { get; set; } = string.Empty;

        /// <summary>Client platform that initiated the sign-in — used for audience (aud) validation.</summary>
        /// <remarks>"web" | "ios" | "android"</remarks>
        public string Platform { get; set; } = "web";
    }
}
