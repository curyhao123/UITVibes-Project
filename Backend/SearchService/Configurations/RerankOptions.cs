using System.ComponentModel.DataAnnotations;

namespace SearchService.Configurations;

public class RerankOptions
{
    public const string SectionName = "Rerank";

    [Required(AllowEmptyStrings = false)]
    public string BaseUrl { get; set; } = "http://tei-rerank";

    public string Model { get; set; } = "BAAI/bge-reranker-v2-m3";

    [Range(1, 256)]
    public int MaxTexts { get; set; } = 50;

    [Range(1, 300)]
    public int TimeoutSeconds { get; set; } = 30;
}
