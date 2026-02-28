# Architecture — CMS V2

## System Overview

The Capstone Management System (CMS) is a full-stack MERN application following a **monorepo with npm workspaces** architecture. It uses a feature-modular backend structure with a service-layer pattern and a React SPA frontend with client-side routing.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                  Client (React)                  │
│   Vite Dev Server / Static Build                │
│   ┌───────────────────────────────────────────┐ │
│   │ React Router → Pages → Components         │ │
│   │ Zustand (auth) + React Query (server)     │ │
│   │ Axios (API layer w/ token refresh)        │ │
│   └───────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────┘
                     │ HTTP (JSON) — cookies
                     ▼
┌─────────────────────────────────────────────────┐
│              Server (Express.js)                 │
│   ┌───────────────────────────────────────────┐ │
│   │ Middleware Pipeline:                       │ │
│   │   helmet → cors → bodyParser → cookies    │ │
│   │   → rateLimiter → routes → errorHandler   │ │
│   ├───────────────────────────────────────────┤ │
│   │ Feature Modules:                          │ │
│   │   auth/ → users/ → teams/ → notifications/│ │
│   │   → projects/ → submissions/ → dashboard/ │ │
│   │   (validation → controller → service)     │ │
│   ├───────────────────────────────────────────┤ │
│   │ Cross-Cutting:                             │ │
│   │   authenticate, authorize, validate        │ │
│   │   AppError, catchAsync, generateToken      │ │
│   └───────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────┘
                     │ Mongoose ODM
                     ▼
┌─────────────────────────────────────────────────┐
│              MongoDB (Database)                   │
│   Collections: users, otps, refreshtokens,        │
│   teams, teaminvites, notifications,              │
│   projects, submissions                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│           AWS S3 (Cloud Storage)                  │
│   Bucket: Private, pre-signed URL access only     │
│   Key pattern: projects/{id}/chapters/{ch}/v{n}/  │
└─────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Module Structure

Each feature module follows a consistent 4-file pattern:

```
module/
├── module.validation.js   # Zod schemas for request validation
├── module.service.js      # Business logic (DB operations, rules)
├── module.controller.js   # Thin HTTP handlers (req → service → res)
└── module.routes.js       # Express router with middleware chain
```

### Request Lifecycle

```
Incoming Request
  → helmet (security headers)
  → cors (origin check)
  → bodyParser (JSON parsing)
  → cookieParser (cookie parsing)
  → rateLimiter (request throttling)
  → Router matching
    → validate(schema) middleware (Zod)
    → authenticate middleware (JWT from cookie)
    → authorize(...roles) middleware (role check)
    → Controller handler
      → Service method (business logic)
      → Mongoose model operations
    → Response (JSON)
  → errorHandler (if error thrown)
```

### Error Handling Strategy

- **AppError class** — custom operational error with `statusCode`, `code`, and `isOperational`
- **catchAsync wrapper** — wraps async handlers, forwards errors to `next()`
- **Centralized errorHandler** — catches all errors, normalizes Mongoose/JWT/Zod errors into consistent `{ success: false, error: { code, message, status } }` format
- Development mode includes `stack` trace in error responses

### Authentication Flow

```
Registration → OTP sent (email) → Verify OTP → Account active

Login → Access token (15min cookie) + Refresh token (7d cookie)
  → Access token expires → Client sends /refresh
  → Server rotates refresh token (old revoked, new issued)
  → If old token reused → ALL tokens for user revoked (theft detection)

Logout → Both tokens revoked, cookies cleared
```

---

## Frontend Architecture

### State Management

| Type   | Tool          | Purpose                              |
| ------ | ------------- | ------------------------------------ |
| Auth   | Zustand       | User session, login/logout, loading  |
| Server | React Query   | API data caching, auto-refetch       |
| Forms  | react-hook-form + zod | Form state + validation       |
| Theme  | React Context | Dark/light/system theme preference   |

### Component Hierarchy

