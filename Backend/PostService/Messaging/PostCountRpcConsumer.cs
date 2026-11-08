using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Models;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using PostService.Enums;

namespace PostService.Messaging;

public class PostCountRpcConsumer : BackgroundService
{
    private const string QueueName = "post.count.get";

    /// <summary>
    /// Khoảng nghỉ giữa các lần thử kết nối lại khi RabbitMQ chưa sẵn sàng.
    /// </summary>
    private static readonly TimeSpan ReconnectDelay = TimeSpan.FromSeconds(5);

    private readonly ILogger<PostCountRpcConsumer> _logger;
    private readonly IServiceProvider _serviceProvider;
    private IConnection? _connection;
    private IChannel? _channel;

    public PostCountRpcConsumer(
        ILogger<PostCountRpcConsumer> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Vòng lặp reconnect: nếu RabbitMQ chưa sẵn sàng (hoặc tạm thời gián đoạn),
        // ta chờ rồi thử lại thay vì ném exception ra ngoài.
        //
        // Lý do: exception không xử lý trong một BackgroundService sẽ làm
        // HostOptions.BackgroundServiceExceptionBehavior (mặc định = StopHost) dừng
        // cả ứng dụng. Với Aspire, điều đó biến thành vòng lặp
        // "crash → restart → crash" khiến resource liên tục báo Finished.
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ConsumeAsync(stoppingToken);
                return; // Chỉ thoát khi bị yêu cầu dừng.
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to consume queue '{Queue}'. Retrying in {Delay}s.",
                    QueueName, ReconnectDelay.TotalSeconds);

                await CleanupChannelAsync();

                try
                {
                    await Task.Delay(ReconnectDelay, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        _logger.LogInformation("PostCountRpcConsumer stopped.");
    }

    private async Task ConsumeAsync(CancellationToken stoppingToken)
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
            var response = new PostCountRpcResponse { Found = false };

            try
            {
                var payload = Encoding.UTF8.GetString(ea.Body.ToArray());
                var request = JsonSerializer.Deserialize<PostCountRpcRequest>(payload);

                if (request != null)
                {
                    using var serviceScope = _serviceProvider.CreateScope();
                    var dbContext = serviceScope.ServiceProvider.GetRequiredService<PostDbContext>();

                    var count = await dbContext.Posts.CountAsync(
                        p => p.UserId == request.UserId
                             && !p.IsDeleted
                             && p.PostType == PostType.Original
                             && p.Visibility != PostVisibility.Hidden
                             && p.ModerationStatus == ModerationStatus.Approved,
                        stoppingToken);

                    response = new PostCountRpcResponse
                    {
                        UserId = request.UserId,
                        PostsCount = count,
                        Found = true
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing PostCount RPC request");
            }

            var replyTo = ea.BasicProperties?.ReplyTo;
            if (!string.IsNullOrEmpty(replyTo))
            {
                var replyProps = new BasicProperties
                {
                    CorrelationId = ea.BasicProperties?.CorrelationId
                };

                var replyBody = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(response));
                await _channel.BasicPublishAsync(
                    exchange: string.Empty,
                    routingKey: replyTo,
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

        _logger.LogInformation("PostCountRpcConsumer started on queue '{Queue}'", QueueName);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task CleanupChannelAsync()
    {
        try
        {
            if (_channel != null)
            {
                await _channel.CloseAsync();
                await _channel.DisposeAsync();
            }

            if (_connection != null)
            {
                await _connection.CloseAsync();
                await _connection.DisposeAsync();
            }
        }
        catch (Exception ex)
        {
            // Dọn dẹp là best-effort — không được để lỗi ở đây chặn vòng reconnect.
            _logger.LogWarning(ex, "Error while cleaning up RabbitMQ connection for queue '{Queue}'.", QueueName);
        }
        finally
        {
            _channel = null;
            _connection = null;
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await CleanupChannelAsync();

        await base.StopAsync(cancellationToken);
    }

    public override void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
        base.Dispose();
    }
}
