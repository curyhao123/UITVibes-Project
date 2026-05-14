using RabbitMQ.Client;
using System.Text;
using System.Text.Json;
using UserService.DTOs;
using UserService.Messaging.Interface;

namespace UserService.Messaging.Implementation
{
    public class UserFollowPublisher : IUserFollowPublisher
    {
        private const string QueueName = "user.followed";
        private readonly IConnectionFactory _connectionFactory;
        private readonly ILogger<UserFollowPublisher> _logger;
        public UserFollowPublisher(
           IConnectionFactory connectionFactory,
           ILogger<UserFollowPublisher> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task PublishAsync(UserFollowedEvent evt, CancellationToken ct = default)
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
                _logger.LogError(ex, "Failed to publish UserFollowed event for follower {FollowerId} and followee {FolloweeId}", evt.FollowerId, evt.FolloweeId);
                throw;
            }
        }
    }
}
