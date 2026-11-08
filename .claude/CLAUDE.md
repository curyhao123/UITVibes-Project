# CLAUDE.md

This file guides Claude Code (and humans) working in this repository. It summarizes the
project layout, the commands that matter, and the conventions defined in.
[`frontend/CONVENTIONS.md`](frontend/CONVENTIONS.md) and
[`Backend/CONVENTIONS.md`](Backend/CONVENTIONS.md). Those two files are the source of truth;
read the relevant one before making non-trivial changes.

## Working rules for this repo

- Keep backend code `dotnet format`-clean; CI fails otherwise.
- Keep frontend lint and `tsc --noEmit` clean.
- When a backend DTO changes, update `frontend/services/backendTypes.ts` and any gateway route
  in `ApiService/appsettings.json` that it affects.
- New EF entities or columns need a migration in the owning service.
- Never commit secrets, tokens, or `appsettings.Development.json` / `.env.local` files.
- If you change a convention, update the matching `CONVENTIONS.md` and this file.
- Always ask user before pushing to origin
- Always ask user before commit
- write commit message with feat, fix, chore and (backend), (frontend) next to it
- Keep comments short (one line where possible). Don't comment variables, properties, fields,
  constants or DTOs; only comment non-obvious intent ("why"), not what the code already says.

## Project overview

UITVibes is a social network: a **React Native / Expo** mobile app (`frontend/`) talking to a
**.NET 8 microservices** backend (`Backend/`) orchestrated by **.NET Aspire**. Features include
posts, stories, highlights, reels, comments/mentions, follow/block, 1:1 and group chat,
push and in-app notifications, reporting/moderation, and an admin portal.

```
UITVibes-Project/
├── frontend/          # Expo Router app (TypeScript)
├── Backend/           # .NET 8 microservices solution (UITVibes-Microservices.sln)
├── scripts/           # PowerShell dev helpers (static IP, Google redirect URIs)
└── .github/workflows/ci.yml
```

## Commands

### Frontend (`cd frontend`)

| Task | Command |
|---|---|
| Install | `npm ci` (or `npm install`) |
| Dev server | `npm start` (`npx expo start`) |
| Run on device/emulator | `npm run android` / `npm run ios` / `npm run web` |
| Lint (CI) | `npm run lint` |
| Type check (CI) | `npx tsc --noEmit` |

The API base URL comes from `EXPO_PUBLIC_API_URL`; otherwise `services/httpClient.ts` falls back
to the Expo host IP, `10.0.2.2` (Android emulator), or `localhost`, on gateway port `5512`.

### Backend (`cd Backend`)

| Task | Command |
|---|---|
| Restore | `dotnet restore` |
| Format check (CI, must pass) | `dotnet format --verify-no-changes` |
| Auto-format | `dotnet format` |
| Build | `dotnet build` |
| Test | `dotnet test` |
| Run everything (recommended) | `dotnet run --project UITVibes-Microservices.AppHost` |
| Infra only (Postgres, Redis, RabbitMQ) | `docker-compose up -d` |
| Add a migration | `dotnet ef migrations add <Name> --project <ServiceName>` |

Aspire provisions Postgres/Redis/RabbitMQ and injects secrets as parameters (JWT key,
Cloudinary, SMTP, Google OAuth, DeepSeek). Real values live in `dotnet user-secrets` or
untracked `appsettings.Development.json` files; never commit secrets (see `.gitignore`).
EF Core migrations are applied automatically at service startup.

### CI

`.github/workflows/ci.yml` runs on PRs to `main` / `dev/**` (and manual `workflow_dispatch`):
frontend `npm ci` → lint → `tsc --noEmit`; backend restore → `dotnet format --verify-no-changes`
→ Release build → `dotnet test`. Run the same checks locally before pushing.

---

## Frontend conventions (summary of `frontend/CONVENTIONS.md`)

**Stack:** React Native · Expo · Expo Router (file-based routing) · TypeScript (strict) · Axios ·
SignalR · React Context · AsyncStorage. Import alias `@/*` maps to `frontend/*`.
(Check `package.json` for current versions; the conventions doc lists older ones.)

### Structure
- `app/` – Expo Router routes: `(tabs)/` (home, search, create, reels, profile), `auth/`,
  `message/`, `post/[id].tsx`, `profile/[id].tsx`, `story/`, `admin/`, `notification/`.
  `_layout.tsx` is the root layout and wraps providers.
