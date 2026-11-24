using Microsoft.Extensions.Options;
using SearchService.Configurations;
using SearchService.ServiceLayer.Implementation;

namespace Test.SearchService;

public class ChunkerTests
{
    private static Chunker Create(int max = 100, int overlap = 30) =>
        new(Options.Create(new ChunkingOptions { MaxChunkChars = max, OverlapChars = overlap }));

    [Theory]
    [InlineData("")]
    [InlineData("   \n\t ")]
    public void Chunk_EmptyText_ReturnsNoChunks(string text)
    {
        Assert.Empty(Create().Chunk(text, ["thi"]));
    }

    [Fact]
    public void Chunk_ShortText_ReturnsSingleNormalizedChunk()
    {
        var chunks = Create().Chunk("  Lịch   thi\tcuối kỳ  ", []);

        Assert.Equal(["Lịch thi cuối kỳ"], chunks);
    }

    [Fact]
    public void Chunk_PrefixesDistinctHashtags()
    {
        var chunks = Create().Chunk("Lịch thi cuối kỳ.", ["#UIT", "thi", "uit", " "]);

        Assert.Equal("#UIT #thi\nLịch thi cuối kỳ.", Assert.Single(chunks));
    }

    [Fact]
    public void Chunk_LongText_SplitsOnSentencesWithinLimit_AndOverlaps()
    {
        var sentences = Enumerable.Range(1, 8).Select(i => $"Câu số {i} nói về lịch thi.").ToList();

        var chunks = Create(max: 80, overlap: 30).Chunk(string.Join(" ", sentences), []);

        Assert.True(chunks.Count > 1);
        Assert.All(chunks, c => Assert.True(c.Length <= 80, $"chunk too long: {c.Length}"));
        Assert.All(chunks, c => Assert.EndsWith(".", c));
        for (var i = 1; i < chunks.Count; i++)
        {
            var lastSentenceOfPrevious = sentences.Last(s => chunks[i - 1].Contains(s));
            Assert.StartsWith(lastSentenceOfPrevious, chunks[i]);
        }
        Assert.All(sentences, s => Assert.Contains(chunks, c => c.Contains(s)));
    }

    [Fact]
    public void Chunk_SplitsOnNewlines()
    {
        var chunks = Create(max: 20, overlap: 0).Chunk("dòng một khá dài\ndòng hai khá dài", []);

        Assert.Equal(["dòng một khá dài", "dòng hai khá dài"], chunks);
    }

    [Fact]
    public void Chunk_SentenceLongerThanLimit_IsHardSplitWithinLimit()
    {
        var text = string.Join(" ", Enumerable.Repeat("abcdefghij", 30)) + " " + new string('x', 250);

        var chunks = Create(max: 100, overlap: 0).Chunk(text, []);

        Assert.All(chunks, c => Assert.True(c.Length <= 100));
        Assert.Equal(text.Replace(" ", ""), string.Concat(chunks).Replace(" ", ""));
    }
}
