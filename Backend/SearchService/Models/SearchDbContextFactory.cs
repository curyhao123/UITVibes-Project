using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SearchService.Models;

/// <summary>Chỉ dùng cho `dotnet ef`; runtime lấy connection string từ Aspire.</summary>
public class SearchDbContextFactory : IDesignTimeDbContextFactory<SearchDbContext>
{
    public SearchDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("SEARCHDESIGN_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=searchdb;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<SearchDbContext>()
            .UseNpgsql(connectionString, o => o.UseVector())
            .Options;

        return new SearchDbContext(options);
    }
}
