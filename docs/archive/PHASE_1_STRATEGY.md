# Phase 1 Development Strategy — Foundation & Authentication

> **Last updated:** 2025-07-16  
> **Scope:** Project scaffolding, authentication, RBAC, team formation, core UI shell, dev tooling  
> **Duration estimate:** 3–4 sprints (≈ 6–8 weeks using Agile Scrum)  
> **Prerequisite:** All design artifacts (database schema, API endpoint spec, UI wireframes in Figma) must be finalized before Sprint 1 begins.

---

## Table of Contents

- [1. Phase 1 Goal](#1-phase-1-goal)
- [2. What Phase 1 Delivers](#2-what-phase-1-delivers)
- [3. What Phase 1 Does NOT Include](#3-what-phase-1-does-not-include)
- [4. Sprint Breakdown](#4-sprint-breakdown)
  - [Sprint 1: Scaffolding, Tooling & Database Foundation](#sprint-1-scaffolding-tooling--database-foundation)
  - [Sprint 2: Authentication & User Management](#sprint-2-authentication--user-management)
  - [Sprint 3: RBAC, Team Formation & Core UI Shell](#sprint-3-rbac-team-formation--core-ui-shell)
  - [Sprint 4: Integration Testing, Polish & Handoff](#sprint-4-integration-testing-polish--handoff)
- [5. Folder Structure (End of Phase 1)](#5-folder-structure-end-of-phase-1)
- [6. Database Collections (Phase 1)](#6-database-collections-phase-1)
- [7. API Endpoints (Phase 1)](#7-api-endpoints-phase-1)
- [8. Risk Register](#8-risk-register)
- [9. Definition of Done (Phase 1)](#9-definition-of-done-phase-1)
- [10. Phase 1 → Phase 2 Handoff Checklist](#10-phase-1--phase-2-handoff-checklist)

---

## 1. Phase 1 Goal

Establish the **entire technical foundation** of the Capstone Management System so that every subsequent phase (document submission, plagiarism integration, defense evaluation, archiving) can be built on a stable, tested, and documented base.

Phase 1 answers: *"Can a user register, verify their email, log in securely, form a team, and land on a role-appropriate dashboard — with the system enforcing proper access control, consistent theming, and clean error handling from day one?"*

If Phase 1 is solid, all future features are additive. If Phase 1 is fragile, every future feature will require rework.

---

## 2. What Phase 1 Delivers

| Deliverable | Rules Addressed |
|-------------|----------------|
| Monorepo folder structure (`/client`, `/server`, `/shared`, `/docs`) | Rule 1 |
| Dev tooling: ESLint, Prettier, Husky, lint-staged, conventional commits | Rule 6 |
| Git branching model (`main`, `develop`, `feature/*`, `fix/*`) | Rule 6 |
| MongoDB connection, Mongoose setup, core schemas (User, Team, OTP, RefreshToken) | Rule 1, Rule 3 |
| Database indexes on frequently queried fields | Rule 1 |
| Express server with service-layer architecture and feature-modular folder layout | Rule 1 |
| Centralized error-handling middleware (consistent JSON error format) | Rule 1 |
| JWT authentication (HTTP-only, Secure, SameSite=Strict cookies) | Rule 2A |
| Refresh token rotation and server-side revocation | Rule 2A |
| 6-digit OTP email verification (10-minute expiry) | FR-01, NFR02 |
| Password hashing (bcrypt, 12+ salt rounds) | Rule 2C |
| Password reset flow (OTP-based) | FR-02 |
| RBAC middleware (`authorize(roles[])`) | Rule 2A |
| Rate limiting on auth routes | Rule 2D |
| Helmet security headers | Rule 2D |
| CORS: explicit origin allowlist | Rule 2D |
| Input validation middleware (joi or zod) | Rule 2C |
| Team creation and invitation system (team leader invites up to 3 members) | FR-03, FR-04 |
| Team lock mechanism (leader finalizes roster) | FR-04 |
| React 18 + Vite client with shadcn/ui installed | Rule 1 |
| Dark/light mode foundation (CSS variables, `.dark` class toggle, OS preference detection) | Rule 4A–4G |
| Role-based dashboard shell (4 layouts: Student, Adviser, Panelist, Instructor) | FR-01 through FR-INS-01 |
| Protected routes (frontend route guards + backend middleware) | Rule 2A |
| Notification infrastructure (in-app: basic, email: queued via BullMQ stub) | Rule 5, FR-17, FR-AD-07 |
| Living documentation: README, ARCHITECTURE, API, DATABASE, CONTRIBUTING, CHANGELOG | Rule 7 |

---

## 3. What Phase 1 Does NOT Include

These are explicitly deferred to Phase 2+:

- Document/chapter upload and file storage (cloud storage integration)
- Plagiarism/originality checker (Copyleaks API)
- Google Docs API integration (auto-template, version control)
- Title submission and similarity check (Levenshtein Distance)
- Adviser highlight-and-comment document review tool
- Split-screen document viewer
- Defense evaluation and grading
- Archive search and reporting
- Certificate generation
- Bulk upload (Instructor)
- Prototype showcasing (Capstone 2 & 3)

Phase 1 builds the **foundation**; Phase 2 builds the **workflow**.

---

## 4. Sprint Breakdown

### Sprint 1: Scaffolding, Tooling & Database Foundation

**Goal:** A developer can clone the repo, run one command, and have both client and server running locally with a connected MongoDB instance and enforced code quality.

#### Tasks

| ID | Task | Owner | Priority |
|----|------|-------|----------|
| S1-01 | Initialize Git repo with `main` and `develop` branches; set branch protection rules | DevOps / Lead | Critical |
| S1-02 | Create monorepo folder structure: `/client`, `/server`, `/shared`, `/docs`, `/reference` | Lead | Critical |
| S1-03 | Initialize `/server` — `npm init`, install Express, Mongoose, dotenv, cors, helmet, express-rate-limit, cookie-parser | Backend | Critical |
| S1-04 | Initialize `/client` — `npm create vite@latest` (React + TypeScript template), install Tailwind CSS, shadcn/ui CLI, Axios, React Router v6, Zustand, @tanstack/react-query | Frontend | Critical |
| S1-05 | Configure shared ESLint config (`.eslintrc.cjs`), Prettier config (`.prettierrc`), EditorConfig (`.editorconfig`) | Lead | High |
| S1-06 | Install Husky + lint-staged; configure pre-commit hook to run `eslint --fix` and `prettier --write` on staged files | Lead | High |
| S1-07 | Set up `.env.example` for both client and server with all required environment variables documented | Lead | High |
| S1-08 | Create `/server/config/db.js` — MongoDB connection using Mongoose with retry logic and connection event logging | Backend | Critical |
| S1-09 | Design and implement **User** Mongoose schema (`/server/modules/users/user.model.js`) | Backend | Critical |
| S1-10 | Design and implement **Team** Mongoose schema (`/server/modules/teams/team.model.js`) | Backend | Critical |
| S1-11 | Design and implement **OTP** Mongoose schema (`/server/modules/auth/otp.model.js`) with TTL index (10-min expiry) | Backend | Critical |
| S1-12 | Design and implement **RefreshToken** Mongoose schema (`/server/modules/auth/refreshToken.model.js`) | Backend | Critical |
| S1-13 | Add database indexes: compound index on `User.email + role`, index on `Team.members`, TTL index on OTP, index on RefreshToken | Backend | High |
| S1-14 | Create centralized error class (`AppError`) and global error-handling middleware (`/server/middleware/errorHandler.js`) that outputs consistent JSON error format | Backend | Critical |
| S1-15 | Write initial `README.md` with project overview, setup instructions, env var table, and run commands | Docs | High |
| S1-16 | Write initial `CONTRIBUTING.md` with branch naming, PR process, commit conventions, code review checklist | Docs | High |
| S1-17 | Create `CHANGELOG.md` with initial `[0.1.0] - Unreleased` section | Docs | Medium |

#### Sprint 1 Definition of Done
- [ ] `npm run dev` in `/server` starts Express on the configured port and connects to MongoDB
- [ ] `npm run dev` in `/client` starts Vite dev server with React rendering a placeholder page
- [ ] Husky pre-commit hook runs ESLint + Prettier and blocks commits with lint errors
- [ ] MongoDB connection handles failure gracefully (retries, logs error, does not crash)
- [ ] All 4 Mongoose schemas compile without errors and can be imported
- [ ] Global error handler returns `{ success: false, error: { code, message, status } }` for thrown `AppError` instances
- [ ] `README.md` allows a new developer to set up the project from zero

---

### Sprint 2: Authentication & User Management

**Goal:** A user can register with email, receive and verify a 6-digit OTP, log in, receive JWT in HTTP-only cookie, refresh the token, reset their password, and log out with server-side token invalidation.

#### Tasks

| ID | Task | Owner | Priority |
|----|------|-------|----------|
| S2-01 | Create **AuthService** (`/server/modules/auth/auth.service.js`) with methods: `register`, `verifyOtp`, `login`, `refreshToken`, `logout`, `forgotPassword`, `resetPassword` | Backend | Critical |
| S2-02 | Create **AuthController** (`/server/modules/auth/auth.controller.js`) — thin handlers that delegate to AuthService | Backend | Critical |
| S2-03 | Create auth routes (`/server/modules/auth/auth.routes.js`): `POST /api/auth/register`, `POST /api/auth/verify-otp`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | Backend | Critical |
| S2-04 | Implement OTP generation (6-digit, cryptographically random), storage with 10-minute TTL, and email dispatch | Backend | Critical |
| S2-05 | Implement password hashing with bcrypt (12 salt rounds) in the User model pre-save hook | Backend | Critical |
| S2-06 | Implement JWT access token (short-lived: 15 min) + refresh token (long-lived: 7 days) generation | Backend | Critical |
| S2-07 | Set JWT access token in HTTP-only, Secure, SameSite=Strict cookie; refresh token in separate HTTP-only cookie | Backend | Critical |
| S2-08 | Implement refresh token rotation: on each refresh, old token is invalidated and new token issued | Backend | Critical |
| S2-09 | Implement server-side token revocation: `logout` invalidates all refresh tokens for the user; add a `revokedAt` field or blacklist collection | Backend | Critical |
| S2-10 | Implement `authenticate` middleware — extracts JWT from cookie, verifies, attaches `req.user` | Backend | Critical |
| S2-11 | Implement `authorize(roles[])` middleware — checks `req.user.role` against allowed roles, returns 403 if unauthorized | Backend | Critical |
| S2-12 | Create input validation schemas (using zod or joi) for all auth endpoints: register, login, verify-otp, forgot-password, reset-password | Backend | Critical |
| S2-13 | Apply `express-rate-limit` with aggressive limits on `/api/auth/*` routes (e.g., 5 requests/min for login, 3/min for OTP) | Backend | High |
| S2-14 | Apply `helmet` middleware globally on the Express app | Backend | High |
| S2-15 | Configure CORS with explicit origin allowlist (only the Vite dev server URL in development) | Backend | High |
| S2-16 | Set up email service abstraction (`/server/modules/notifications/email.service.js`) — use Nodemailer with a pluggable transport (Mailtrap for dev, SMTP/SES for production) | Backend | High |
| S2-17 | Create **UserService** and **UserController** for Instructor user management: `POST /api/users` (create), `GET /api/users` (list), `PATCH /api/users/:id` (edit/deactivate), `DELETE /api/users/:id` (soft delete) | Backend | High |
| S2-18 | Create role assignment endpoint: `PATCH /api/users/:id/role` (Instructor only) | Backend | High |
| S2-19 | Write unit tests for AuthService — register (happy path, duplicate email, invalid input), verifyOtp (valid, expired, wrong code), login (correct, wrong password, unverified account), refreshToken (valid, revoked), logout | Backend | Critical |
| S2-20 | Write security tests — Student calling Instructor-only endpoints (expect 403), expired JWT (expect 401), NoSQL injection in login fields (expect rejection), rate limit exceeded (expect 429) | Backend | High |
| S2-21 | Write initial `API.md` documenting all auth endpoints (method, path, request/response schemas, auth requirements, rate limits) | Docs | High |
| S2-22 | Write initial `DATABASE.md` documenting User, OTP, RefreshToken schemas, indexes, and example documents | Docs | High |

#### Sprint 2 Definition of Done
- [ ] Full registration → OTP verification → login → token refresh → logout flow works end-to-end via Postman
- [ ] Password reset flow (forgot → OTP → new password) works end-to-end
- [ ] JWT is stored only in HTTP-only cookies — never in localStorage or response body
- [ ] Refresh token rotation works: old refresh token is rejected after rotation
- [ ] Logout invalidates tokens server-side (not just client cookie deletion)
- [ ] Rate limiting blocks excessive login/OTP attempts
- [ ] All auth service unit tests pass
- [ ] All security tests pass (403 on unauthorized, 401 on expired, 429 on rate limit)
- [ ] `API.md` and `DATABASE.md` are complete for Sprint 2 scope
- [ ] `CHANGELOG.md` updated

---

### Sprint 3: RBAC, Team Formation & Core UI Shell

**Goal:** Students can create teams, invite members, and lock rosters. The React frontend has a working login flow, protected routes, role-based dashboard shells, and the dark/light theming foundation.

#### Backend Tasks

| ID | Task | Owner | Priority |
|----|------|-------|----------|
| S3-01 | Create **TeamService** (`/server/modules/teams/team.service.js`) with methods: `createTeam`, `inviteMember`, `acceptInvite`, `declineInvite`, `lockTeam`, `getTeamByUser`, `getTeamMembers` | Backend | Critical |
| S3-02 | Create **TeamController** and routes: `POST /api/teams`, `POST /api/teams/:id/invite`, `POST /api/teams/invites/:token/accept`, `POST /api/teams/invites/:token/decline`, `PATCH /api/teams/:id/lock`, `GET /api/teams/me` | Backend | Critical |
| S3-03 | Create **TeamInvite** model — stores email, token (UUID), teamId, status (pending/accepted/declined/expired), TTL index for expiry | Backend | Critical |
| S3-04 | Implement team capacity enforcement: max 4 members (1 leader + 3 invitees), reject invites if capacity reached | Backend | High |
| S3-05 | Implement team lock logic: once locked, no new invites can be sent; only Instructor can unlock | Backend | High |
| S3-06 | Create invite email template and dispatch via email service | Backend | High |
| S3-07 | Implement "orphaned student" invite — allow leaders to invite students not currently in any team | Backend | Medium |
| S3-08 | Input validation schemas for all team endpoints | Backend | High |
| S3-09 | Write unit tests for TeamService — create (happy path, already in team), invite (capacity full, duplicate invite, locked team), accept/decline (valid token, expired token, already used), lock (leader only, already locked) | Backend | High |
| S3-10 | Create initial **Profile** endpoints: `GET /api/users/me`, `PATCH /api/users/me` (update name, profile picture URL) | Backend | Medium |
| S3-11 | Set up BullMQ + Redis connection stub for future background jobs; create a basic notification queue with a test "welcome email" job | Backend | Medium |
| S3-12 | Create in-app **Notification** model — stores userId, type, title, message, read (boolean), createdAt | Backend | Medium |
| S3-13 | Create notification endpoints: `GET /api/notifications` (paginated), `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` | Backend | Medium |

#### Frontend Tasks

| ID | Task | Owner | Priority |
|----|------|-------|----------|
| S3-14 | Set up **React Router v6** with route structure: `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`, `/dashboard`, `/teams`, `/profile`, `/settings` | Frontend | Critical |
| S3-15 | Create **AuthContext** or Zustand auth store — holds user object, role, isAuthenticated, login/logout actions; persists auth state on page refresh via `/api/auth/refresh` call | Frontend | Critical |
| S3-16 | Create **ProtectedRoute** component — redirects unauthenticated users to `/login`, checks role for role-gated routes | Frontend | Critical |
| S3-17 | Create **ThemeProvider** — implements dark/light mode via CSS variable strategy: `.dark` class on `<html>`, defaults to OS `prefers-color-scheme`, persists explicit choice to `localStorage`, applies before first paint (inline script in `index.html`) | Frontend | Critical |
| S3-18 | Configure shadcn/ui `globals.css` with all semantic CSS variables for both `:root` (light) and `.dark` (dark) themes: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring` | Frontend | Critical |
| S3-19 | Install core shadcn/ui components: Button, Input, Label, Card, Dialog, DropdownMenu, Avatar, Badge, Toast/Sonner, Separator, Skeleton, Sheet (sidebar), Tabs | Frontend | Critical |
| S3-20 | Build **Login page** — email + password form using shadcn/ui Input/Button, Axios POST to `/api/auth/login`, stores JWT via cookie (automatic with `withCredentials: true`), redirects to `/dashboard` | Frontend | Critical |
| S3-21 | Build **Register page** — name, email, password, confirm password; calls `/api/auth/register`; redirects to OTP verification | Frontend | Critical |
| S3-22 | Build **OTP Verification page** — 6-digit input, countdown timer (10 min), resend option; calls `/api/auth/verify-otp` | Frontend | Critical |
| S3-23 | Build **Forgot Password** and **Reset Password** pages | Frontend | High |
| S3-24 | Build **Dashboard layout** — sidebar navigation (using Sheet or fixed sidebar), top navbar with user avatar + theme toggle + notification bell; main content area. Layout adapts based on `req.user.role` (different nav items per role) | Frontend | Critical |
| S3-25 | Build **Student Dashboard** shell — placeholder cards for: My Team, My Project, Submissions, Notifications, Progress | Frontend | High |
| S3-26 | Build **Adviser Dashboard** shell — placeholder cards for: Assigned Groups, Pending Reviews, Notifications | Frontend | High |
| S3-27 | Build **Panelist Dashboard** shell — placeholder cards for: Assigned Projects, Evaluations, Plagiarism Reports | Frontend | High |
| S3-28 | Build **Instructor Dashboard** shell — placeholder cards for: All Projects, User Management, Reports, Archive, System Settings | Frontend | High |
| S3-29 | Build **Team Management page** — create team form, invite members form (email input, max 3), pending invites list, team roster display, lock team button (leader only) | Frontend | High |
| S3-30 | Build **Accept/Decline Invite** page — accessed via email link with token; shows team info and accept/decline buttons | Frontend | High |
| S3-31 | Build **Profile page** — view/edit name, email (read-only), role (read-only), team info | Frontend | Medium |
| S3-32 | Build **Notification dropdown** (bell icon in navbar) — fetches recent unread notifications, mark-as-read on click | Frontend | Medium |
| S3-33 | Set up **Axios interceptor** — automatically includes `withCredentials: true` for cookies; intercepts 401 responses to attempt token refresh before redirecting to login; global error toast for 4xx/5xx responses | Frontend | Critical |
| S3-34 | Set up **React Query** defaults — `QueryClientProvider`, default `staleTime` of 5 minutes, retry logic (don't retry on 4xx), error boundary integration | Frontend | High |
| S3-35 | Apply `antialiased` to `<body>`; verify all shadcn/ui components render correctly in both dark and light mode; test status badge color pairs (Approved, Rejected, Locked, Submitted) in both modes | Frontend | High |
| S3-36 | Implement loading skeletons (shadcn/ui Skeleton) for dashboard cards and team page; implement empty states with helpful messages; implement error states with retry buttons | Frontend | Medium |

#### Sprint 3 Definition of Done
- [ ] End-to-end flow: Register → OTP → Login → see role-appropriate dashboard → Create Team → Invite Member → Accept Invite → Lock Team → Logout
- [ ] Unauthorized route access redirects to login; wrong-role access shows 403 page
- [ ] Dark/light toggle works, respects OS preference on first visit, persists after reload
- [ ] All shadcn/ui components render correctly in both themes
- [ ] Notification bell shows unread count; clicking a notification marks it read
- [ ] Loading, empty, and error states are present on all data-dependent views
- [ ] All backend unit tests pass (auth + team)
- [ ] All security tests pass
- [ ] `API.md`, `DATABASE.md` updated for team and notification endpoints
- [ ] `CHANGELOG.md` updated

---

### Sprint 4: Integration Testing, Polish & Handoff

**Goal:** System-wide integration tests, bug fixes from Sprint 1–3, documentation finalization, and explicit preparation for Phase 2.

#### Tasks

| ID | Task | Owner | Priority |
|----|------|-------|----------|
| S4-01 | Write **end-to-end integration tests** (using a test runner like Vitest or Jest + Supertest) covering the full auth lifecycle: register → verify → login → refresh → logout | QA/Backend | Critical |
| S4-02 | Write integration tests for team lifecycle: create → invite → accept → lock → attempt invite after lock (expect failure) | QA/Backend | Critical |
| S4-03 | Write **RBAC integration tests**: Student accessing Instructor endpoints (403), Panelist accessing Adviser endpoints (403), unauthenticated requests (401), expired tokens (401) | QA/Backend | Critical |
| S4-04 | Write **NoSQL injection tests**: `{ "$ne": null }` in email field on login, `{ "$gt": "" }` in OTP field — all must be rejected by validation middleware | QA/Backend | High |
| S4-05 | Write **rate limiting tests**: exceed login rate limit → expect 429; exceed OTP request limit → expect 429 | QA/Backend | High |
| S4-06 | Write **concurrency test**: two simultaneous team create requests from the same user → only one succeeds (relates to FR-14 pattern) | QA/Backend | Medium |
| S4-07 | Run `npm audit` on both `/client` and `/server`; resolve all high/critical vulnerabilities | Lead | High |
| S4-08 | Perform dark/light mode visual audit: every page, every component, every state (loading, empty, error, populated) in both themes; document and fix contrast issues | Frontend | High |
| S4-09 | Perform responsive design audit: test all pages at desktop (1440px, 1280px), tablet (768px) viewports; fix layout breaks | Frontend | Medium |
| S4-10 | Strip all `console.log` statements from production code; verify no secrets are logged | Lead | High |
| S4-11 | Finalize `ARCHITECTURE.md` — system architecture diagram (MERN overview), client-server communication flow, auth flow diagram, token lifecycle diagram | Docs | High |
| S4-12 | Finalize `API.md` — all Phase 1 endpoints with full request/response documentation | Docs | High |
| S4-13 | Finalize `DATABASE.md` — all Phase 1 schemas with field descriptions, indexes, relationships, example documents | Docs | High |
| S4-14 | Create `DEPLOYMENT.md` — environment setup instructions, required env vars, MongoDB Atlas setup, Redis setup for BullMQ | Docs | Medium |
| S4-15 | Update `CHANGELOG.md` with all Phase 1 additions under `[0.1.0]` | Docs | High |
| S4-16 | Create **Phase 2 backlog** — prioritized list of Phase 2 user stories (project creation, title submission, chapter uploads, cloud storage integration, plagiarism API) | Lead | High |
| S4-17 | **Code freeze.** Tag `v0.1.0`. Merge `develop` → `main`. | Lead | Critical |

#### Sprint 4 Definition of Done
- [ ] All integration tests pass (auth lifecycle, team lifecycle, RBAC, injection, rate limiting)
- [ ] `npm audit` reports zero high/critical vulnerabilities in both client and server
- [ ] Dark/light mode visual audit complete — no contrast failures, no broken components
- [ ] Responsive audit complete — no layout breaks at target viewports
- [ ] All documentation files (`README`, `ARCHITECTURE`, `API`, `DATABASE`, `CONTRIBUTING`, `DEPLOYMENT`, `CHANGELOG`) are current and complete for Phase 1 scope
- [ ] `v0.1.0` tag exists on `main`
- [ ] Phase 2 backlog is written and prioritized

---

## 5. Folder Structure (End of Phase 1)

```
CMS V2/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  ← shadcn/ui generated components
│   │   │   ├── layout/              ← Sidebar, Navbar, ThemeToggle, ProtectedRoute
│   │   │   ├── auth/                ← LoginForm, RegisterForm, OtpInput, ResetPasswordForm
│   │   │   ├── teams/               ← CreateTeamForm, InviteForm, TeamRoster, AcceptInvite
│   │   │   ├── notifications/       ← NotificationDropdown, NotificationItem
│   │   │   └── common/              ← LoadingState, EmptyState, ErrorState
│   │   ├── pages/
│   │   │   ├── auth/                ← LoginPage, RegisterPage, VerifyOtpPage, ForgotPasswordPage, ResetPasswordPage
│   │   │   ├── dashboard/           ← StudentDashboard, AdviserDashboard, PanelistDashboard, InstructorDashboard
│   │   │   ├── teams/               ← TeamPage, AcceptInvitePage
│   │   │   ├── profile/             ← ProfilePage
│   │   │   └── NotFoundPage.jsx
│   │   ├── hooks/                   ← useAuth, useTheme, useTeam, useNotifications
│   │   ├── stores/                  ← authStore.js (Zustand)
│   │   ├── services/                ← api.js (Axios instance), authApi.js, teamApi.js, notificationApi.js
│   │   ├── lib/                     ← utils.js (shadcn/ui cn() utility)
│   │   ├── styles/
│   │   │   └── globals.css          ← CSS variables (light + dark), Tailwind directives
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── router.jsx               ← React Router configuration
│   ├── index.html                    ← Includes inline theme script to prevent FOUC
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── server/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.validation.js    ← zod/joi schemas
│   │   │   ├── otp.model.js
│   │   │   └── refreshToken.model.js
│   │   ├── users/
│   │   │   ├── user.controller.js
│   │   │   ├── user.service.js
│   │   │   ├── user.routes.js
│   │   │   ├── user.validation.js
│   │   │   └── user.model.js
│   │   ├── teams/
│   │   │   ├── team.controller.js
│   │   │   ├── team.service.js
│   │   │   ├── team.routes.js
│   │   │   ├── team.validation.js
│   │   │   ├── team.model.js
│   │   │   └── teamInvite.model.js
│   │   └── notifications/
│   │       ├── notification.controller.js
│   │       ├── notification.service.js
│   │       ├── notification.routes.js
│   │       ├── notification.model.js
│   │       └── email.service.js       ← Abstracted email transport
│   ├── middleware/
│   │   ├── authenticate.js            ← JWT extraction + verification
│   │   ├── authorize.js               ← Role-based access check
│   │   ├── errorHandler.js            ← Global error handler
│   │   ├── validate.js                ← Generic validation middleware wrapper
│   │   └── rateLimiter.js             ← Rate limit configurations
│   ├── utils/
│   │   ├── AppError.js                ← Custom error class
│   │   ├── catchAsync.js              ← Async error wrapper
│   │   ├── generateToken.js           ← JWT + refresh token helpers
│   │   └── generateOtp.js             ← Cryptographic OTP generation
│   ├── config/
│   │   ├── db.js                      ← MongoDB connection
│   │   ├── redis.js                   ← Redis connection (BullMQ)
│   │   └── env.js                     ← Environment variable validation
│   ├── jobs/                           ← BullMQ job definitions (stub for Phase 1)
│   │   └── email.job.js
│   ├── app.js                          ← Express app setup (middleware, routes)
│   ├── server.js                       ← Server entry point
│   ├── package.json
│   └── .env.example
├── shared/
│   └── constants/
│       ├── roles.js                    ← STUDENT, ADVISER, PANELIST, INSTRUCTOR
│       └── statusCodes.js              ← Reusable HTTP status constants
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── CONTRIBUTING.md
│   ├── CHANGELOG.md
│   └── PHASE_1_STRATEGY.md            ← This document
├── reference/                          ← Design assets and project workspace doc
├── .eslintrc.cjs
├── .prettierrc
├── .editorconfig
├── .gitignore
├── .husky/
│   └── pre-commit
└── package.json                        ← Root workspace config (if using npm workspaces)
```

---

## 6. Database Collections (Phase 1)

### 6.1 `users`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `_id` | ObjectId | auto | |
| `name` | String | required, trimmed | |
| `email` | String | required, unique, lowercase | Unique index |
| `password` | String | required, min 8 chars | Hashed (bcrypt, 12 rounds) — never returned in API responses |
| `role` | String | enum: `student`, `adviser`, `panelist`, `instructor` | Default: `student` |
| `isVerified` | Boolean | default: `false` | Set to `true` after OTP verification |
| `isActive` | Boolean | default: `true` | Soft deactivation by Instructor |
| `teamId` | ObjectId | ref: `teams`, nullable | Set when student joins a team |
| `profilePicture` | String | nullable | URL to profile image |
| `lastLoginAt` | Date | nullable | Updated on each login |
| `createdAt` | Date | auto (timestamps) | |
| `updatedAt` | Date | auto (timestamps) | |

**Indexes:** `{ email: 1 }` (unique), `{ role: 1 }`, `{ teamId: 1 }`, compound `{ email: 1, role: 1 }`

### 6.2 `otps`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `_id` | ObjectId | auto | |
| `email` | String | required | |
| `code` | String | required, 6 digits | Hashed before storage |
| `type` | String | enum: `verification`, `password_reset` | |
| `expiresAt` | Date | required | TTL index: auto-deleted after 10 minutes |
| `createdAt` | Date | auto | |

**Indexes:** `{ expiresAt: 1 }` (TTL, expireAfterSeconds: 0), `{ email: 1, type: 1 }`

### 6.3 `refreshtokens`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `_id` | ObjectId | auto | |
| `userId` | ObjectId | ref: `users`, required | |
| `token` | String | required, unique | Hashed before storage |
| `expiresAt` | Date | required | 7-day expiry |
| `revokedAt` | Date | nullable | Set on logout or rotation |
| `replacedByToken` | String | nullable | Points to the rotated replacement token |
| `createdAt` | Date | auto | |

**Indexes:** `{ token: 1 }` (unique), `{ userId: 1 }`, `{ expiresAt: 1 }` (TTL)

### 6.4 `teams`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `_id` | ObjectId | auto | |
| `name` | String | required | Team display name |
| `leaderId` | ObjectId | ref: `users`, required | The student who created the team |
| `members` | [ObjectId] | ref: `users`, max 4 | Includes leader |
| `isLocked` | Boolean | default: `false` | Once locked, no new members |
| `academicYear` | String | required | e.g., `"2025-2026"` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ leaderId: 1 }`, `{ members: 1 }`, `{ academicYear: 1 }`

### 6.5 `teaminvites`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `_id` | ObjectId | auto | |
| `teamId` | ObjectId | ref: `teams`, required | |
| `email` | String | required | Invitee's email |
| `token` | String | required, unique | UUID for invite link |
| `status` | String | enum: `pending`, `accepted`, `declined`, `expired` | Default: `pending` |
| `expiresAt` | Date | required | 48-hour TTL |
| `createdAt` | Date | auto | |

**Indexes:** `{ token: 1 }` (unique), `{ teamId: 1 }`, `{ email: 1, teamId: 1 }`, `{ expiresAt: 1 }` (TTL)

### 6.6 `notifications`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `_id` | ObjectId | auto | |
| `userId` | ObjectId | ref: `users`, required | Recipient |
| `type` | String | enum: `team_invite`, `team_joined`, `team_locked`, `welcome`, `system` | Extensible in Phase 2+ |
| `title` | String | required | Short notification title |
| `message` | String | required | Notification body |
| `isRead` | Boolean | default: `false` | |
| `metadata` | Mixed | nullable | Additional context (e.g., `{ teamId, inviteToken }`) |
| `createdAt` | Date | auto | |

**Indexes:** `{ userId: 1, isRead: 1 }`, `{ userId: 1, createdAt: -1 }`

---

## 7. API Endpoints (Phase 1)

### Authentication (`/api/auth`)

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/api/auth/register` | None | 5/min | Register a new user (default role: student) |
| POST | `/api/auth/verify-otp` | None | 5/min | Verify 6-digit OTP to activate account |
| POST | `/api/auth/resend-otp` | None | 3/min | Resend OTP to email |
| POST | `/api/auth/login` | None | 5/min | Login, receive JWT in HTTP-only cookie |
| POST | `/api/auth/refresh` | Cookie | 10/min | Refresh access token using refresh token cookie |
| POST | `/api/auth/logout` | Bearer | — | Invalidate refresh tokens, clear cookies |
| POST | `/api/auth/forgot-password` | None | 3/min | Send password reset OTP to email |
| POST | `/api/auth/reset-password` | None | 5/min | Reset password using OTP |

### Users (`/api/users`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/users/me` | Bearer | All | Get current user profile |
| PATCH | `/api/users/me` | Bearer | All | Update own profile (name, picture) |
| GET | `/api/users` | Bearer | Instructor | List all users (paginated, filterable) |
| POST | `/api/users` | Bearer | Instructor | Create a new user account |
| PATCH | `/api/users/:id` | Bearer | Instructor | Edit user (name, role, active status) |
| PATCH | `/api/users/:id/role` | Bearer | Instructor | Assign/change user role |
| DELETE | `/api/users/:id` | Bearer | Instructor | Soft-delete user account |

### Teams (`/api/teams`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/api/teams` | Bearer | Student | Create a new team (caller becomes leader) |
| GET | `/api/teams/me` | Bearer | Student | Get current user's team (with members) |
| POST | `/api/teams/:id/invite` | Bearer | Student (leader) | Send invite email to a student |
| POST | `/api/teams/invites/:token/accept` | Bearer | Student | Accept a team invite |
| POST | `/api/teams/invites/:token/decline` | Bearer | Student | Decline a team invite |
| PATCH | `/api/teams/:id/lock` | Bearer | Student (leader) | Lock team roster |
| GET | `/api/teams` | Bearer | Instructor, Adviser | List all teams (paginated) |

### Notifications (`/api/notifications`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/notifications` | Bearer | All | Get user's notifications (paginated) |
| PATCH | `/api/notifications/:id/read` | Bearer | All | Mark one notification as read |
| PATCH | `/api/notifications/read-all` | Bearer | All | Mark all notifications as read |

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **OTP email delivery failures** (Mailtrap rate limits, SMTP misconfiguration) | Medium | High | Use a reliable transactional email service (SendGrid/Mailgun in staging). Implement retry logic in the email job queue. Add a "Resend OTP" button with its own rate limit. |
| **JWT cookie not sent cross-origin in development** (Vite on port 5173, Express on port 5000) | High | Medium | Configure Vite proxy (`vite.config.js` → `server.proxy`) to forward `/api` requests to Express. Alternatively, configure CORS with `credentials: true` and matching `SameSite=Lax` in dev. Document this in README. |
| **MongoDB Atlas connection latency** for first-time setup | Medium | Low | Provide a Docker Compose option with a local MongoDB container for development. Document both Atlas and local setup in DEPLOYMENT.md. |
| **Scope creep into Phase 2 features** during Sprint 3 | High | High | Strictly enforce: NO document upload, NO plagiarism integration, NO title submission in Phase 1. If a team member starts working on Phase 2 scope, immediately move the work to a `phase-2/` feature branch and redirect them back to Sprint 3 tasks. |
| **Theme inconsistency** — some components not tested in dark mode | Medium | Medium | Sprint 4 includes a mandatory dark/light visual audit. Create a "theme test page" that renders every shadcn/ui component used in the project in both modes for quick visual verification. |
| **Team member unavailability** (academic schedule conflicts) | Medium | High | Design sprint tasks so no task depends on a single team member. Pair program critical auth logic. All work must go through PRs so knowledge is shared. |

---

## 9. Definition of Done (Phase 1)

Phase 1 is complete when **all** of the following are true:

- [ ] **Auth lifecycle works end-to-end:** register → OTP → login → refresh → logout → password reset
- [ ] **RBAC enforced:** every protected endpoint rejects unauthorized roles with 403; unauthenticated requests get 401
- [ ] **Team lifecycle works end-to-end:** create → invite → accept → lock → attempt post-lock invite (rejection)
- [ ] **Security hardened:** rate limiting active, helmet active, CORS restricted, NoSQL injection tests passing, cookies HTTP-only + Secure + SameSite
- [ ] **Frontend fully functional:** login/register flow, OTP verification, role-based dashboard shells, team management page, dark/light mode, loading/empty/error states
- [ ] **Dark/light mode compliant:** all pages pass visual audit in both themes; no hardcoded colors; WCAG 2.1 AA contrast met
- [ ] **Test coverage adequate:** all service methods have unit tests; integration tests cover auth, team, RBAC, injection, rate limiting
- [ ] **Documentation current:** README, ARCHITECTURE, API, DATABASE, CONTRIBUTING, DEPLOYMENT, CHANGELOG all updated for Phase 1 scope
- [ ] **No console.log in production code**
- [ ] **npm audit clean:** zero high/critical vulnerabilities
- [ ] **Git tagged:** `v0.1.0` on `main`

---

## 10. Phase 1 → Phase 2 Handoff Checklist

Before starting Phase 2, confirm:

- [ ] All Phase 1 Definition of Done items are met
- [ ] Phase 2 backlog is written (project creation, title submission + Levenshtein similarity, chapter upload + cloud storage, plagiarism checker stub, adviser review tool)
- [ ] Cloud storage service account is created and credentials are in `.env.example` (AWS S3 or Google Cloud Storage)
- [ ] Copyleaks API account is registered and API key is documented in `.env.example`
- [ ] Google Docs API credentials are prepared for version control integration
- [ ] BullMQ + Redis is operational (tested with the Phase 1 email job stub)
- [ ] The team has reviewed the `.instructions.md` rules for Phase 2 scope (Rules 3, 4, 5 focus areas)

---

## Task Assignment Strategy (4-Person Team)

Based on the reference document's listed team members (Patrick Josh, Throylan, Steven Joe, Chijay), a recommended role assignment for Phase 1:

| Member | Primary Role | Sprint 1 Focus | Sprint 2 Focus | Sprint 3 Focus | Sprint 4 Focus |
|--------|-------------|----------------|----------------|----------------|----------------|
| **Member A (Lead/Full-Stack)** | Architecture & Integration | S1-01 to S1-07 (scaffolding, tooling, Git) | S2-05, S2-06, S2-07, S2-08 (token system) | S3-15, S3-33, S3-34 (auth store, Axios, React Query) | S4-07, S4-10, S4-16, S4-17 (audit, freeze, Phase 2 planning) |
| **Member B (Backend)** | Auth & Security | S1-08 to S1-13 (DB, models, indexes) | S2-01 to S2-04, S2-09 to S2-13 (auth service, middleware, validation) | S3-01 to S3-09 (team service, models, tests) | S4-01 to S4-06 (integration tests, injection tests) |
| **Member C (Frontend)** | UI & Theming | S1-04 (client init) | S2-16 (email service) | S3-14, S3-17 to S3-28 (routing, theming, all pages) | S4-08, S4-09 (visual audit, responsive audit) |
| **Member D (Frontend/Docs)** | UI Components & Docs | S1-14 to S1-17 (error handler, docs) | S2-17 to S2-22 (user management, docs) | S3-29 to S3-36 (team UI, notifications, states) | S4-11 to S4-15 (all documentation) |

> **Note:** These are recommended assignments. All members should participate in code reviews (PRs) for cross-knowledge. Critical auth logic (Sprint 2) should be pair-programmed between Members A and B.

---

## Summary

Phase 1 is purely **infrastructure + identity + access + team formation + UI shell + theming + tooling + documentation**. It contains zero capstone-specific workflow logic (no uploads, no plagiarism checks, no evaluations, no archiving). This is intentional — by isolating the foundation, Phase 2 development can move fast with confidence that authentication is secure, roles are enforced, the team system works, the UI framework is stable, and the codebase is clean and well-documented.

**When Phase 1 is done, every future feature is just adding a new module to an already-working system.**