- `components/` – reusable UI; `ui/` holds base primitives, subfolders group feature components.
- `context/` – global state (see below).
- `services/` – Axios client (`httpClient.ts`), per-domain API services (`*Service.ts`),
  `signalrService.ts`, `backendTypes.ts` (TS types mirroring backend DTOs), `session.ts`.
- `constants/` (`theme.ts`, `typography.ts`), `hooks/`, `utils/` (`logger.ts`, `time.ts`), `types/`.
- `src/admin/` – admin portal screens and navigation.

### Naming
| Kind | Convention | Example |
|---|---|---|
| Components | `PascalCase.tsx` | `PostCard.tsx` (avoid `haptic-tab.tsx`) |
| Expo Router screens | `kebab-case.tsx` or `[id].tsx` | `email-verification.tsx` |
| Hooks | `useCamelCase.ts` | `useOnlineUsers.ts` (avoid `use-color-scheme.ts`) |
| Services / utils | `camelCase.ts` | `authService.ts` |
| Types / interfaces | `PascalCase` (backend DTOs prefixed `BE_`) | `UserProfile`, `BE_AuthResponse` |
| Constants | `UPPER_SNAKE_CASE` or `PascalCase` | `API_BASE_URL`, `Colors` |

Some legacy files break these rules; follow the rules for new files, don't mass-rename old ones.

### Code style
- Strict TypeScript; avoid `any`. Put backend-shaped types in `services/backendTypes.ts`.
- Props typed with an interface (`interface PostCardProps`).
- Styles via `StyleSheet.create({...})` at the bottom of the file, using `constants/theme.ts`.

### State management
Modular context: `AppContext.tsx` composes slices `useAuthState`, `useFeedState`,
`useChatState`, `useNotificationState`; screens read everything through `useApp()`.
Add new domain state as a new slice hook in `context/`, not by growing `AppContext.tsx`.

### API and errors
- All requests go through the Axios instance in `services/httpClient.ts`, which injects the
  bearer token and handles 401 by refreshing via `/auth/auth/refresh-token` (shared
  `refreshPromise`, retries the original request, redirects to `/auth/login` on failure).
- Services catch errors and throw a normalized `Error` with
  `error.response.data.message`; special codes (e.g. `IS_BANNED`) are attached as `err.errorCode`.
- Screens wrap async calls in `try / catch / finally` and show feedback (state, alert, toast).
- Normalize backend data in services (e.g. Cloudinary paths to full URLs via
  `normalizeAvatarUrlFromProfile`).
- Use optimistic updates for likes/bookmarks and roll back on failure.
- Store tokens only through `saveTokens()` / `clearTokens()`; never call AsyncStorage for
  tokens directly in components.

### Real-time
`services/signalrService.ts` connects when authenticated and listens for `ReceiveMessage`,
`UserOnline` / `UserOffline` (feeds `useOnlineUsers`), and `UserTyping`.

---

## Backend conventions (summary of `Backend/CONVENTIONS.md`)

**Stack:** .NET 8 · ASP.NET Core Web API · EF Core + Npgsql (PostgreSQL) · RabbitMQ · Redis ·
SignalR · .NET Aspire · YARP gateway · Cloudinary · Firebase FCM · BCrypt · xUnit.

### Services
- `AuthService` – registration, login, JWT/refresh tokens, OTP, Google sign-in, bans.
- `UserService` – profiles, follow/unfollow, block, user reports.
- `PostService` – posts, comments, likes, stories, reels, hashtags, moderation.
- `MessageService` – conversations and the SignalR `ChatHub`.
- `NotificationService` – in-app + FCM push notifications.
- `UITVibes-Microservices.ApiService` – YARP API gateway: validates JWT, forwards identity
  headers, maps public paths (`/auth/...`, `/user/...`, `/post/...`, `/message/...`,
  `/notification/...`, `/hubs/...`) to each service's `/api/...` routes (`appsettings.json`).
- `UITVibes-Microservices.AppHost` – Aspire orchestration; `ServiceDefaults` – shared
  telemetry/health/discovery.
- `DbSeeder/` – SQL seed scripts; `Test/` – xUnit tests (currently `AuthService` controller
  and integration tests).

### Per-service layout (every service)
```
Controllers/   ServiceLayer/{Interface,Implementation}/   DTOs/   Models/ (entities, DbContext, enums)
Messaging/{Interface,Implementation}/ + *Consumer.cs   Migrations/   Program.cs   Dockerfile
```
Controllers stay thin; business logic lives in the service layer. Register services as
`Scoped` and consumers as hosted services in `Program.cs`; call `builder.AddServiceDefaults()`
and `app.MapDefaultEndpoints()`.

