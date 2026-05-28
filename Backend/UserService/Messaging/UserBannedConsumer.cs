using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using Microsoft.EntityFrameworkCore;
using UserService.Models;

namespace UserService.Messaging;

public class UserBannedEvent
{
    public Guid UserId { get; set; }
    public bool IsBanned { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UserBannedConsumer : BackgroundService
{
    private readonly ILogger<UserBannedConsumer> _logger;
    private readonly IServiceProvider _serviceProvider;
    private IConnection? _connection;
    private IChannel? _channel;
    private const string QueueName = "user.banned";

    public UserBannedConsumer(
        ILogger<UserBannedConsumer> logger,
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
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null,
            cancellationToken: stoppingToken);

        _logger.LogInformation("Waiting for UserBanned messages from queue: {QueueName}", QueueName);

        var consumer = new AsyncEventingBasicConsumer(_channel);

        consumer.ReceivedAsync += async (model, ea) =>
        {
            try
            {
                var body = ea.Body.ToArray();
                var message = Encoding.UTF8.GetString(body);
                var userBannedEvent = JsonSerializer.Deserialize<UserBannedEvent>(message);

                if (userBannedEvent != null)
                {
                    _logger.LogInformation("Received UserBanned event for user {UserId}, IsBanned: {IsBanned}",
                        userBannedEvent.UserId, userBannedEvent.IsBanned);

                    using var serviceScope = _serviceProvider.CreateScope();
                    var dbContext = serviceScope.ServiceProvider.GetRequiredService<UserDbContext>();

                    var profile = await dbContext.UserProfiles
                        .FirstOrDefaultAsync(p => p.UserId == userBannedEvent.UserId, stoppingToken);

                    if (profile != null)
                    {
                        profile.UpdatedAt = DateTime.UtcNow;
                        await dbContext.SaveChangesAsync(stoppingToken);
                        _logger.LogInformation("Updated profile IsBanned status for user {UserId}", userBannedEvent.UserId);
                    }
                    else
                    {
                        _logger.LogWarning("Profile not found for user {UserId}", userBannedEvent.UserId);
                    }

                    await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing UserBanned event");
                await _channel.BasicNackAsync(ea.DeliveryTag, false, true, stoppingToken);
            }
        };

        await _channel.BasicConsumeAsync(
            queue: QueueName,
            autoAck: false,
            consumer: consumer,
            cancellationToken: stoppingToken);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Stopping UserBannedConsumer");

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
}
