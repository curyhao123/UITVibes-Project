using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SearchService.Configurations;
using SearchService.Models;
using SearchService.ServiceLayer.Implementation;
using SearchService.ServiceLayer.Interface;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// ===== Database (Postgres + pgvector) =====
builder.AddNpgsqlDbContext<SearchDbContext>("searchdb",
    configureDbContextOptions: options => options.UseNpgsql(npgsql => npgsql.UseVector()));

// ===== Embedding (TEI + BAAI/bge-m3) =====
builder.Services.AddOptions<EmbeddingOptions>()
    .Bind(builder.Configuration.GetSection(EmbeddingOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddHttpClient(TeiEmbeddingClient.HttpClientName, (sp, client) =>
{
    var opts = sp.GetRequiredService<IOptions<EmbeddingOptions>>().Value;
    client.BaseAddress = new Uri(opts.BaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(opts.TimeoutSeconds);
});
builder.Services.AddScoped<IEmbeddingClient, TeiEmbeddingClient>();

// ===== Rerank (TEI + BAAI/bge-reranker-v2-m3) =====
builder.Services.AddOptions<RerankOptions>()
    .Bind(builder.Configuration.GetSection(RerankOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddHttpClient(TeiRerankClient.HttpClientName, (sp, client) =>
{
    var opts = sp.GetRequiredService<IOptions<RerankOptions>>().Value;
    client.BaseAddress = new Uri(opts.BaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(opts.TimeoutSeconds);
});
builder.Services.AddScoped<IRerankClient, TeiRerankClient>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Search Service API",
        Version = "v1",
        Description = "Semantic search and RAG over UITVibes posts"
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<SearchDbContext>();
        var pending = (await context.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count > 0)
        {
            logger.LogInformation("Applying {Count} migrations for SearchService: {Migrations}",
                pending.Count, string.Join(", ", pending));
            await context.Database.MigrateAsync();
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating the SearchService database.");
        throw;
    }
}

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();

app.MapControllers();

app.Run();
