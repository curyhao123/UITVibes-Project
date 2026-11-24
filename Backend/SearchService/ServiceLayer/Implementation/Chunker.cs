using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using SearchService.Configurations;
using SearchService.ServiceLayer.Interface;

namespace SearchService.ServiceLayer.Implementation;

public partial class Chunker : IChunker
{
    private readonly ChunkingOptions _options;

    public Chunker(IOptions<ChunkingOptions> options)
    {
        _options = options.Value;
    }

    public IReadOnlyList<string> Chunk(string text, IReadOnlyCollection<string> hashtags)
    {
        var sentences = SplitSentences(text);
        if (sentences.Count == 0) return [];

        var prefix = BuildPrefix(hashtags);
        return Pack(sentences).Select(c => prefix + c).ToList();
    }

    private List<string> SplitSentences(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return [];

        var result = new List<string>();
        foreach (var raw in SentenceBoundary().Split(text))
        {
            var sentence = Whitespace().Replace(raw, " ").Trim();
            if (sentence.Length == 0) continue;

            if (sentence.Length <= _options.MaxChunkChars) result.Add(sentence);
            else result.AddRange(SplitLongSentence(sentence));
        }
        return result;
    }

    private IEnumerable<string> Pack(List<string> sentences)
    {
        var current = new List<string>();
        var length = 0;

        foreach (var sentence in sentences)
        {
            var added = length == 0 ? sentence.Length : length + 1 + sentence.Length;
            if (added > _options.MaxChunkChars && current.Count > 0)
            {
                yield return string.Join(' ', current);
                current = TakeOverlap(current, sentence.Length);
                length = current.Count == 0 ? 0 : current.Sum(s => s.Length) + current.Count - 1;
            }

            current.Add(sentence);
            length = length == 0 ? sentence.Length : length + 1 + sentence.Length;
        }

        if (current.Count > 0) yield return string.Join(' ', current);
    }

    // Lấy các câu cuối của đoạn trước làm phần chồng lấn, miễn là đoạn mới vẫn không vượt giới hạn.
    private List<string> TakeOverlap(List<string> previous, int nextLength)
    {
        var overlap = new List<string>();
        var length = 0;
        for (var i = previous.Count - 1; i >= 0; i--)
        {
            var candidate = length + previous[i].Length + 1;
            if (candidate > _options.OverlapChars || candidate + nextLength > _options.MaxChunkChars) break;
            overlap.Insert(0, previous[i]);
            length = candidate;
        }
        return overlap;
    }

    private IEnumerable<string> SplitLongSentence(string sentence)
    {
        var words = sentence.Split(' ');
        var builder = new StringBuilder();
        foreach (var word in words)
        {
            // Từ dài hơn giới hạn (vd. URL) bị cắt cứng.
            for (var start = 0; start < word.Length; start += _options.MaxChunkChars)
            {
                var piece = word.Substring(start, Math.Min(_options.MaxChunkChars, word.Length - start));
                if (builder.Length > 0 && builder.Length + 1 + piece.Length > _options.MaxChunkChars)
                {
                    yield return builder.ToString();
                    builder.Clear();
                }
                if (builder.Length > 0) builder.Append(' ');
                builder.Append(piece);
            }
        }
        if (builder.Length > 0) yield return builder.ToString();
    }

    private static string BuildPrefix(IReadOnlyCollection<string> hashtags)
    {
        var tags = hashtags
            .Select(h => h.Trim().TrimStart('#'))
            .Where(h => h.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(h => "#" + h)
            .ToList();
        return tags.Count == 0 ? string.Empty : string.Join(' ', tags) + "\n";
    }

    [GeneratedRegex(@"(?<=[.!?…])\s+|\r?\n+")]
    private static partial Regex SentenceBoundary();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();
}