```
App
├── ThemeProvider (context)
├── Suspense (lazy loading)
└── Routes
    ├── GuestRoute wrapper
    │   ├── LoginPage
    │   ├── RegisterPage
    │   ├── ForgotPasswordPage
    │   └── ResetPasswordPage
    ├── VerifyOtpPage
    └── ProtectedRoute wrapper
        └── DashboardPage
            └── DashboardLayout
                ├── Sidebar (role-based nav)
                ├── Header (user info, theme, notifications)
                └── Main content (role-specific cards)
```

### API Layer

- **Axios instance** with `withCredentials: true` for cookie auth
- **Response interceptor** — on 401, queues failed requests, attempts token refresh, retries
- **Service objects** — `authService`, `userService`, `teamService`, `notificationService`, `dashboardService`
- Each service method returns the Axios promise (data extracted by caller)
- **submissionService** — dedicated service for file upload (multipart) and all submission CRUD/review/annotation operations

### Submission Hooks (`useSubmissions.js`)

- `submissionKeys` factory for cache key management
- 5 query hooks: `useSubmission`, `useProjectSubmissions`, `useChapterHistory`, `useLatestChapter`, `useViewUrl`
- 5 mutation hooks: `useUploadChapter`, `useReviewSubmission`, `useUnlockSubmission`, `useAddAnnotation`, `useRemoveAnnotation`
- Mutations invalidate both `submissionKeys.all` and `projectKeys.all` on success

### Dashboard Hook (`useDashboard.js`)

- `dashboardKeys` factory for cache key management
- `useDashboard()` — query hook with 30s staleTime, 60s refetchInterval for live data

### Notification Hooks (`useNotifications.js`)

- `notificationKeys` factory for cache key management
- 2 query hooks: `useNotifications` (30s polling, paginated), `useUnreadCount` (30s polling)
- 4 mutation hooks: `useMarkAsRead`, `useMarkAllAsRead`, `useDeleteNotification`, `useClearAllNotifications`
- Mutations invalidate notification cache on success

### Theme System

- CSS custom properties (HSL-based) for all semantic colors
- Two sets: `:root` (light) and `.dark` (dark)
- Tailwind `darkMode: 'class'` — ThemeProvider toggles `.dark` on `<html>`
- Supports: `light`, `dark`, `system` (via `matchMedia` listener)
- Persisted in `localStorage` under configurable key

---

## Shared Package (`@cms/shared`)

Workspace package consumed by both client and server:

- `ROLES` — frozen object: `{ STUDENT, ADVISER, PANELIST, INSTRUCTOR }`
- `ROLE_VALUES` — array of valid role strings
- `HTTP_STATUS` — standard HTTP status code constants

---

## Security Architecture

| Concern           | Implementation                                   |
| ----------------- | ------------------------------------------------ |
| Auth tokens       | JWT in HTTP-only, Secure, SameSite=Strict cookies |
| Token rotation    | Refresh tokens rotated on use, reuse = revoke all |
| Password storage  | bcrypt with 12 salt rounds                        |
| OTP storage       | bcrypt-hashed, 10-min TTL with MongoDB TTL index  |
| Rate limiting     | express-rate-limit (per-route thresholds)          |
| Input validation  | Zod schemas on every mutating endpoint             |
| HTTP headers      | Helmet.js defaults                                 |
| CORS              | Restricted to CLIENT_URL origin only               |
| Authorization     | Role-based middleware + route-level checks          |
| File uploads      | multer (memory) + magic-byte MIME validation        |
| Cloud storage     | AWS S3 private bucket, pre-signed URLs (15 min)     |
| File type safety  | Binary signature check via file-type library         |

---

## Development Workflow

```
npm install          # Install all workspace dependencies
npm run dev          # Start client + server concurrently
npm run lint         # ESLint across all packages
npm run format       # Prettier formatting
```

- Server uses `node --watch` for auto-restart (Node 18+)
- Client uses Vite HMR with `/api` proxy to server
- ESLint + Prettier configured at root, shared across packages
