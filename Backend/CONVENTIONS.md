# UITVibes Backend — Code Conventions & Architecture Guide

> **Stack:** .NET 8 · ASP.NET Core Web API · Entity Framework Core · PostgreSQL · RabbitMQ · Redis · SignalR · .NET Aspire · Cloudinary · Firebase FCM

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Per-Service Internal Layout](#2-per-service-internal-layout)
3. [Naming Conventions](#3-naming-conventions)
4. [State Management](#4-state-management)
5. [Exception & Error Handling](#5-exception--error-handling)
6. [Messaging Patterns (RabbitMQ)](#6-messaging-patterns-rabbitmq)
7. [Real-Time Communication (SignalR)](#7-real-time-communication-signalr)
8. [Authentication & Identity](#8-authentication--identity)
9. [Technology Cheat-Sheet](#9-technology-cheat-sheet)

---

## 1. Project Structure

The backend is a **microservices monorepo** orchestrated via **.NET Aspire**.

```
Backend/
├── AuthService/                  # Authentication, JWT, OTP, user banning
├── UserService/                  # User profiles, follow/unfollow, block
├── PostService/                  # Posts, comments, likes, stories, reels, hashtags
├── MessageService/               # Real-time chat via SignalR, conversations
├── NotificationService/          # Push notifications (FCM), in-app notifications
│
├── UITVibes-Microservices.AppHost/      # .NET Aspire orchestration entry point
├── UITVibes-Microservices.ApiService/   # Shared API/gateway entry point
├── UITVibes-Microservices.ServiceDefaults/ # Shared defaults (logging, health checks, etc.)
│
├── DbSeeder/                     # SQL seed scripts per service
│   ├── AuthDbSeeder.sql
│   ├── UserDbSeeder.sql
│   ├── PostDbSeeder.sql
│   └── MessageDbSeeder.sql
│
├── Test/                         # Unit & integration tests
│   └── AuthService/
│       ├── Controller/
│       └── Integration/
│
└── docker-compose.yml            # Infrastructure: PostgreSQL, Redis, RabbitMQ
```

### Infrastructure (docker-compose)

| Service    | Image                    | Ports              |
|------------|--------------------------|--------------------|
| PostgreSQL | `postgres:16`            | `5432`             |
| Redis      | `redis:7`                | `6379`             |
| RabbitMQ   | `rabbitmq:3-management`  | `5672` / `15672`   |

---

## 2. Per-Service Internal Layout

Every microservice follows the **same folder structure**:

```
<ServiceName>/
├── Controllers/          # HTTP endpoints (thin layer, no business logic)
├── DTOs/                 # Data Transfer Objects (request/response shapes)
├── Models/               # EF Core entities + DbContext + Enums
├── ServiceLayer/
│   ├── Interface/        # Service interfaces (I<Name>Service.cs)
│   └── Implementation/   # Service implementations
├── Messaging/
│   ├── Interface/        # Publisher interfaces
│   ├── Implementation/   # Publisher implementations
│   └── *Consumer.cs      # RabbitMQ BackgroundService consumers (in root)
├── Migrations/           # EF Core migration files
├── Properties/
│   └── launchSettings.json
├── appsettings.json
├── appsettings.Development.json
├── Program.cs            # Startup / DI registration
└── Dockerfile
```

### Dependency Registration Pattern (Program.cs)

Services are registered as `Scoped` in `Program.cs`. Consumers are registered as `HostedService`:

```csharp
// Services
builder.Services.AddScoped<IAuthService, AuthService.ServiceLayer.Implementation.AuthService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IMessagePublisher, RabbitMQPublisher>();

// Infrastructure
builder.AddNpgsqlDbContext<AuthDbContext>("authdb");   // Aspire-managed connection
builder.AddRedisClient("cache");
builder.AddRabbitMQClient("messaging");

// Aspire shared defaults (telemetry, health checks, service discovery)
builder.AddServiceDefaults();
app.MapDefaultEndpoints();
```

> **Note:** EF Core migrations are **auto-applied at startup** via `context.Database.MigrateAsync()` inside a scoped block. Migration failures re-throw and crash startup intentionally.

---

## 3. Naming Conventions

### Files & Classes

| Artifact                  | Convention                             | Example                               |
|---------------------------|----------------------------------------|---------------------------------------|
| Controller                | `<Entity>Controller`                   | `UserProfileController`               |
| Service Interface         | `I<Entity>Service`                     | `IUserProfileService`                 |
| Service Implementation    | `<Entity>Service`                      | `UserProfileService`                  |
| Publisher Interface       | `I<Event>Publisher`                    | `IUserFollowPublisher`                |
| Publisher Implementation  | `<Event>Publisher`                     | `UserFollowPublisher`                 |
| RabbitMQ Consumer         | `<Event>Consumer`                      | `UserCreatedConsumer`                 |
| RPC Consumer              | `<Entity>RpcConsumer`                  | `UserProfileRpcConsumer`              |
| RPC Client                | `<Entity>RpcClient`                    | `PostCountRpcClient`                  |
| DbContext                 | `<Service>DbContext`                   | `AuthDbContext`, `UserDbContext`       |
| DTO (request)             | `<Action><Entity>Request`              | `CreateGroupConversationRequest`      |
| DTO (response)            | `<Entity>Dto` / `<Action>Response`     | `UserProfileDto`, `AuthResponse`      |
| Event DTO                 | `<Event>Event`                         | `UserCreatedEvent`, `UserFollowedEvent`|
| RPC DTO                   | `<Entity>RpcRequest/Response`          | `UserProfileRpcRequest`               |
| Migration                 | EF auto-generated timestamp prefix     | `20260211031057_InitialCreate`        |

### Methods

| Layer          | Convention                          | Example                                      |
|----------------|-------------------------------------|----------------------------------------------|
| Controller     | PascalCase, HTTP verb implied       | `Register`, `GetProfile`, `BanUser`          |
| Service        | `<Verb><Entity>Async`               | `RegisterAsync`, `GetProfileByUserIdAsync`   |
| Publisher      | `PublishAsync`                      | `PublishAsync(UserFollowedEvent evt)`        |
| Private helper | PascalCase                          | `GenerateOtpCode`, `ParseUserId`             |

### Members & Variables

| Context              | Convention              | Example                             |
|----------------------|-------------------------|-------------------------------------|
| Private fields       | `_camelCase`            | `_authService`, `_logger`           |
| Constants            | `PascalCase`            | `QueueName = "user.created"`        |
| Local variables      | `camelCase`             | `var accessToken`, `var userId`     |
| Properties (models)  | `PascalCase`            | `PasswordHash`, `CreatedAt`         |

### Routes

```
[Route("api/[controller]")]          // → /api/userprofile, /api/auth
[HttpGet("{userId}")]                // entity by ID
[HttpGet("me")]                      // current user shortcut
[HttpPut("me")]                      // update self
[HttpPost("me/avatar")]              // sub-resource action
[HttpPatch("reports/{id}/resolve")]  // state transitions via PATCH
```

---

## 4. State Management

### Entity State Flags (boolean fields on models)

| Model         | Field        | Default | Meaning                              |
|---------------|--------------|---------|--------------------------------------|
| `User`        | `IsActive`   | `true`  | Account is active                    |
| `User`        | `IsBanned`   | `false` | Account is banned by admin           |
| `User`        | `IsVerified` | `false` | Email OTP has been verified          |
| `UserProfile` | `IsBanned`   | `false` | Profile-level ban mirrored from Auth |
| `RefreshToken`| `IsRevoked`  | `false` | Token has been explicitly revoked    |

### Status Enums

Enums are defined **inside or alongside** their model file, using integer backing values with comments:

```csharp
// UserService/Models/UserReport.cs
public enum ReportStatus
{
    Pending   = 0,  // Chờ xử lý
    Resolved  = 1,  // Đã ghi nhận
    Dismissed = 2   // Bỏ qua
}

// PostService/Models/PostReport.cs
public enum ReportStatus
{
    Pending   = 0,  // Chờ xử lý
    Resolved  = 1,  // Đã xử lý (ẩn bài)
    Dismissed = 2   // Bỏ qua
}

// AuthService/Models/User.cs
public enum Role
{
    User  = 0,
    Admin = 1
}
```

> **Important:** `ReportStatus` is intentionally duplicated between `UserService` and `PostService` with the same integer values. Each service owns its own copy — do **not** share enums across service boundaries.

### HTTP Response Conventions

| Situation                          | HTTP Status Code     | Response Body                               |
|------------------------------------|----------------------|---------------------------------------------|
| Successful operation               | `200 OK`             | Typed DTO or `SuccessResponse { Message }`  |
| Resource not found                 | `404 Not Found`      | `{ message: "..." }` or `ErrorResponse`     |
| Validation failure / bad input     | `400 Bad Request`    | `ErrorResponse { ErrorCode, Message }`      |
| Unauthenticated (missing header)   | `401 Unauthorized`   | `ErrorResponse { ErrorCode, Message }`      |
| Insufficient permissions           | `403 Forbidden`      | `{ message: "Admin role required..." }`     |
| Unhandled server error             | `500 Internal Server Error` | `{ message: "An error occurred..." }` |

**Standard response DTOs:**

```csharp
// Success (AuthService)
public class SuccessResponse { public string Message { get; set; } = string.Empty; }

// Error (AuthService) — typed class with ErrorCode
public class ErrorResponse
{
    public string ErrorCode { get; set; }
    public string Message   { get; set; }
}

// Error (UserService/PostService) — anonymous object
return BadRequest(new { message = ex.Message });
return NotFound(new  { message = "Profile not found" });
```

> **Convention note:** `AuthService` uses the typed `ErrorResponse` class with an `ErrorCode` string. `UserService` / `PostService` use anonymous `{ message }` objects. Be consistent **within** a service.

### State Transition via PATCH

State-changing operations on existing resources use `PATCH` with descriptive action endpoints:

```
PATCH /api/userprofile/reports/{reportId}/resolve
PATCH /api/userprofile/reports/{reportId}/reject
```

### Counter Denormalization

Follow/follower counts are stored **directly on `UserProfile`** and updated at write time:

```csharp
followerProfile.FollowingCount++;
followingProfile.FollowersCount++;
followerProfile.UpdatedAt = DateTime.UtcNow;
followingProfile.UpdatedAt = DateTime.UtcNow;
await _context.SaveChangesAsync();
```

---

## 5. Exception & Error Handling

### Core Pattern: Service Throws, Controller Catches

Business logic **throws standard .NET exceptions**. Controllers **catch and translate** them to HTTP responses. No custom exception classes exist.

```
Service Layer  → throws Exception / KeyNotFoundException / InvalidOperationException / ArgumentException
Controller     → catches and maps to 400 / 404 / 500
```

### Exception-to-HTTP Mapping

| Exception Type              | Semantic meaning                                    | HTTP response      |
|-----------------------------|-----------------------------------------------------|--------------------|
| `Exception` (generic)       | Generic business rule violation                     | `400 Bad Request`  |
| `KeyNotFoundException`      | Entity not found (user, profile, report, etc.)      | `404 Not Found`    |
| `InvalidOperationException` | Invalid state (already following, duplicate, etc.)  | `400 Bad Request`  |
| `ArgumentException`         | Bad input value (invalid name, file, etc.)          | `400 Bad Request`  |

### Controller Error Handling Template

```csharp
[HttpPost("action")]
public async Task<IActionResult> DoSomething([FromBody] SomeRequest request)
{
    // 1. Identity check from Gateway header
    var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
    if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        return Unauthorized(new ErrorResponse { ErrorCode = "UNAUTHORIZED", Message = "..." });

    try
    {
        var result = await _service.DoSomethingAsync(userId, request);
        return Ok(result);
    }
    catch (KeyNotFoundException)
    {
        return NotFound(new { message = "Resource not found" });
    }
    catch (InvalidOperationException ex)
    {
        return BadRequest(new { message = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new { message = ex.Message });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error doing something for user {UserId}", userId);
        return StatusCode(500, new { message = "An error occurred while doing something" });
    }
}
```

### Ban Check Pattern (AuthService-specific)

A **prefixed exception message** signals banned-user status through the exception chain:

```csharp
// Service throws:
throw new Exception("IS_BANNED|User account is banned");

// Controller catches and inspects:
if (ex.Message.StartsWith("IS_BANNED|"))
{
    var banReason = ex.Message.Substring("IS_BANNED|".Length);
    return BadRequest(new ErrorResponse { ErrorCode = "IS_BANNED", Message = banReason });
}
```

> **Warning:** This pattern is a pragmatic workaround used only in `AuthService`. Do not extend it — prefer typed exceptions in new code.

### Messaging: Fire-and-Forget Error Handling

RabbitMQ publish failures are **non-fatal** — the main operation completes regardless:

```csharp
// Core operation saved to DB first
await _context.SaveChangesAsync();

// Publish event (best-effort)
try
{
    await _messagePublisher.PublishUserCreatedAsync(user.Id, user.Email, user.Username);
}
catch (Exception ex)
{
    Console.WriteLine($"Failed to publish UserCreated event: {ex.Message}");
    // Main operation still succeeds
}
```

### Consumer Error Handling (NACK on failure)

RabbitMQ consumers acknowledge success (`BasicAck`) and requeue on failure (`BasicNack`):

```csharp
consumer.ReceivedAsync += async (model, ea) =>
{
    try
    {
        // ... process message ...
        await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error processing event");
        await _channel.BasicNackAsync(ea.DeliveryTag, false, requeue: true, stoppingToken);
    }
};
```

### SignalR Error Handling

Hub method errors are caught and sent back to the **caller only** (not broadcast to the group):

```csharp
catch (Exception ex)
{
    _logger.LogError(ex, "Error sending message in conversation {ConversationId}", conversationId);
    await Clients.Caller.SendAsync("Error", ex.Message);
}
```

### Logging Conventions

```csharp
// Structured logging — prefer named placeholders
_logger.LogError(ex, "Error updating profile for user {UserId}", userId);
_logger.LogInformation("User {UserId} connected to ChatHub", userId);
_logger.LogWarning(ex, "Failed to fetch posts count for user {UserId}", userId);
```

> **Tip:** Replace `Console.WriteLine(...)` debug calls (found in AuthService publisher fallbacks) with `_logger.LogWarning(...)` for consistency.

---

## 6. Messaging Patterns (RabbitMQ)

### Two Patterns in Use

#### A) Fire-and-Forget Event Publishing

Used for cross-service notifications where eventual consistency is acceptable.

```
Publisher (Service) ──► Queue ──► Consumer (BackgroundService) ──► processes asynchronously
```

| Queue Name          | Published By    | Consumed By         | Trigger                     |
|---------------------|-----------------|---------------------|-----------------------------|
| `user.created`      | AuthService     | UserService         | User registers              |
| `user.banned`       | AuthService     | UserService         | Admin bans / unbans user    |
| `user.followed`     | UserService     | NotificationService | User follows another        |
| `post.liked`        | PostService     | NotificationService | Post receives a like        |
| `post.commented`    | PostService     | NotificationService | Post receives a comment     |
| `post.mentioned`    | PostService     | NotificationService | User mentioned in post      |
| `comment.mentioned` | PostService     | NotificationService | User mentioned in comment   |
| `message.sent`      | MessageService  | NotificationService | New chat message sent       |

**Publisher (scoped, short-lived connection):**
```csharp
public interface IUserFollowPublisher
{
    Task PublishAsync(UserFollowedEvent evt, CancellationToken ct = default);
}
```

**Consumer (BackgroundService, long-lived connection):**
```csharp
public class UserCreatedConsumer : BackgroundService
{
    private const string QueueName = "user.created";
    // Uses IServiceProvider.CreateScope() per message for scoped DI
}
```

> **Note:** Event queues are declared `durable: true` (survive restarts). RPC queues use `durable: false`.

#### B) RPC over RabbitMQ (Request-Reply)

Used for synchronous cross-service data reads where direct HTTP calls are avoided.

```
RPC Client ──► Request Queue ──► RPC Consumer ──► Reply Queue ──► RPC Client
```

| Queue Name              | Server (Consumer) | Client (Caller)  | Purpose                             |
|-------------------------|-------------------|------------------|-------------------------------------|
| `user.profile.get`      | UserService       | PostService      | Fetch user profile for post display |
| `user.follow.get`       | UserService       | PostService      | Check follow relationship           |
| `user.block.status`     | UserService       | MessageService   | Check block status for messaging    |
| `post.count.get`        | PostService       | UserService      | Get post count for profile stats    |
| `user.friendlist.get`   | UserService       | MessageService   | Get friend list for online tracking |

**RPC server replies using `ReplyTo` + `CorrelationId`:**
```csharp
await _channel.BasicPublishAsync(
    exchange: string.Empty,
    routingKey: ea.BasicProperties.ReplyTo,
    basicProperties: new BasicProperties { CorrelationId = ea.BasicProperties?.CorrelationId },
    body: replyBody);
```

---

## 7. Real-Time Communication (SignalR)

`MessageService` exposes a **`ChatHub`** for all real-time chat and presence functionality.

### Identity Extraction in Hub

User identity is parsed **once** on `OnConnectedAsync` and cached in `Context.Items` for the connection lifetime:

```csharp
// OnConnectedAsync — reads from HttpContext (available here only)
private Guid ParseUserId()
{
    // Priority 1: X-User-Id header (from Gateway)
    // Priority 2: userId query string (for direct testing)
    // Priority 3: access_token query string (JWT decode)
}

// All hub methods — reads from Context.Items (safe even after HttpContext is gone)
private Guid GetUserId()
{
    if (Context.Items.TryGetValue("UserId", out var value) && value is Guid userId)
        return userId;
    return Guid.Empty;  // guard: method returns early on empty
}
```

### Hub Events

| Server → Client Event | Trigger                                       |
|-----------------------|-----------------------------------------------|
| `ReceiveMessage`      | New message sent to conversation group        |
| `MessageEdited`       | Message was edited                            |
| `MessageDeleted`      | Message was deleted                           |
| `MessagesRead`        | Read receipts updated                         |
| `UserTyping`          | Typing indicator (`isTyping: true / false`)   |
| `UserOnline`          | User connected (sent to `Clients.Others`)     |
| `UserOffline`         | User fully disconnected (no remaining conns)  |
| `Error`               | Hub method failed (sent to `Clients.Caller`)  |

### Group Management

Each conversation maps to a SignalR group using its `Guid` as the group name:

```csharp
// Auto-join all existing conversations on connect
foreach (var conversation in conversations)
    await Groups.AddToGroupAsync(Context.ConnectionId, conversation.Id.ToString());

// Join a new conversation dynamically
await Groups.AddToGroupAsync(Context.ConnectionId, conversationId.ToString());
```

---

## 8. Authentication & Identity

### Gateway Header Propagation

Services do **not** validate JWT tokens directly (except `AuthService`). The API Gateway validates the token and forwards identity as headers:

| Header        | Type     | Content                                  |
|---------------|----------|------------------------------------------|
| `X-User-Id`   | `Guid`   | Authenticated user's ID                  |
| `X-User-Role` | `string` | User's role: `"User"` or `"Admin"`       |

**Identity extraction (controllers):**
```csharp
var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
    return Unauthorized(new ErrorResponse { ErrorCode = "UNAUTHORIZED", Message = "..." });
```

**Admin role check:**
```csharp
var userRoleHeader = Request.Headers["X-User-Role"].FirstOrDefault();
if (string.IsNullOrEmpty(userRoleHeader) || userRoleHeader != "Admin")
    return StatusCode(403, new { message = "Admin role required to access this endpoint" });
```

### Token Lifecycle

```
Register / Login → AccessToken (short-lived JWT) + RefreshToken (long-lived, stored in DB)
Refresh          → Old RefreshToken revoked (IsRevoked = true) + new token pair issued
Revoke           → RefreshToken.IsRevoked = true
```

### OTP Flow

```
SendOtp(email)   → 6-digit code generated → BCrypt hashed → stored on User.OtpCode
                 → Sent via email (HTML template) → OtpExpiry set to +5 min
VerifyOtp        → BCrypt.Verify input vs hash → clear OtpCode/OtpExpiry/LastOtpSentAt
                 → mark User.IsVerified = true (for account verification)
                 → update User.PasswordHash (for forgot/change password flows)
```

Rate limiting: 1-minute cooldown enforced via `User.LastOtpSentAt`.

---

## 9. Technology Cheat-Sheet

| Technology                | Usage                                                        |
|---------------------------|--------------------------------------------------------------|
| **ASP.NET Core 8**        | Web API, middleware pipeline, controller routing             |
| **EF Core + Npgsql**      | ORM for PostgreSQL; code-first migrations; auto-apply on start |
| **RabbitMQ**              | Async event publishing + RPC pattern between services        |
| **Redis**                 | Caching; online presence tracking (SignalR sessions)         |
| **SignalR**               | Real-time WebSocket hub in `MessageService`                  |
| **JWT Bearer**            | Token auth in `AuthService`; header-forwarded in all others  |
| **BCrypt.Net**            | Password hashing and OTP code hashing                       |
| **Cloudinary**            | Image/video upload (avatars, cover photos, post media)       |
| **Firebase FCM**          | Mobile push notifications via `NotificationService`          |
| **.NET Aspire**           | Service orchestration, discovery, telemetry, health checks   |
| **xUnit / Testcontainers**| Unit and integration tests for `AuthService`                 |
