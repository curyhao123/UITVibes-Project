using Microsoft.EntityFrameworkCore;
using PostService.Models;
using PostService.ServiceLayer.Implementation;
using PostService.ServiceLayer.Interface;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
// Add PostgreSQL DbContext
builder.AddNpgsqlDbContext<PostDbContext>("postdb");
// Add Redis
builder.AddRedisClient("cache");

// Add RabbitMQ
builder.AddRabbitMQClient("messaging");
// Add services to the container.
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped < IPostService, PostService.ServiceLayer.Implementation.PostService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Post Service API",
        Version = "v1",
        Description = "Post, comment, like, and feed management service"
    });
});

var app = builder.Build();

// Run migrations
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();

    try
    {
        var context = services.GetRequiredService<PostDbContext>();
        logger.LogInformation("Starting database migration for PostService...");

        var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
        if (pendingMigrations.Any())
        {
            logger.LogInformation("Found {Count} pending migrations: {Migrations}",
                pendingMigrations.Count(),
                string.Join(", ", pendingMigrations));

            await context.Database.MigrateAsync();
            logger.LogInformation("Database migrations applied successfully.");
        }
        else
        {
            logger.LogInformation("No pending migrations found. Database is up to date.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating the database.");
        throw;
    }
}

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapControllers();

app.Run();
