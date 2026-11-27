using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace AuthService.Messaging;

public class RabbitMQPublisher : IMessagePublisher
{
    private readonly IConnectionFactory _connectionFactory;
    private readonly ILogger<RabbitMQPublisher> _logger;
    private const string QueueNameUserCreated = "user.created";

    // Mỗi service dùng một queue riêng cho cùng một event. Nếu cùng consume
    // một queue, RabbitMQ sẽ chia message ngẫu nhiên (competing consumers) →
    // AuthService có thể không bao giờ nhận được event ban.
    private const string QueueNameUserBanned = "user.banned";
    private const string QueueNameUserBannedAuth = "user.banned.auth";

    // Tất cả queue mà event "user.banned" cần tới.
    private static readonly string[] UserBannedQueues =
        { QueueNameUserBanned, QueueNameUserBannedAuth };

    public RabbitMQPublisher(
        IConnectionFactory connectionFactory,
        ILogger<RabbitMQPublisher> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task PublishUserCreatedAsync(Guid userId, string email, string username)
    {
        try
        {
            var connection = await _connectionFactory.CreateConnectionAsync();
            var channel = await connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(
                queue: QueueNameUserCreated,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            var message = new
            {
                UserId = userId,
                Email = email,
                Username = username,
                CreatedAt = DateTime.UtcNow
            };

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));

            await channel.BasicPublishAsync(
                exchange: string.Empty,
                routingKey: QueueNameUserCreated,
                body: body);

            _logger.LogInformation("Published UserCreated event for user {UserId}", userId);

            await channel.CloseAsync();
            await connection.CloseAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish UserCreated event for user {UserId}", userId);
            throw;
        }
    }

    public async Task PublishUserBannedAsync(Guid userId, bool isBanned)
    {
        try
        {
            var connection = await _connectionFactory.CreateConnectionAsync();
            var channel = await connection.CreateChannelAsync();

            foreach (var queue in UserBannedQueues)
            {
                await channel.QueueDeclareAsync(
                    queue: queue,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null);
            }

            var message = new
            {
                UserId = userId,
                IsBanned = isBanned,
                UpdatedAt = DateTime.UtcNow
            };

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));

            foreach (var queue in UserBannedQueues)
            {
                await channel.BasicPublishAsync(
                    exchange: string.Empty,
                    routingKey: queue,
                    body: body);
            }

            _logger.LogInformation("Published UserBanned event for user {UserId}, IsBanned: {IsBanned}", userId, isBanned);

            await channel.CloseAsync();
            await connection.CloseAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish UserBanned event for user {UserId}", userId);
            throw;
        }
    }
}