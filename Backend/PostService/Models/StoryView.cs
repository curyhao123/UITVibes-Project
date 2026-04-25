namespace PostService.Models
{
    public class StoryView
    {
        public Guid Id { get; set; }

        public Guid StoryItemId { get; set; }

        /// User đã xem
        public Guid UserId { get; set; }

        public DateTime ViewedAt { get; set; }

        /// Navigation
        public StoryItem StoryItem { get; set; } = null!;
    }

}
