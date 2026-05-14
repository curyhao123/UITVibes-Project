using NotificationService.DTOs;
using NotificationService.ServiceLayer.Interface;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace NotificationService.Messaging
{
    public class PostLikedConsumer : BackgroundService
    {
        private const string QueueName = "post.liked";
        private readonly ILogger<PostLikedConsumer> _logger;
        private readonly IServiceProvider _serviceProvider;
        private IConnection? _connection;
        private IChannel? _channel;

        public PostLikedConsumer(
            ILogger<PostLikedConsumer> logger,
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

            _logger.LogInformation("Waiting for PostLiked messages from queue: {QueueName}", QueueName);

            var consumer = new AsyncEventingBasicConsumer(_channel);
            consumer.ReceivedAsync += async (_, ea) =>
            {
                try
                {
                    var body = ea.Body.ToArray();
                    var message = Encoding.UTF8.GetString(body);
                    var evt = JsonSerializer.Deserialize<PostLikedEvent>(message);

                    if (evt != null)
                    {
                        using var serviceScope = _serviceProvider.CreateScope();
                        var notificationService = serviceScope.ServiceProvider.GetRequiredService<INotificationService>();

                        await notificationService.CreateAsync(
                            new NotificationInput(
                                evt.PostOwnerId,
                                evt.LikerId,
                                evt.PostId,
                                NotificationType.PostLiked,
                                evt.LikerName),
                            stoppingToken);

                        await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing PostLiked event");
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
}
