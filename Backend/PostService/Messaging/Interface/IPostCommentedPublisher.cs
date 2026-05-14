using PostService.DTOs;

namespace PostService.Messaging.Interface
{
    public interface IPostCommentedPublisher
    {
        Task PublishAsync(PostCommentedEvent evt, CancellationToken ct = default);

    }
}