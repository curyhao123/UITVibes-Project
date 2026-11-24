namespace SearchService.ServiceLayer.Interface;

public interface IChunker
{
    /// <summary>Chia theo câu, mỗi đoạn có tiền tố hashtag; văn bản rỗng trả về danh sách rỗng.</summary>
    IReadOnlyList<string> Chunk(string text, IReadOnlyCollection<string> hashtags);
}
