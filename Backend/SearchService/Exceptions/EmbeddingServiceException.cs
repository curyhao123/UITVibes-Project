namespace SearchService.Exceptions;

/// <summary>Lỗi gọi TEI; tầng trên bắt để fallback (vd. chỉ tìm full-text).</summary>
public class EmbeddingServiceException : Exception
{
    public EmbeddingServiceException(string message) : base(message) { }

    public EmbeddingServiceException(string message, Exception innerException)
        : base(message, innerException) { }
}