### Naming
| Artifact | Convention | Example |
|---|---|---|
| Controller | `<Entity>Controller` | `UserProfileController` |
| Service | `I<Entity>Service` / `<Entity>Service` | `IUserProfileService` |
| Publisher | `I<Event>Publisher` / `<Event>Publisher` | `UserFollowPublisher` |
| Consumer | `<Event>Consumer`, `<Entity>RpcConsumer` | `UserCreatedConsumer` |
| RPC client | `<Entity>RpcClient` | `PostCountRpcClient` |
| DbContext | `<Service>DbContext` | `AuthDbContext` |
| DTOs | `<Action><Entity>Request`, `<Entity>Dto`, `<Action>Response`, `<Event>Event`, `<Entity>RpcRequest/Response` | `UserFollowedEvent` |
| Service methods | `<Verb><Entity>Async` | `GetProfileByUserIdAsync` |
| Private fields | `_camelCase` | `_logger` |
| Constants / properties | `PascalCase` | `QueueName`, `CreatedAt` |

Routes: `[Route("api/[controller]")]`, `{userId}` for lookups, `me` for the current user,
sub-resources like `me/avatar`, and **state transitions via `PATCH`** (e.g.
`PATCH reports/{id}/resolve`).

### Models and state
- Boolean flags for state (`IsActive`, `IsBanned`, `IsVerified`, `IsRevoked`).
- Enums live in or next to their model file with explicit integer values.
  **Do not share enums or models across services**; each service owns its copy
  (e.g. `ReportStatus` exists in both UserService and PostService).
- Counters (followers/following) are denormalized on `UserProfile` and updated at write time,
  along with `UpdatedAt = DateTime.UtcNow`.

### Errors and responses
- Services throw standard exceptions; controllers catch and map them. No custom exception classes.
  - `KeyNotFoundException` → 404; `InvalidOperationException`, `ArgumentException`,
    generic `Exception` (business rule) → 400; unexpected → log + 500.
- Missing/invalid `X-User-Id` → 401; non-admin on admin endpoint → 403.
- `AuthService` returns typed `ErrorResponse { ErrorCode, Message }` / `SuccessResponse`;
  `UserService`/`PostService` return `new { message = ... }`. Stay consistent **within** a service.
- The `"IS_BANNED|reason"` message-prefix trick is AuthService-only legacy; don't extend it.
- Use structured logging with named placeholders (`_logger.LogError(ex, "... {UserId}", userId)`),
  not `Console.WriteLine`.

### Identity
Only `AuthService` and the gateway handle JWTs. Downstream services read `X-User-Id` (Guid) and
`X-User-Role` (`"User"`/`"Admin"`) headers set by the gateway. Access tokens are short-lived;
refresh tokens are stored in the DB and rotated (old one `IsRevoked = true`). OTPs are 6 digits,
BCrypt-hashed, expire in 5 min, with a 1-minute resend cooldown.

### Messaging (RabbitMQ)
- **Events (fire-and-forget, durable queues):** save to DB first, then publish inside a
  `try/catch`; publish failure must not fail the request. Queues: `user.created`, `user.banned`,
  `user.followed`, `post.liked`, `post.commented`, `post.mentioned`, `comment.mentioned`,
  `message.sent`.
- **RPC (request/reply, non-durable queues)** via `ReplyTo` + `CorrelationId` for cross-service
  reads: `user.profile.get`, `user.follow.get`, `user.block.status`, `post.count.get`,
  `user.friendlist.get`. Services don't call each other over HTTP.
- Consumers are `BackgroundService`s that create a DI scope per message, `BasicAck` on success
  and `BasicNack(requeue: true)` on failure.

### SignalR (`MessageService` `ChatHub`)
- User id is parsed once in `OnConnectedAsync` (`X-User-Id` header → `userId` query →
  `access_token` JWT) and cached in `Context.Items`; hub methods use `GetUserId()`.
- Each conversation is a group named by its Guid; users auto-join on connect.
- Events: `ReceiveMessage`, `MessageEdited`, `MessageDeleted`, `MessagesRead`, `UserTyping`,
  `UserOnline`, `UserOffline`, `Error` (errors go to `Clients.Caller` only).

---

