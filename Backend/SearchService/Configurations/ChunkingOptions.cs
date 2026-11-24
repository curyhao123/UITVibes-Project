using System.ComponentModel.DataAnnotations;

namespace SearchService.Configurations;

// Đếm theo ký tự thay vì token: ~4 ký tự/token, nên 1600 ≈ 400 token và 200 ≈ 50 token.
public class ChunkingOptions
{
    public const string SectionName = "Chunking";

    [Range(200, 8000)]
    public int MaxChunkChars { get; set; } = 1600;

    [Range(0, 2000)]
    public int OverlapChars { get; set; } = 200;
}
