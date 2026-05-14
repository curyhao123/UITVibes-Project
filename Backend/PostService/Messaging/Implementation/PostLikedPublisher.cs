using PostService.DTOs;
using PostService.Messaging.Interface;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace PostService.Messaging.Implementation
{
    public class PostLikedPublisher: IPostLikedPublisher
    {
        private const string QueueName = "post.liked";
        private readonly IConnectionFactory _connectionFactory;
        private readonly ILogger<PostLikedPublisher> _logger;
        public PostLikedPublisher(
           IConnectionFactory connectionFactory,
           ILogger<PostLikedPublisher> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task PublishAsync(PostLikedEvent evt, CancellationToken ct = default)
        {
            try
            {
                var connection = await _connectionFactory.CreateConnectionAsync(ct);
                var channel = await connection.CreateChannelAsync(cancellationToken: ct);

                await channel.QueueDeclareAsync(
                    queue: QueueName,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null,
                    cancellationToken: ct);

                var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(evt));

                await channel.BasicPublishAsync(
                    exchange: string.Empty,
                    routingKey: QueueName,
                    body: body,
                    cancellationToken: ct);

                await channel.CloseAsync(ct);
                await connection.CloseAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish PostLiked event for post {PostId}", evt.PostId);
                throw;
            }
        }
    }
}
