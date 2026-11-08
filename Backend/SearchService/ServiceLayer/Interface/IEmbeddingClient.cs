namespace SearchService.ServiceLayer.Interface;

/// <summary>Embed văn bản bằng bge-m3 (1024 chiều).</summary>
public interface IEmbeddingClient
{
    int Dimensions { get; }

    /// <summary>Giữ thứ tự đầu vào, tự chia batch theo MaxBatchSize.</summary>
    Task<IReadOnlyList<float[]>> EmbedAsync(IReadOnlyList<string> texts, CancellationToken ct = default);

    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);
}
