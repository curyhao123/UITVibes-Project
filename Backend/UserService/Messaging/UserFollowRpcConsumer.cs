using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using UserService.Models;
using Microsoft.EntityFrameworkCore;

namespace UserService.Messaging;

/// <summary>
/// Listens on the "user.follow.get" queue and responds with the list of user IDs
/// that the given user follows. This allows PostService to filter feed/stories
/// based on the user's follow relationships without needing direct DB access.
/// </summary>
public class UserFollowRpcConsumer : BackgroundService
{
    private const string QueueName = "user.follow.get";
    private readonly ILogger<UserFollowRpcConsumer> _logger;
    private readonly IServiceProvider _serviceProvider;
    private IConnection? _connection;
    private IChannel? _channel;

    public UserFollowRpcConsumer(
        ILogger<UserFollowRpcConsumer> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var connectionFactory = scope.ServiceProvider.GetRequiredService<IConnectionFactory>();

        _connection = await connectionFactory.CreateConnectionAsync(stoppingToken);
        _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);

        await _channel.QueueDeclareAsync(
            queue: QueueName,
            durable: false,
            exclusive: false,
            autoDelete: false,
            arguments: null,
            cancellationToken: stoppingToken);

        await _channel.BasicQosAsync(0, 1, false, stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += async (_, ea) =>
        {
            List<Guid> followingIds = new();

            try
            {
                var payload = Encoding.UTF8.GetString(ea.Body.ToArray());
                var request = JsonSerializer.Deserialize<UserFollowRpcRequest>(payload);

                if (request != null)
                {
                    using var serviceScope = _serviceProvider.CreateScope();
                    var dbContext = serviceScope.ServiceProvider.GetRequiredService<UserDbContext>();

                    followingIds = await dbContext.Follows
                        .Where(f => f.FollowerId == request.UserId)
                        .Select(f => f.FollowingId)
                        .ToListAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing UserFollow RPC request");
            }

            if (!string.IsNullOrEmpty(ea.BasicProperties?.ReplyTo))
            {
                var replyProps = new BasicProperties
                {
                    CorrelationId = ea.BasicProperties?.CorrelationId
                };

                var replyBody = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(followingIds));
                await _channel.BasicPublishAsync(
                    exchange: string.Empty,
                    routingKey: ea.BasicProperties.ReplyTo,
                    mandatory: false,
                    basicProperties: replyProps,
                    body: replyBody,
                    cancellationToken: stoppingToken);
            }

            await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
        };

        await _channel.BasicConsumeAsync(
            queue: QueueName,
            autoAck: false,
            consumer: consumer,
            cancellationToken: stoppingToken);

        _logger.LogInformation("UserFollowRpcConsumer started on queue '{Queue}'", QueueName);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_channel != null)
        {
            await _channel.CloseAsync(cancellationToken);
            await _channel.DisposeAsync();
        }

        if (_connection != null)
        {
            await _connection.CloseAsync(cancellationToken);
            await _connection.DisposeAsync();
        }

        await base.StopAsync(cancellationToken);
    }

    public override void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
        base.Dispose();
    }

    private class UserFollowRpcRequest
    {
        public Guid UserId { get; set; }
    }
}
