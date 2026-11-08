using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OpenTelemetry.Metrics;
using PostService.Configurations;
using PostService.Messaging;
using PostService.Messaging.Implementation;
using PostService.Messaging.Interface;
using PostService.Models;
using PostService.ServiceLayer.Implementation;
using PostService.ServiceLayer.Interface;
using PostService.Workers;
using System.Text.Json.Serialization;

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
builder.Services.AddScoped<IPostService, PostService.ServiceLayer.Implementation.PostService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<IBookmarkService, BookmarkService>();
builder.Services.AddScoped<IHashtagService, HashtagService>();
builder.Services.AddScoped<IStoryService, StoryService>();
builder.Services.AddScoped<IUserProfileRpcClient, UserProfileRpcClient>();
builder.Services.AddScoped<IUserFollowRpcClient, UserFollowRpcClient>();
builder.Services.AddScoped<IPostCommentedPublisher, PostCommentedPublisher>();
builder.Services.AddScoped<IPostLikedPublisher, PostLikedPublisher>();
builder.Services.AddScoped<IRepostService, RepostService>();
builder.Services.AddScoped<IPostMentionedPublisher, PostMentionedPublisher>();
builder.Services.AddScoped<ICommentMentionedPublisher, CommentMentionedPublisher>();
builder.Services.AddScoped<IContentModeratedPublisher, ContentModeratedPublisher>();
builder.Services.AddScoped<IContentModerationNotifier, ContentModerationNotifier>();
builder.Services.AddScoped<IHighlightService, HighlightService>();
builder.Services.AddScoped<IReelService, ReelService>();
builder.Services.AddHostedService<PostCountRpcConsumer>();
builder.Services.AddHostedService<PostModerationWorker>();
builder.Services.AddOptions<ModerationOptions>()
    .Bind(builder.Configuration.GetSection(ModerationOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Lớp rule tiền xử lý — chặn tất định trước khi gọi LLM.
builder.Services.AddOptions<ModerationRuleOptions>()
    .Bind(builder.Configuration.GetSection(ModerationRuleOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// A/B routing — chạy nhiều model/prompt song song để đo độ chính xác (3.3).
builder.Services.AddOptions<ModerationRoutingOptions>()
    .Bind(builder.Configuration.GetSection(ModerationRoutingOptions.SectionName));

// Shadow mode — chạy model "bóng" chỉ để ghi log, không áp dụng (3.3).
builder.Services.AddOptions<ModerationShadowOptions>()
    .Bind(builder.Configuration.GetSection(ModerationShadowOptions.SectionName));

builder.Services.AddSingleton<IModerationResponseParser, ModerationResponseParser>();
builder.Services.AddSingleton<IModerationPromptBuilder, ModerationPromptBuilder>();
builder.Services.AddScoped<IModerationDecisionEvaluator, ModerationDecisionEvaluator>();
builder.Services.AddScoped<IModerationRuleFilter, ModerationRuleFilter>();
builder.Services.AddScoped<ILlmModerationService, LlmModerationService>();
builder.Services.AddSingleton<IModerationMetrics, ModerationMetrics>();
// OpenTelemetry thu thập metric của moderation qua meter này (3.4).
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics => metrics.AddMeter(IModerationMetrics.MeterName));
builder.Services.AddScoped<IModerationAdminService, ModerationAdminService>();
builder.Services.AddScoped<IModerationAppealService, ModerationAppealService>();
builder.Services.AddScoped<IModerationDecisionLogger, ModerationDecisionLogger>();
builder.Services.AddScoped<IModerationStrikeService, ModerationStrikeService>();
builder.Services.AddScoped<IUserBannedPublisher, UserBannedPublisher>();
// Cấu hình strike + tự động khoá tài khoản (3.5).
builder.Services.AddOptions<ModerationStrikeOptions>()
    .Bind(builder.Configuration.GetSection(ModerationStrikeOptions.SectionName));
builder.Services.AddScoped<IModerationEnqueuer, ModerationEnqueuer>();
// Liên kết report ↔ hàng đợi kiểm duyệt (3.6).
builder.Services.AddOptions<ModerationReportOptions>()
    .Bind(builder.Configuration.GetSection(ModerationReportOptions.SectionName));
builder.Services.AddScoped<IModerationReportService, ModerationReportService>();
builder.Services.AddScoped<IModerationTargetAccessor, ModerationTargetAccessor>();
// OCR — trích text từ ảnh để đưa vào pipeline kiểm duyệt text (3.0).
builder.Services.AddOptions<ModerationOcrOptions>()
    .Bind(builder.Configuration.GetSection(ModerationOcrOptions.SectionName));
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<IOcrService, OcrService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});
// Xác thực danh tính admin từ JWT (fallback sang header gateway khi chưa cấu hình Jwt:Key).
builder.Services.AddScoped<IAdminIdentityResolver, AdminIdentityResolver>();
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName));
// DeepSeek API config
builder.Services.AddOptions<DeepSeekOptions>()
    .Bind(builder.Configuration.GetSection(DeepSeekOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Named HttpClient cho DeepSeek — base address + timeout được set ở đây;
// AddStandardResilienceHandler bổ sung retry + circuit breaker tự động cho lỗi transient.
builder.Services.AddHttpClient(LlmModerationService.HttpClientName, (sp, client) =>
    {
        var opts = sp.GetRequiredService<IOptions<DeepSeekOptions>>().Value;
        client.BaseAddress = new Uri(opts.BaseUrl);
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {opts.ApiKey}");
        client.Timeout = TimeSpan.FromSeconds(opts.TimeoutSeconds);
    })
    .AddStandardResilienceHandler();

// Configure JSON to handle enums as numbers (not strings)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
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

// Cho phép upload form-data lớn (100MB)
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104_857_600; // 100MB
    options.ValueLengthLimit = int.MaxValue;
    options.MemoryBufferThreshold = int.MaxValue;
});

// Cho phép request lớn ở mức Kestrel
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 104_857_600; // 100MB
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

app.MapControllers();

app.Run();
