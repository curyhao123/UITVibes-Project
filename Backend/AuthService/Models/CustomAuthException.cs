namespace AuthService.Models
{
    public class CustomAuthException : Exception
    {
        public string ErrorCode { get; }
        public string? Email { get; }

        public CustomAuthException(string errorCode, string message, string? email = null)
            : base(message)
        {
            ErrorCode = errorCode;
            Email = email;
        }
    }
}
