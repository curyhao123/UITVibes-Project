using System.ComponentModel.DataAnnotations;

namespace SearchService.Configurations;

public class EmbeddingOptions
{
    public const string SectionName = "Embedding";

    [Required(AllowEmptyStrings = false)]
    public string BaseUrl { get; set; } = "http://tei-embed";

    public string Model { get; set; } = "BAAI/bge-m3";

    [Range(1, 8192)]
    public int Dimensions { get; set; } = 1024;

    [Range(1, 256)]
    public int MaxBatchSize { get; set; } = 32;

    public bool Normalize { get; set; } = true;

    [Range(1, 300)]
    public int TimeoutSeconds { get; set; } = 30;
}
