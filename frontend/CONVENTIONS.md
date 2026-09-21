# UITVibes Frontend — Code Conventions & Architecture Guide

> **Stack:** React Native (0.81) · Expo (SDK 54) · Expo Router (v6) · TypeScript · Axios · SignalR · React Context · AsyncStorage

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Naming & Code Conventions](#2-naming--code-conventions)
3. [State Management Architecture](#3-state-management-architecture)
4. [Exception & Error Handling](#4-exception--error-handling)
5. [API & Data Layer](#5-api--data-layer)
6. [Real-Time Communication (SignalR)](#6-real-time-communication-signalr)
7. [Best Practices Summary](#7-best-practices-summary)

---

## 1. Project Structure

The frontend application is built with **Expo Router** using file-based routing.

```
frontend/
├── app/                          # Expo Router routes & screen layouts
│   ├── _layout.tsx               # Root layout & Provider wrapping
│   ├── index.tsx                 # App entry / splash screen
│   ├── (tabs)/                   # Main tab navigation group
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── home.tsx              # Home feed tab
│   │   ├── search.tsx            # Search tab
│   │   ├── create.tsx            # Post/Reel creation tab
│   │   ├── reels.tsx             # Reels tab
│   │   └── profile.tsx           # Current user profile tab
│   ├── auth/                     # Authentication flow screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── email-verification.tsx
│   │   └── onboarding-*.tsx      # Profile setup steps
│   ├── message/                  # Chat & conversation screens
│   │   ├── index.tsx             # Conversations list
│   │   └── chat/[id].tsx         # Private/Group chat screen
│   ├── post/[id].tsx             # Single post view
│   ├── profile/[id].tsx          # Other user profile view
│   ├── story/                    # Story creation and viewer screens
│   ├── admin/                    # Admin portal screens
│   └── notification/             # Notifications screen
│
├── components/                   # Reusable React Native UI Components
│   ├── ui/                       # Base primitives (IconSymbol, Collapsible)
│   ├── profile/                  # Profile-specific sheets & modals
│   ├── help/                     # Help & terms section components
│   ├── highlight/                # Story highlight components
│   ├── settings/                 # Settings row & section items
│   ├── PostCard.tsx              # Feed post card component
│   ├── ReelCard.tsx              # Vertical reel card component
│   └── ...                       # Other UI components & modals
│
├── context/                      # Global state management (React Context)
│   ├── AppContext.tsx            # Main AppProvider combining state slices
│   ├── useAuthState.ts           # Auth, user session & onboarding state slice
│   ├── useFeedState.ts           # Posts, stories & reels state slice
│   ├── useChatState.ts           # Messages & conversations state slice
│   ├── useNotificationState.ts   # In-app notifications state slice
│   ├── reelsUserCache.ts         # In-memory user profile cache for Reels
│   └── tabBarVisibility.tsx      # Tab bar display state
│
├── services/                     # Network clients & backend API services
│   ├── httpClient.ts             # Axios instance, baseURL, headers, 401 refresh interceptor
│   ├── api.ts                    # Main API barrel export
│   ├── authService.ts            # Authentication & account APIs
│   ├── userService.ts            # User profile, follow & block APIs
│   ├── postService.ts            # Posts, comments, likes & media APIs
│   ├── messageService.ts         # Chat conversations & message APIs
│   ├── signalrService.ts         # SignalR hub connection manager
│   ├── onlineTrackingService.ts  # Online status presence tracking
│   ├── notificationService.ts    # Notification APIs
│   ├── backendTypes.ts           # TypeScript interfaces matching C# backend DTOs
│   └── session.ts                # Local storage cache helpers
│
├── constants/                    # Application theme & styling constants
│   ├── theme.ts                  # Color palettes, dark/light themes
│   └── typography.ts             # Font families & standard text styles
│
├── hooks/                        # Custom React hooks
│   ├── useOnlineUsers.ts         # Subscribes to real-time online state
│   ├── useMicroInteractions.ts   # Haptic feedback & UI interaction helpers
│   └── use-theme-color.ts        # Dynamic theme color lookup
│
├── utils/                        # Pure utility functions
│   ├── logger.ts                 # Logging wrapper
│   └── time.ts                   # Date formatting helpers
│
├── types/                        # Global ambient TypeScript definitions
├── package.json
└── tsconfig.json
```

---

## 2. Naming & Code Conventions

### Standardized Naming Best Practices

To resolve code inconsistencies across legacy files, enforce the following standard conventions across the frontend codebase:

| Category | Recommended Convention | Good Example | Avoid |
|---|---|---|---|
| **React Components** | `PascalCase.tsx` | `PostCard.tsx`, `FormInput.tsx` | `parallax-scroll-view.tsx`, `haptic-tab.tsx` |
| **Expo Router Screens** | `kebab-case.tsx` or `[id].tsx` | `email-verification.tsx`, `[id].tsx` | `emailVerification.tsx` |
| **Custom Hooks** | `camelCase` starting with `use` | `useAuthState.ts`, `useOnlineUsers.ts` | `use-color-scheme.ts` |
| **Services & Utils** | `camelCase.ts` | `authService.ts`, `httpClient.ts` | `AuthService.ts` |
| **Types & Interfaces** | `PascalCase` | `UserProfile`, `BE_AuthResponse` | `user_profile` |
| **Constants** | `UPPER_SNAKE_CASE` or `PascalCase` | `API_BASE_URL`, `Colors` | `api_base_url` |

### Code Style Guidelines
- **TypeScript**: Strict typing is enabled. Avoid using `any` where possible. Create typed interfaces in `services/backendTypes.ts` or local type files.
- **Component Exports**: Use named exports or default exports consistently. Standard UI components export default or named components with TypeScript interfaces for props (`interface PostCardProps`).
- **Styles**: Use `StyleSheet.create({...})` at the bottom of the file or use shared constant themes from `constants/theme.ts`.

---

## 3. State Management Architecture

State is structured using a **Modular Context Pattern** to prevent bloated monolithic context files while retaining a simple global API via `useApp()`.

```
                  ┌──────────────────────┐
                  │      useApp()        │
                  └──────────┬───────────┘
                             │
                  ┌──────────┴───────────┐
                  │     AppProvider      │
                  └──────────┬───────────┘
                             │
     ┌───────────────────────┼───────────────────────┬───────────────────────┐
     ▼                       ▼                       ▼                       ▼
useAuthState            useFeedState            useChatState        useNotificationState
 (User, Auth,           (Posts, Stories,         (Conversations,        (Notifications,
 Onboarding)               Reels)                   Messages)             Unread Count)
```

### Context Slices Breakdown

1. **`useAuthState`**: Manages `currentUser`, authentication tokens, onboarding flow step, and suggested users.
2. **`useFeedState`**: Handles home feed posts, reels, stories, likes, bookmarks, and comments. Supports optimistic UI updates.
3. **`useChatState`**: Controls conversation lists, active conversation, chat message history, typing status, and SignalR listeners.
4. **`useNotificationState`**: Manages notification fetching, marking as read, and unread counts.
5. **`AppContext.tsx`**: Composes all slices into a unified `AppContext.Provider`. Screens consume this via the `useApp()` custom hook:

```tsx
import { useApp } from '@/context/AppContext';

export default function HomeScreen() {
  const { posts, refreshPosts, currentUser } = useApp();
  // ...
}
```

---

## 4. Exception & Error Handling

### 1. HTTP Network Interceptor (`httpClient.ts`)

All network requests pass through an Axios instance configured in `services/httpClient.ts`:

- **Automatic Token Injection**: Requests automatically attach the `Authorization: Bearer <accessToken>` header retrieved from `AsyncStorage`.
- **Automatic 401 Refresh Handshake**: If an API call returns `401 Unauthorized`:
  1. The response interceptor catches the 401 error.
  2. It pauses concurrent requests using a shared `refreshPromise` to avoid race conditions.
  3. It sends a request to `/auth/auth/refresh-token` with the stored refresh token.
  4. If successful, new tokens are stored, and original failed requests are retried.
  5. If token refresh fails (or refresh token expired/revoked), tokens are cleared, and the user is redirected to `/auth/login`.

```typescript
// Response Interceptor Handling Token Refresh (httpClient.ts)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      // Triggers silent token refresh or redirects to login
    }
    return Promise.reject(error);
  }
);
```

### 2. Service Layer Error Normalization (`services/*Service.ts`)

Services catch backend errors, extract structured error codes (`errorCode`, `message`), and throw normalized JavaScript `Error` objects:

```typescript
// Example: Exception Normalization in authService.ts
try {
  const { data } = await apiClient.post<BE_AuthResponse>("/auth/auth/login", body);
  return data;
} catch (error: any) {
  const errorCode = error?.response?.data?.errorCode;
  if (errorCode === "IS_BANNED") {
    const err = new Error(error?.response?.data?.message || "User account is banned.") as Error & { errorCode: string };
    err.errorCode = "IS_BANNED";
    throw err;
  }
  const message = error?.response?.data?.message || error?.message || "Login failed";
  throw new Error(message);
}
```

### 3. UI Component Layer Error Handling

In components and screens, async operations are wrapped in `try / catch` blocks to give user feedback via state, alerts, or toasts:

```typescript
try {
  setIsSubmitting(true);
  await login(email, password);
  router.replace('/(tabs)/home');
} catch (error: any) {
  if (error.errorCode === 'IS_BANNED') {
    Alert.alert('Account Banned', error.message);
  } else {
    setErrorMessage(error.message || 'An error occurred during login');
  }
} finally {
  setIsSubmitting(false);
}
```

---

## 5. API & Data Layer

- **Base URL Resolution**: Dynamically resolved in `httpClient.ts` depending on `EXPO_PUBLIC_API_URL`, local network Expo host URI (`Constants.expoConfig?.hostUri`), Android emulator loopback (`10.0.2.2`), or `localhost`.
- **Data Normalization (`backendTypes.ts`)**: Backend DTOs returned by microservices are transformed into clean frontend domain models (e.g. converting backend Cloudinary image paths to full HTTPS URLs using `normalizeAvatarUrlFromProfile`).

---

## 6. Real-Time Communication (SignalR)

Real-time chat messaging and online presence are managed via SignalR (`services/signalrService.ts`):

- **Automatic Hub Connection**: Automatically connects when authenticated using token parameter or auth headers.
- **Listeners**:
  - `ReceiveMessage`: Appends incoming chat message to active chat state.
  - `UserOnline` / `UserOffline`: Updates online users presence hook (`useOnlineUsers`).
  - `UserTyping`: Triggers typing indicator in chat screen.

---

## 7. Best Practices Summary

1. **Strict Component Naming**: Prefer `PascalCase.tsx` for components in `components/` directory.
2. **Modular State Slices**: Keep new domain state inside dedicated custom hook files under `context/` (e.g. `useFeedState.ts`) rather than swelling `AppContext.tsx`.
3. **Always Throw Clean Errors in Services**: Let services extract `error?.response?.data?.message` so components receive human-readable messages.
4. **Optimistic Updates**: For UI actions like Likes or Bookmarks, update local state immediately and roll back if the API call fails.
5. **Secure Storage**: Always store tokens using `saveTokens()` / `clearTokens()` helpers rather than calling `AsyncStorage` directly in components.
