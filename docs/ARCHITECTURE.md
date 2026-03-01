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

┌─────────────────────────────────────────────────┐
│            Redis (Cache / Queue Broker)            │
│   BullMQ queues: plagiarism-check, email-dispatch │
└──────────┬──────────────────┬────────────────────┘
           │                  │
           ▼                  ▼
┌──────────────────┐ ┌────────────────────┐
│ Plagiarism Worker│ │   Email Worker     │
│  S3 download →   │ │  Nodemailer        │
│  text extraction │ │  dispatch          │
│  → similarity    │ └────────────────────┘
│  → update DB     │
│  → notify user   │
└──────────────────┘
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

## Background Processing Architecture

> Added in Sprint 8 — Plagiarism Checker Integration (Async)

### Infrastructure

- **Redis** — connection managed by `config/redis.js`; skipped in `NODE_ENV=test`
- **BullMQ** — job queue library using Redis as the broker
- **Queue names:** `plagiarism-check`, `email-dispatch`
- **Job deduplication:** plagiarism jobs use ID `plag-{submissionId}` to prevent duplicates

### Plagiarism Check Flow

```
Student uploads chapter
  → Controller saves to S3 + creates submission (status: queued)
  → Enqueues plagiarism-check job via BullMQ
  → Returns 201 immediately

Plagiarism Worker picks up job:
  1. Downloads file from S3
  2. Extracts text (pdf-parse / mammoth / plain)
  3. Builds corpus from approved submissions in same project
  4. Runs three-tier originality engine:
     a. Internal Jaccard 3-shingle comparison
     b. Copyleaks API (placeholder — not yet configured)
     c. Mock fallback (70–100% random score)
  5. Updates submission.plagiarismResult (score, matchedSources)
  6. Sends in-app notification to student

If Redis unavailable → synchronous fallback runs in-process
```

### Plagiarism Service (`services/plagiarism.service.js`)

| Function               | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `tokenize(text)`       | Lowercases and splits text into word tokens         |
| `buildShingles(tokens, n)` | Creates n-gram shingle sets for comparison      |
| `jaccardSimilarity(a, b)` | Computes Jaccard index between two Sets          |
| `compareAgainstCorpus(text, corpus)` | Compares against array of corpus docs  |
| `checkOriginality(text, corpus)` | Full pipeline: tokenize → shingle → compare |
| `generateMockResult()` | Deterministic mock for testing (70–100% score)      |
| `isCopyleaksConfigured()` | Checks env for Copyleaks API credentials         |

### Text Extraction (`utils/extractText.js`)

| MIME Type             | Library     |
| --------------------- | ----------- |
| `application/pdf`     | pdf-parse   |
| `application/vnd.openxmlformats...` | mammoth |
| `text/plain`          | Buffer.toString |

---

## Real-Time Architecture (Socket.IO)

### Server (`services/socket.service.js`)

- Singleton Socket.IO instance attached to the HTTP server
- **Auth middleware**: Parses JWT from the `cookie` header in the handshake, verifies, and attaches `userId` / `userRole` to the socket
- On connection each socket auto-joins a private room `user:<userId>`
- `emitToUser(userId, event, data)` — Emits to a user's private room; silently no-ops when `io` is `null` (safe for tests)
- `resetSocket()` — Sets `io` to `null` for test cleanup

### Client (`services/socket.js` + `hooks/useSocket.js`)

- `connectSocket()` / `disconnectSocket()` / `getSocket()` — singleton pattern with auto-reconnect
- `useSocket()` hook: connects on auth, listens for `notification:new` → shows toast via **sonner** and invalidates React Query notification caches
- Socket disconnected on logout via `authStore`

### Events

| Event               | Direction       | Payload                       | Trigger                           |
| ------------------- | --------------- | ----------------------------- | --------------------------------- |
| `notification:new`  | Server → Client | `{ type, title, message, … }` | Any server-side notification emit |

### Emitters in Service Layer

- **team.service.js** — `team_invite`, `team_joined`, `team_locked`
- **project.service.js** — 8 notification sites (title actions, status changes, etc.)
- **submission.service.js** — 7 notification sites (upload, review, lock, unlock, etc.)
- **evaluation.service.js** — 2 notification sites (evaluation released, etc.)
- **plagiarism.job.js** — 1 notification site (check completed)

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
- **submissionService** — dedicated service for file upload (multipart), submission CRUD/review/annotation, and proposal compilation operations
- **plagiarismService** — dedicated service for plagiarism status queries (`getPlagiarismStatus`)

### Submission Hooks (`useSubmissions.js`)

- `submissionKeys` factory for cache key management
- 5 query hooks: `useSubmission`, `useProjectSubmissions`, `useChapterHistory`, `useLatestChapter`, `useViewUrl`
- 6 mutation hooks: `useUploadChapter`, `useCompileProposal`, `useReviewSubmission`, `useUnlockSubmission`, `useAddAnnotation`, `useRemoveAnnotation`
- Mutations invalidate both `submissionKeys.all` and `projectKeys.all` on success

### Dashboard Hook (`useDashboard.js`)

- `dashboardKeys` factory for cache key management
- `useDashboard()` — query hook with 30s staleTime, 60s refetchInterval for live data

### Plagiarism Hook (`usePlagiarism.js`)

- `plagiarismKeys` factory for cache key management
- `usePlagiarismResult(submissionId)` — query hook with adaptive polling:
  - Polls every 5s while status is `queued` or `processing`
  - Stops polling on `completed` or `failed`
  - Disabled when no `submissionId` provided

### Plagiarism Components

- **OriginalityBadge** — colour-coded badge (green ≥80%, yellow ≥60%, red <60%) with status-aware states (queued, processing, failed)
- **PlagiarismReport** — full report card with SVG score ring, matched sources table, loading/error/empty states

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
- `PLAGIARISM_STATUSES` — frozen object: `{ QUEUED, PROCESSING, COMPLETED, FAILED }`
- `PLAGIARISM_STATUS_VALUES` — array of valid plagiarism status strings
- `PROJECT_STATUSES` — includes `ARCHIVED`, `REJECTED`
- `TITLE_STATUSES`, `SUBMISSION_STATUSES`, `CAPSTONE_PHASES` — workflow state enums
- `EVALUATION_STATUSES`, `DEFENSE_TYPES` — defense evaluation enums
- `PROTOTYPE_TYPES` — image, video, link

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
| Background jobs   | BullMQ + Redis; sync fallback when Redis unavailable |
| Job deduplication | Plagiarism jobs keyed by `plag-{submissionId}`       |

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
