using PostService.DTOs;

namespace PostService.Messaging.Interface
{
    public interface ICommentMentionedPublisher
    {
        Task PublishAsync(CommentMentionedEvent evt, CancellationToken ct = default);
    }
}
