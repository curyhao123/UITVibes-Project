var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("cache");

// Add PostgreSQL for data persistence
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithDataVolume("postgres_data");

var authDb = postgres.AddDatabase("authdb");
var userDb = postgres.AddDatabase("userdb");
var postDb = postgres.AddDatabase("postdb");
var messageDb = postgres.AddDatabase("messagedb");
var notificationDb = postgres.AddDatabase("notificationdb");

// Add RabbitMQ for inter-service messaging
var messaging = builder.AddRabbitMQ("messaging");

// Google OAuth credentials for AuthService
var googleWebClientId = builder.AddParameter("google-webclientid");
var googleIosClientId = builder.AddParameter("google-iosclientid");
var googleClientSecret = builder.AddParameter("google-clientsecret", secret: true);

// ===== CENTRALIZED SECRETS =====
// Define secrets once, use everywhere
var jwtKey = builder.AddParameter("jwt-key", secret: true);
var cloudinaryCloudName = builder.AddParameter("cloudinary-cloudname");
var cloudinaryApiKey = builder.AddParameter("cloudinary-apikey", secret: true);
var cloudinaryApiSecret = builder.AddParameter("cloudinary-apisecret", secret: true);
var smtpServer = builder.AddParameter("smtp-server");
var smtpPort = builder.AddParameter("smtp-port");
var smtpUsername = builder.AddParameter("smtp-username");
var smtpPassword = builder.AddParameter("smtp-password", secret: true);
var smtpSenderEmail = builder.AddParameter("smtp-senderemail");
var smtpSenderName = builder.AddParameter("smtp-sendername");
var deepSeekApiKey = builder.AddParameter("deepseek-apikey", secret: true);



// Auth Service - shares JWT key
var authService = builder.AddProject<Projects.AuthService>("authservice")
    .WithExternalHttpEndpoints()
    .WithReference(authDb)
    .WaitFor(authDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithEnvironment("Jwt__Key", jwtKey)
    .WithEnvironment("GoogleAuth__WebClientId", googleWebClientId)
    .WithEnvironment("GoogleAuth__iOSClientId", googleIosClientId)
    .WithEnvironment("GoogleAuth__ClientSecret", googleClientSecret)
    .WithEnvironment("SmtpSettings__Server", smtpServer)
    .WithEnvironment("SmtpSettings__Port", smtpPort)
    .WithEnvironment("SmtpSettings__Username", smtpUsername)
    .WithEnvironment("SmtpSettings__Password", smtpPassword)
    .WithEnvironment("SmtpSettings__SenderEmail", smtpSenderEmail)
    .WithEnvironment("SmtpSettings__SenderName", smtpSenderName)
    .WithHttpHealthCheck("/health");

var userService = builder.AddProject<Projects.UserService>("userservice")
    .WithExternalHttpEndpoints()
    .WithReference(userDb)
    .WaitFor(userDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithEnvironment("Cloudinary__CloudName", cloudinaryCloudName)
    .WithEnvironment("Cloudinary__ApiKey", cloudinaryApiKey)
    .WithEnvironment("Cloudinary__ApiSecret", cloudinaryApiSecret)
    .WithHttpHealthCheck("/health");


var postService = builder.AddProject<Projects.PostService>("postservice")
    .WithExternalHttpEndpoints()
    .WithReference(postDb)
    .WaitFor(postDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithEnvironment("Cloudinary__CloudName", cloudinaryCloudName)
    .WithEnvironment("Cloudinary__ApiKey", cloudinaryApiKey)
    .WithEnvironment("Cloudinary__ApiSecret", cloudinaryApiSecret)
    .WithEnvironment("DeepSeek__ApiKey", deepSeekApiKey)
    .WithEnvironment("Jwt__Key", jwtKey)
    .WithHttpHealthCheck("/health");



var messageService = builder.AddProject<Projects.MessageService>("messageservice")
    .WithExternalHttpEndpoints()
    .WithReference(messageDb)
    .WaitFor(messageDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithHttpHealthCheck("/health");




var notificationService = builder.AddProject<Projects.NotificationService>("notificationservice")
    .WithExternalHttpEndpoints()
    .WithReference(notificationDb)
    .WaitFor(notificationDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithHttpHealthCheck("/health");


// ===== SEARCH / RAG =====
// TEI tải model (~2.2 GB) vào volume ở lần chạy đầu; image cpu-* không cần GPU.
// max-batch-tokens mặc định 16384 làm warmup trên CPU tốn ~16 GB RAM (bị OOM); auto-truncate bắt buộc khi nó < 8192.
string[] teiArgs = ["--max-batch-tokens", "4096", "--max-client-batch-size", "32", "--auto-truncate"];
const string teiImage = "ghcr.io/huggingface/text-embeddings-inference";
const string teiTag = "cpu-1.8";

var teiEmbed = builder.AddContainer("tei-embed", teiImage, teiTag)
    .WithArgs(["--model-id", "BAAI/bge-m3", .. teiArgs])
    .WithVolume("tei-embed-data", "/data")
    .WithHttpEndpoint(targetPort: 80, name: "http")
    .WithHttpHealthCheck("/health");

var teiRerank = builder.AddContainer("tei-rerank", teiImage, teiTag)
    .WithArgs(["--model-id", "BAAI/bge-reranker-v2-m3", .. teiArgs])
    .WithVolume("tei-rerank-data", "/data")
    .WithHttpEndpoint(targetPort: 80, name: "http")
    .WithHttpHealthCheck("/health");

// SearchService gọi TEI qua service discovery: "http://tei-embed", "http://tei-rerank".
var searchService = builder.AddProject<Projects.SearchService>("searchservice")
    .WithExternalHttpEndpoints()
    .WithReference(teiEmbed.GetEndpoint("http"))
    .WaitFor(teiEmbed)
    .WithReference(teiRerank.GetEndpoint("http"))
    .WaitFor(teiRerank)
    .WithHttpHealthCheck("/health");


// ===== API GATEWAY WITH JWT =====
var apiService = builder.AddProject<Projects.UITVibes_Microservices_ApiService>("apiservice")
    // Pin the gateway to 5512 so frontend EXPO_PUBLIC_API_URL stays stable
    // across restarts. We use a unique endpoint name ("gateway") to avoid
    // collision with the default 'http' endpoint Aspire creates for the
    // project automatically.
    .WithHttpEndpoint(port: 5512, name: "gateway")
    .WithHttpHealthCheck("/health")
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(authService)
    .WaitFor(authService)
    .WithReference(userService)
    .WaitFor(userService)
    .WithReference(postService)
    .WaitFor(postService)
    .WithReference(messageService)
    .WaitFor(messageService)
    .WithReference(notificationService)
    .WaitFor(notificationService)
    .WithEnvironment("Jwt__Key", jwtKey);



builder.Build().Run();
