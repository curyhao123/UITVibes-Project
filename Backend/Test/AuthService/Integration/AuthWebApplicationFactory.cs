using AuthService.Messaging;
using AuthService.Models;
using AuthService.ServiceLayer.Interface;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using System.Data.Common;

namespace Test.AuthService.Integration;

public class AuthWebApplicationFactory : WebApplicationFactory<Program>
{
    private DbConnection? _connection;

    public Mock<IMessagePublisher> MessagePublisherMock { get; } = new();
    public Mock<IEmailService> EmailServiceMock { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "SuperSecretIntegrationTestingJwtKey1234567890_UITVibes!",
                ["Jwt:Issuer"] = "UITVibes.AuthService",
                ["Jwt:Audience"] = "UITVibes.Client",
                ["Jwt:ExpiresInMinutes"] = "60",
                ["Jwt:RefreshTokenExpiresInDays"] = "7",
                ["ConnectionStrings:authdb"] = "Host=localhost;Database=testdb",
                ["ConnectionStrings:cache"] = "localhost:6379",
                ["ConnectionStrings:messaging"] = "amqp://guest:guest@localhost:5672"
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext registrations
            services.RemoveAll<DbContextOptions<AuthDbContext>>();
            services.RemoveAll<AuthDbContext>();

            // Create and open SQLite in-memory connection
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            services.AddDbContext<AuthDbContext>(options =>
            {
                options.UseSqlite(_connection);
            });

            // Replace external messaging & email dependencies with mocks
            services.RemoveAll<IMessagePublisher>();
            services.RemoveAll<IEmailService>();

            services.AddScoped<IMessagePublisher>(_ => MessagePublisherMock.Object);
            services.AddScoped<IEmailService>(_ => EmailServiceMock.Object);
        });
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
        await context.Database.EnsureDeletedAsync();
        await context.Database.EnsureCreatedAsync();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection?.Dispose();
    }
}
