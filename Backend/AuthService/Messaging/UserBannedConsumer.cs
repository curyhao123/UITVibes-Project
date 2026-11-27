using System.Text;
using System.Text.Json;
using AuthService.Models;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace AuthService.Messaging;

/// <summary>
/// Consumer của queue "user.banned".
///
/// Queue này được publish từ 2 nguồn:
///   - AuthService (BanUserAsync / UnbanUserAsync) — admin bấm tay trong trang Users.
///   - PostService (ModerationStrikeService) — tài khoản vượt ngưỡng strike.
///
/// Trước đây AuthService chỉ publish mà không consume, nên pipeline kiểm duyệt
/// không bao giờ khoá được tài khoản. Consumer này đóng lại chuỗi đó.
/// </summary>
public class UserBannedConsumer : BackgroundService
{
    /// Queue riêng cho AuthService — không dùng chung "user.banned" với UserService
    /// (RabbitMQ chia message ngẫu nhiên khi nhiều consumer cùng đọc một queue).
    private const string QueueName = "user.banned.auth";

    private readonly ILogger<UserBannedConsumer> _logger;
    private readonly IServiceProvider _serviceProvider;
    private IConnection? _connection;
    private IChannel? _channel;

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
                var evt = JsonSerializer.Deserialize<UserBannedEvent>(message);

                if (evt is null)
                {
                    _logger.LogWarning("Received malformed UserBanned event.");
                    await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
                    return;
                }

                using var serviceScope = _serviceProvider.CreateScope();
                var dbContext = serviceScope.ServiceProvider.GetRequiredService<AuthDbContext>();

                var user = await dbContext.Users
                    .FirstOrDefaultAsync(u => u.Id == evt.UserId, stoppingToken);

                if (user is null)
                {
                    _logger.LogWarning("User {UserId} not found for UserBanned event.", evt.UserId);
                }
                else if (user.IsBanned != evt.IsBanned)
                {
                    user.IsBanned = evt.IsBanned;
                    user.UpdatedAt = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync(stoppingToken);

                    _logger.LogInformation(
                        "Set IsBanned={IsBanned} for user {UserId} from UserBanned event.",
                        evt.IsBanned, evt.UserId);
                }
                else
                {
                    _logger.LogInformation(
                        "User {UserId} already has IsBanned={IsBanned}; nothing to change.",
                        evt.UserId, evt.IsBanned);
                }

                await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
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

/// <summary>
/// Payload của queue "user.banned".
/// Định dạng phải khớp với <c>PostService.DTOs.UserBannedEvent</c>.
/// </summary>
public class UserBannedEvent
{
    public Guid UserId { get; set; }
    public bool IsBanned { get; set; }
    public string? Reason { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
