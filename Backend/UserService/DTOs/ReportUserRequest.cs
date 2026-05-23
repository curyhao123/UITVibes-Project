namespace UserService.DTOs
{
    public class ReportUserRequest
    {
        public Guid TargetUserId { get; set; }
        public string Reason { get; set; } = null!;
        public string? AdditionalDetails { get; set; }
    }
}
