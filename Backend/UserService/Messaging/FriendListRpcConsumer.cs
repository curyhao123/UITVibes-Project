using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using UserService.DTOs;
using UserService.ServiceLayer.Interface;

namespace UserService.Messaging;

public class FriendListRpcConsumer : BackgroundService
{
    private const string QueueName = "friend.get";
    private readonly ILogger<FriendListRpcConsumer> _logger;
    private readonly IServiceProvider _serviceProvider;
    private IConnection? _connection;
    private IChannel? _channel;

    public FriendListRpcConsumer(
        ILogger<FriendListRpcConsumer> logger,
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
            var response = new FriendListRpcResponse();

            try
            {
                var payload = Encoding.UTF8.GetString(ea.Body.ToArray());
                var request = JsonSerializer.Deserialize<FriendListRpcRequest>(payload);

                if (request != null)
                {
                    using var serviceScope = _serviceProvider.CreateScope();
                    var followService = serviceScope.ServiceProvider.GetRequiredService<IFollowService>();

                    response.Friends = await followService.GetFriendListsAsync(request.UserId, request.Skip, request.Take);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing FriendList RPC request");
            }

            if (!string.IsNullOrEmpty(ea.BasicProperties?.ReplyTo))
            {
                var replyProps = new BasicProperties
                {
                    CorrelationId = ea.BasicProperties?.CorrelationId
                };

                var replyBody = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(response));
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
}
