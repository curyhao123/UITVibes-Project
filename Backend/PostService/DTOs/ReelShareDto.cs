namespace PostService.DTOs
{
    public class ReelShareDto
    {
        public Guid Id { get; set; }
        public Guid ReelId { get; set; }
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
