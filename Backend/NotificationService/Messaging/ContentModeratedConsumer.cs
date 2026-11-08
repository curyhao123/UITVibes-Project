using NotificationService.DTOs;
using NotificationService.Enums;
using NotificationService.ServiceLayer.Interface;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace NotificationService.Messaging
{
    /// <summary>
    /// Nhận sự kiện kiểm duyệt nội dung từ PostService và tạo thông báo cho tác giả.
    ///
    /// Queue: "content.moderated"
    /// </summary>
    public class ContentModeratedConsumer : BackgroundService
    {
        private const string QueueName = "content.moderated";

        private readonly ILogger<ContentModeratedConsumer> _logger;
        private readonly IServiceProvider _serviceProvider;
        private IConnection? _connection;
        private IChannel? _channel;

        public ContentModeratedConsumer(
            ILogger<ContentModeratedConsumer> logger,
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

            _logger.LogInformation("Waiting for ContentModerated messages from queue: {QueueName}", QueueName);

            var consumer = new AsyncEventingBasicConsumer(_channel);
            consumer.ReceivedAsync += async (_, ea) =>
            {
                try
                {
                    var body = ea.Body.ToArray();
                    var message = Encoding.UTF8.GetString(body);
                    var evt = JsonSerializer.Deserialize<ContentModeratedEvent>(message);

                    if (evt != null)
                    {
                        using var serviceScope = _serviceProvider.CreateScope();
                        var notificationService = serviceScope.ServiceProvider.GetRequiredService<INotificationService>();

                        var notificationType = MapEventType(evt.EventType);
                        if (notificationType == null)
                        {
                            // Event type không hợp lệ → ack để không lặp vô hạn.
                            _logger.LogWarning(
                                "Unknown ContentModerated event type {EventType}. Skipping.", evt.EventType);
                            await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
                            return;
                        }

                        await notificationService.CreateAsync(
                            new NotificationInput(
                                evt.UserId,
                                // Tác giả là người nhận; actor cũng là tác giả vì
                                // không có "người thực hiện" riêng (AI/admin).
                                evt.UserId,
                                evt.TargetId,
                                notificationType.Value,
                                // "actorName" ở đây là tên loại nội dung ("post"/"comment"/"reel")
                                evt.TargetType,
                                evt.Reason),
                            stoppingToken);

                        await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing ContentModerated event");
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

        /// <summary>
        /// Chuyển tên sự kiện (string) sang NotificationType.
        /// </summary>
        private static NotificationType? MapEventType(string? eventType) => eventType switch
        {
            "ContentRejected" => NotificationType.ContentRejected,
            "ContentNeedsReview" => NotificationType.ContentNeedsReview,
            "AppealResolved" => NotificationType.AppealResolved,
            _ => null
        };

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
