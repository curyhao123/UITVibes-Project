namespace MessageService.DTOs
{
    public class ReadReceiptDto
    {
        public Guid UserId { get; set; }
        public DateTime ReadAt { get; set; }
    }
}
