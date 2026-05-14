using PostService.DTOs;

namespace PostService.Messaging.Interface
{
    public interface IPostLikedPublisher
    {
        Task PublishAsync(PostLikedEvent evt, CancellationToken ct = default);

    }
}
