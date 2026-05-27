using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace AuthService.Messaging;

public class RabbitMQPublisher : IMessagePublisher
{
    private readonly IConnectionFactory _connectionFactory;
    private readonly ILogger<RabbitMQPublisher> _logger;
    private const string QueueNameUserCreated = "user.created";
    private const string QueueNameUserBanned = "user.banned";

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

            await channel.QueueDeclareAsync(
                queue: QueueNameUserBanned,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            var message = new
            {
                UserId = userId,
                IsBanned = isBanned,
                UpdatedAt = DateTime.UtcNow
            };

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));

            await channel.BasicPublishAsync(
                exchange: string.Empty,
                routingKey: QueueNameUserBanned,
                body: body);

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