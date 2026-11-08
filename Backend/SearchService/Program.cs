using Microsoft.Extensions.Options;
using SearchService.Configurations;
using SearchService.ServiceLayer.Implementation;
using SearchService.ServiceLayer.Interface;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

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

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();

app.MapControllers();

app.Run();
