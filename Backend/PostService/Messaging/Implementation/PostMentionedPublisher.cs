using PostService.DTOs;
using PostService.Messaging.Interface;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace PostService.Messaging.Implementation
{
    public class PostMentionedPublisher : IPostMentionedPublisher
    {
        private const string QueueName = "post.mentioned";
        private readonly IConnectionFactory _connectionFactory;
        private readonly ILogger<PostMentionedPublisher> _logger;
        public PostMentionedPublisher(
           IConnectionFactory connectionFactory,
           ILogger<PostMentionedPublisher> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task PublishAsync(PostMentionedEvent evt, CancellationToken ct = default)
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
                _logger.LogError(ex, "Failed to publish PostMentioned event for post {PostId}", evt.PostId);
                throw;
            }
        }
    }
}
