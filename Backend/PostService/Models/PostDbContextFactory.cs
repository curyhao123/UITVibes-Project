using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PostService.Models;

/// <summary>
/// Design-time factory chỉ dùng cho `dotnet ef migrations ...`.
/// Runtime thực sự dùng connection string do Aspire inject qua AddNpgsqlDbContext.
/// </summary>
public class PostDbContextFactory : IDesignTimeDbContextFactory<PostDbContext>
{
    public PostDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("POSTDESIGN_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=postdb;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new PostDbContext(options);
    }
}
