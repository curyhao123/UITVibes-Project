using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using UserService.DTOs;
using UserService.ServiceLayer.Interface;

namespace UserService.Messaging;

public class UserCreatedConsumer : BackgroundService
{
    private readonly ILogger<UserCreatedConsumer> _logger;
    private readonly IServiceProvider _serviceProvider; //IServiceProvider: để tạo scope và truy cập vào UserProfileService.
    private IConnection? _connection; //RabbitMQ Connection + Channel: kết nối và đọc message.
    private IChannel? _channel;
    private const string QueueName = "user.created"; //QueueName: tên queue RabbitMQ cần consume.

    public UserCreatedConsumer(
        ILogger<UserCreatedConsumer> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Get RabbitMQ connection from DI
        using var scope = _serviceProvider.CreateScope();
        var connectionFactory = scope.ServiceProvider.GetRequiredService<IConnectionFactory>();
        
        _connection = await connectionFactory.CreateConnectionAsync(stoppingToken);
        _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);

        // Declare queue
        await _channel.QueueDeclareAsync(
            queue: QueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null,
            cancellationToken: stoppingToken);

        _logger.LogInformation("Waiting for UserCreated messages from queue: {QueueName}", QueueName);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        
        consumer.ReceivedAsync += async (model, ea) =>
        {
            try
            {
                var body = ea.Body.ToArray();
                var message = Encoding.UTF8.GetString(body);
                var userCreatedEvent = JsonSerializer.Deserialize<UserCreatedEvent>(message);

                if (userCreatedEvent != null)
                {
                    _logger.LogInformation("Received UserCreated event for user {UserId}", userCreatedEvent.UserId);
                    
                    using var serviceScope = _serviceProvider.CreateScope();
                    var userProfileService = serviceScope.ServiceProvider.GetRequiredService<IUserProfileService>();
                    
                    await userProfileService.CreateProfileAsync(userCreatedEvent.UserId, userCreatedEvent.Username);
                    
                    await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
                    _logger.LogInformation("Successfully created profile for user {UserId}", userCreatedEvent.UserId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing UserCreated event");
                await _channel.BasicNackAsync(ea.DeliveryTag, false, true, stoppingToken);
            }
        };

        await _channel.BasicConsumeAsync(
            queue: QueueName,
            autoAck: false,
            consumer: consumer,
            cancellationToken: stoppingToken);

        // Keep the service running
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Stopping UserCreatedConsumer");
        
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