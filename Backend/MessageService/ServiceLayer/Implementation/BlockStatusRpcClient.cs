using MessageService.DTOs;
using MessageService.ServiceLayer.Interface;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace MessageService.ServiceLayer.Implementation
{
    public class BlockStatusRpcClient : IBlockStatusRpcClient
    {
        private const string QueueName = "user.block.status.get";
        private readonly IConnection _connection;
        private readonly ILogger<BlockStatusRpcClient> _logger;

        public BlockStatusRpcClient(
            IConnection connection,
            ILogger<BlockStatusRpcClient> logger)
        {
            _connection = connection;
            _logger = logger;
        }

        public async Task<BlockStatusRpcResponse?> GetBlockStatusAsync(
            Guid currentUserId,
            Guid otherUserId,
            CancellationToken cancellationToken = default)
        {
            await using var channel = await _connection.CreateChannelAsync(
                cancellationToken: cancellationToken);

            var replyQueue = await channel.QueueDeclareAsync(
                queue: string.Empty,
                durable: false,
                exclusive: true,
                autoDelete: true,
                arguments: null,
                cancellationToken: cancellationToken);

            var correlationId = Guid.NewGuid().ToString();
            var tcs = new TaskCompletionSource<BlockStatusRpcResponse?>(
                TaskCreationOptions.RunContinuationsAsynchronously);

            var consumer = new AsyncEventingBasicConsumer(channel);
            consumer.ReceivedAsync += async (_, ea) =>
            {
                if (ea.BasicProperties?.CorrelationId == correlationId)
                {
                    var payload = Encoding.UTF8.GetString(ea.Body.ToArray());
                    var response = JsonSerializer.Deserialize<BlockStatusRpcResponse>(payload);
                    tcs.TrySetResult(response);
                }

                await Task.CompletedTask;
            };

            await channel.BasicConsumeAsync(
                queue: replyQueue.QueueName,
                autoAck: true,
                consumer: consumer,
                cancellationToken: cancellationToken);

            var request = new BlockStatusRpcRequest
            {
                CurrentUserId = currentUserId,
                OtherUserId = otherUserId
            };

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(request));
            var properties = new BasicProperties
            {
                CorrelationId = correlationId,
                ReplyTo = replyQueue.QueueName
            };

            await channel.BasicPublishAsync(
                exchange: string.Empty,
                routingKey: QueueName,
                mandatory: false,
                basicProperties: properties,
                body: body,
                cancellationToken: cancellationToken);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(5));
            using var registration = cts.Token.Register(() => tcs.TrySetCanceled());

            try
            {
                return await tcs.Task;
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning(
                    "Block status RPC timeout for users {CurrentUserId} and {OtherUserId}",
                    currentUserId,
                    otherUserId);
                return null;
            }
        }
    }
}
