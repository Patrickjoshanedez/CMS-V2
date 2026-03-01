# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [0.8.0] — Sprint 12: Real-Time Notifications, UX Polish & Plagiarism Gate

### Added

**Server — Socket.IO Real-Time Notifications**
- `socket.service.js` — singleton Socket.IO server with JWT auth middleware, user-specific rooms (`user:<id>`), `emitToUser(userId, event, data)` helper
- Auth middleware parses `accessToken` from cookie header in WebSocket handshake
- `resetSocket()` for test-safe cleanup (io = null, `emitToUser` silently no-ops)
- Wired `emitToUser` across 8 notification sites in `project.service.js`, 7 in `submission.service.js`, 2 in `evaluation.service.js`, 1 in `plagiarism.job.js`, 3 in `team.service.js`

**Server — Adviser Email on Upload**
- `enqueueEmailJob` called when students upload chapters, proposals, final academic, and final journal papers
- Adviser receives email notification with project title, chapter info, and submission details

**Server — Plagiarism Clearance Gate**
- `MIN_ORIGINALITY_THRESHOLD = 75` constant in `project.service.js`
- `archiveProject` now requires both final papers (academic + journal) to have completed plagiarism checks with passing originality scores before archiving
- Gate checks: no check run → `PLAGIARISM_CHECK_PENDING`, still processing → `PLAGIARISM_CHECK_PENDING`, check failed → `PLAGIARISM_CHECK_FAILED`, score below 75% → `ORIGINALITY_BELOW_THRESHOLD`

**Server — Create Another Project Flow (S12-04)**
- `createProject` excludes REJECTED projects from the duplicate-team check (`projectStatus: { $ne: PROJECT_STATUSES.REJECTED }`)
- `getMyProject` uses dual-query: prefer active (non-rejected) project, fallback most-recent rejected
- Teams whose project was rejected can now create a fresh project

**Server — Tests (4 new, 285 total)**
- 4 plagiarism gate integration tests: pending check, failed check, below-threshold score, still-processing check
- Updated `createArchivedProject` helper with passing plagiarism results for backward compatibility
- All 285 tests passing (281 existing + 4 new)

**Client — Socket.IO Integration**
- `socket.js` service — singleton `connectSocket()`, `disconnectSocket()`, `getSocket()` with auto-reconnection
- `useSocket` hook — connects when authenticated, listens for `notification:new` events, triggers toast + invalidates React Query caches
- Integrated in `DashboardLayout` for app-wide real-time notifications
- `disconnectSocket()` called on logout in auth store
- Vite proxy config: `/socket.io` → `http://localhost:5000` with `ws: true`

**Client — Deadline Warning UI**
- `DeadlineWarning` component (~210 lines) with `computeUrgency()` function
- 5 urgency levels: `overdue` (red), `critical` (amber), `warning` (yellow), `safe` (green), `distant` (blue)
- Compact mode (inline badge) and full mode (detailed card with all deadlines)
- Integrated in `MyProjectPage`, `ProjectDetailPage`, `ProjectSubmissionsPage`

**Client — Rejected Project State**
- `RejectedProjectState` component in `MyProjectPage` — shows rejection reason + "Create Another Project" button
- Conditional render: REJECTED → RejectedProjectState, else → normal project view

### Changed
- Server upgraded from `app.listen()` to `http.createServer(app)` + `httpServer.listen()` for Socket.IO compatibility
- Notification polling intervals relaxed (60s refetch, 15s stale) since real-time push now handles instant delivery
- `createArchivedProject` test helper now includes passing plagiarism results

---

## [0.7.0] — Sprints 10–11: Phase Advancement, Defense Evaluation, Archiving & Dual Upload

### Added

**Server — Capstone Phase Advancement (Sprint 10)**
- `advancePhase` service method — advances projects from Capstone 1 → 2 → 3 → 4 with prerequisite validation (proposal approved before Cap 2, etc.)
- `PROTOTYPE_TYPES`, `PROTOTYPE_TYPE_VALUES`, `CAPSTONE_PHASES`, `CAPSTONE_PHASE_VALUES` shared constants
- Prototype showcasing: `addPrototype` (S3 upload for media, URL for links), `removePrototype`, `getPrototypes`
- Max 20 prototypes per project enforced
- `buildPrototypeKey()` in storage service
- MIME validation for prototype files (images, videos)
- Extended deadline schema: `chapter4`, `chapter5`, `defense` fields
- `phase_advanced` and `prototype_added` notification types

**Server — Defense Evaluation Module (Sprint 11)**
- `Evaluation` Mongoose model with defense types (proposal, mid-term, final), rubric criteria with weighted scoring, panelist-specific evaluations
- `EVALUATION_STATUSES` (draft, submitted, released), `DEFENSE_TYPES` (proposal, mid_term, final) shared constants
- `EvaluationService`: get/create evaluation, update draft, submit evaluation, release evaluations, list evaluations, get single evaluation
- `EvaluationController` with RESTful routes under `/api/evaluations`
- Release evaluations endpoint — instructor releases all panelist scores to students

**Server — Project Archiving & Dual Upload (Sprint 11)**
- `archiveProject` — transitions project to ARCHIVED status after validating both final papers exist
- Archive search with filters: year, topic, keyword (MongoDB text index)
- `canViewAcademic` flag — students see journal version only; faculty see full academic version
- Certificate upload: `POST /:id/certificate` — instructor uploads completion certificate (S3)
- Certificate retrieval: `GET /:id/certificate` — returns signed URL
- Reports: `GET /reports` — capstone counts grouped by academic year, filterable
- Bulk upload: `POST /archive/bulk` — instructor bulk-uploads legacy documents bypassing standard workflow
- Dual version upload endpoints: `POST /final-academic` and `POST /final-journal` for final paper submissions
- Both final uploads auto-enqueue plagiarism checks

**Server — Tests (95 new, 281 total)**
- 22 evaluation tests: get/create, update draft, submit, release, list, get single
- 23 sprint11-projects tests: archive, search archive, certificate upload/get, reports, bulk upload
- 14 dual-upload tests: final academic upload, final journal upload with validation
- 36 additional tests across projects, submissions, RBAC, and dashboard updates
- All 281 tests passing

**Client — Phase Advancement UI**
- "Advance Phase" button on `ProjectDetailPage` (instructor only)
- `WorkflowPhaseTracker` updated for multi-phase progression

**Client — Prototype Gallery**
- `PrototypeGallery` component — displays uploaded images, videos, and external links
- `PrototypeUploadForm` — media upload with drag-and-drop, URL input for links

**Client — Evaluation Components**
- Defense evaluation pages for panelists with rubric scoring interface
- Evaluation results view for students (only visible after release)

### Changed
- Project model extended with `prototypes` array, expanded deadline schema, and `isArchived`/`certificateUrl` fields
- Submission model extended with `final_academic` and `final_journal` types
- Shared constants package expanded with evaluation, defense, prototype, and capstone phase enums

---

## [0.6.0] — Sprint 9: Proposal Compilation, Frontend Polish & Phase 2 Close

### Added

**Server — Proposal Compilation Endpoint**
- `POST /api/submissions/:projectId/proposal` — compiles and uploads the full proposal document after Chapters 1–3 are individually approved and locked
- Validates all three chapters are locked before allowing compilation
- Creates a `type: 'proposal'` submission (chapter field is null)
- Auto-enqueues plagiarism check on upload
- Transitions project status from `active` → `proposal_submitted`
- Notifies assigned adviser via `proposal_submitted` notification

**Server — Proposal Approval Workflow**
- Reviewing a proposal submission with `decision: 'approve'` transitions the project from `proposal_submitted` → `proposal_approved`
- Integrated into existing `reviewSubmission` service method

**Server — Submission Model**
- Added `type` field: `{ type: String, enum: ['chapter', 'proposal'], default: 'chapter' }`
- `chapter` field now nullable (defaults to null for proposal submissions)

**Server — Notification Model**
- Added `proposal_submitted` to `NOTIFICATION_TYPES` enum

**Server — Tests (17 new, 188 total)**
- 11 proposal compilation integration tests: auth guard, non-member rejection, no file, MIME validation, chapters-not-locked guard, successful compilation (status/type/plagiarism/notification assertions), late submission remarks enforcement, adviser notification
- 6 proposal approval integration tests: approve → project status transition, reject keeps project status, revisions keep project status, non-proposal review unchanged, only faculty can review
- All 171 existing tests continue to pass (188 total)

**Client — Pages**
- `ProposalCompilationPage` (~460 lines) — file dropzone, chapter readiness checklist, late-submission remarks, upload progress, toast notifications
- `ForbiddenPage` — standalone 403 Access Denied page with ShieldAlert icon

**Client — Components**
- `WorkflowPhaseTracker` — horizontal stepper with 6 capstone phases (Team Formation → Final Defense), three visual states per step

**Client — Service & Hook**
- `compileProposal(projectId, formData, onUploadProgress)` — multipart/form-data POST with 120s timeout
- `useCompileProposal` React Query mutation hook

**Client — Routes**
- `/project/proposal` — lazy-loaded ProposalCompilationPage
- `/forbidden` — lazy-loaded ForbiddenPage

**Client — Toast Notification System**
- Installed `sonner` package
- Added `<Toaster richColors position="top-right" />` to App.jsx
- Integrated toast notifications across ALL page components:
  - `CreateProjectPage` — success/error on project creation
  - `MyProjectPage` — toast on 4 mutations (save, submit title, revise, request modification)
  - `ProjectDetailPage` — replaced all 7 `alert()` calls with `toast.error()`, added `toast.success()` for all 8 mutations (approve/reject title, resolve modification, assign/remove adviser/panelist, set deadlines, reject project)
  - `SubmissionDetailPage` — toast on 4 mutations (review, unlock, add/remove annotation)
  - `NotificationsPage` — toast on 4 mutations (mark read, mark all read, delete, clear all)
  - `ChapterUploadPage` — success/error on upload
  - `ProposalCompilationPage` — success/error on compile

**Client — UX Polish**
- Added retry buttons to error states in `DashboardPage`, `ProjectsPage`, `ProjectSubmissionsPage`
- Added empty state to `DashboardPage` when no data is available

**Documentation**
- `API.md` — new `POST /api/submissions/:projectId/proposal` endpoint with full request/response schemas and business rules
- `DATABASE.md` — updated Submissions collection with `type` field, nullable `chapter`, and proposal compilation business rules
- `CHANGELOG.md` — Sprint 9 release notes

### Changed
- Submission model `chapter` field is now nullable (null for proposals, 1–5 for chapters)
- `reviewSubmission` service method now handles proposal approval → project status transition

### Fixed
- `proposal_submitted` notification type was missing from Notification model enum — added to prevent validation errors during proposal compilation
- Replaced all browser `alert()` calls in `ProjectDetailPage` with proper toast notifications

---

## [0.5.0] — Sprint 8: Plagiarism Checker Integration (Async)

### Added

**Server — Plagiarism / Originality Engine**
- Three-tier originality engine in `plagiarism.service.js`: (1) Internal Jaccard 3-shingle similarity, (2) Copyleaks adapter placeholder, (3) Mock fallback (70–100% score)
- Named exports for `tokenize`, `jaccardSimilarity`, `buildShingles`, `compareAgainstCorpus`, `generateMockResult`, `checkOriginality`
- Text extraction utility (`extractText.js`) supporting PDF (pdf-parse), DOCX (mammoth), and TXT content types
- BullMQ plagiarism worker (`plagiarism.job.js`): S3 download → text extraction → corpus build → originality check → submission update → notification
- Synchronous fallback (`runPlagiarismCheckSync`) for test/dev environments without Redis
- BullMQ email worker (`email.job.js`) for async email dispatch
- Redis connection manager (`config/redis.js`) — skips Redis entirely in test mode
- Queue manager (`jobs/queue.js`) with deduplication (`plag-${submissionId}`) and graceful no-Redis fallback

**Server — Submission Model Extensions**
- `plagiarismResult` embedded subdocument: `status` (queued/processing/completed/failed), `score` (0–100), `checkedAt`, `matchedSources` (array of `{sourceId, title, matchPercentage}`)
- `extractedText` field (`select: false`) for corpus comparison
- Index on `plagiarismResult.status`

**Server — API**
- `GET /api/submissions/:submissionId/plagiarism` — returns plagiarism result for a submission (all authenticated roles)
- Chapter upload (`POST /chapters`) now auto-enqueues a plagiarism job and sets `plagiarismResult.status = 'queued'`
- `downloadFile(key)` added to storage service

**Server — Notifications**
- Added `plagiarism_complete` and `plagiarism_failed` notification types

**Server — Shared Constants**
- `PLAGIARISM_STATUSES` and `PLAGIARISM_STATUS_VALUES` exported from `@cms/shared`

**Server — Tests (39 new, 171 total)**
- `plagiarism.test.js`: 5 text extraction tests, 11 unit tests (tokenize, jaccardSimilarity, buildShingles), 9 service tests (compareAgainstCorpus, generateMockResult, checkOriginality), 5 plagiarism job tests (sync fallback), 6 API endpoint tests, 1 upload-triggers-enqueue integration test, 2 mock/fallback tests
- All 132 existing tests continue to pass (171 total)

**Client — Plagiarism Components**
- `OriginalityBadge` — colour-coded badge: green (≥80%), yellow (≥60%), red (<60%), plus queued/processing/failed states
- `PlagiarismReport` — detailed card with score ring, matched-sources table, loading skeleton, and all async states
- `plagiarismService.js` — API service for `GET /submissions/:id/plagiarism`
- `usePlagiarism.js` — React Query hook (`usePlagiarismResult`) with automatic polling while queued/processing, stops on completion

**Documentation**
- `API.md` — new `GET /api/submissions/:submissionId/plagiarism` endpoint documented
- `CHANGELOG.md` — Sprint 8 release notes

---

## [0.4.0] — Sprint 7: Live Dashboard & Notification Integration

### Added

**Server — Dashboard Module**
- `DashboardService` with role-aware aggregation: `_getStudentStats` (team info, project status, chapter progress Ch1–5), `_getInstructorStats` (system-wide counts, pending titles, recent submissions, projects by status), `_getAdviserStats` (assigned projects, pending reviews), `_getPanelistStats` (assigned projects)
- `DashboardController` — thin `catchAsync` handler returning `{ success, data }`
- Single RESTful endpoint: `GET /api/dashboard/stats` (authenticated, all roles)

**Server — Change Password Endpoint**
- `changePasswordSchema` Zod validation (currentPassword min 1, newPassword 8–128 + uppercase/lowercase/digit regex)
- `changePassword` service method — verifies current password, rejects reuse, updates password, revokes all refresh tokens
- `POST /api/auth/change-password` endpoint (authenticated)

**Server — Tests**
- 14 new integration tests: dashboard stats (8 tests covering auth guard, all 4 roles with data and empty states) + change password (6 tests covering auth guard, success, wrong password, reuse, weak password, missing fields)
- Total test count: 132 (118 existing + 14 new) — all passing

**Client — Dashboard**
- `useDashboard` hook — React Query with 30s staleTime, 60s refetchInterval
- `DashboardPage` (~380 lines) with shared `StatCard` and `StatusBadge` components, plus 4 role-specific sub-dashboards: `StudentDashboard`, `InstructorDashboard`, `AdviserDashboard`, `PanelistDashboard`
- Time-of-day greeting in dashboard header

**Client — Notifications**
- `useNotifications` hook — 6 exports: `useNotifications` (30s polling), `useUnreadCount` (30s polling), `useMarkAsRead`, `useMarkAllAsRead`, `useDeleteNotification`, `useClearAllNotifications`
- `NotificationsPage` full rewrite (~230 lines) — 26-type icon map, pagination, delete/clear actions, empty states
- Header bell icon with unread notification badge (red dot, 99+ cap)

**Client — Profile & Settings**
- `ProfilePage` — save wiring with `userService.updateMe`, loading/error/success states, auto-dismiss
- `SettingsPage` — `ChangePasswordForm` component with collapsed/expanded modes, 3 password inputs with eye toggles, client-side validation, calls `authService.changePassword()`

**Client — Services**
- `dashboardService` added to `authService.js` (getStats method)
- `authService.changePassword()` method

### Changed
- App version bumped from 0.1.0 to 0.4.0 in SettingsPage

### Fixed
- `dashboard.controller.js` — corrected `catchAsync` import path from `../../middleware/catchAsync.js` to `../../utils/catchAsync.js`

---

## [0.3.0] — Sprint 6: Cloud Storage, Document Upload & Versioning

### Added

**Server — Submission Module**
- `Submission` Mongoose model with chapter (1–5), versioning, file metadata, status lifecycle, annotations (embedded subdocuments), and review tracking
- Compound indexes: `{projectId, chapter, version}` (unique), `{status, createdAt}`, `{submittedBy, createdAt}`
- 10 Zod validation schemas: project/submission/chapter ID params, upload body, review body, unlock body, annotation body, list query
- `SubmissionService` class (10 methods): uploadChapter (auto-version), getSubmission, getSubmissionsByProject, getChapterHistory, getLatestChapterSubmission, getViewUrl, reviewSubmission (approve auto-locks), unlockSubmission, addAnnotation, removeAnnotation
- `SubmissionController` with 10 thin `catchAsync` handlers
- 10 RESTful API endpoints mounted at `/api/submissions` (student upload, faculty review/unlock/annotate, shared view/list/history)
- 8 new submission notification types added to notification model

**Server — Cloud Storage Integration**
- AWS S3 client configuration (`config/storage.js`) with region and credentials from environment
- `StorageService`: `buildKey()` for tenant-prefixed S3 keys (`projects/{id}/chapters/{ch}/v{n}/{file}`), `uploadFile()`, `getSignedUrl()` (15 min expiry), `deleteFile()`
- File upload middleware (`multer` memory storage, 25 MB limit, single file)
- Binary MIME-type validation middleware using `file-type` library (magic-byte inspection for PDF/DOCX, fallback for TXT)
- Environment variables added: `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `MAX_UPLOAD_SIZE_MB`

**Server — Tests**
- 31 integration tests for submissions: upload (8 tests), retrieval (5), review (5), unlock (3), annotations (4), edge cases & security (6)
- S3 operations fully mocked (upload, getSignedUrl, delete)
- Total test count: 118 (87 existing + 31 new submission tests) — all passing

**Client — Submission Service & Hooks**
- `submissionService.js` — API service layer with 10 methods (multipart upload with progress, CRUD, review, annotations)
- `useSubmissions.js` — React Query hooks: `submissionKeys` factory, 5 query hooks (`useSubmission`, `useProjectSubmissions`, `useChapterHistory`, `useLatestChapter`, `useViewUrl`), 5 mutation hooks (`useUploadChapter`, `useReviewSubmission`, `useUnlockSubmission`, `useAddAnnotation`, `useRemoveAnnotation`)

**Client — Submission Components**
- `SubmissionStatusBadge` — colour-coded badge mapping 6 submission statuses to badge variants (warning, info, success, destructive, secondary)

**Client — Submission Pages**
- `ChapterUploadPage` — file upload with styled dropzone, client-side MIME + size validation, chapter selector, progress bar, late-submission remarks, character counter
- `ProjectSubmissionsPage` — list view with chapter filter tabs, status badges, version/late indicators, empty state with upload CTA
- `SubmissionDetailPage` — full detail view with file metadata, document viewer (pre-signed URL), faculty review panel (approve/revisions/reject), unlock panel for locked submissions, annotations panel with add/remove

**Client — Routing**
- 3 new lazy-loaded routes: `/project/submissions`, `/project/submissions/upload`, `/project/submissions/:submissionId`

**Documentation**
- `API.md` — 10 new submission endpoints documented with request/response schemas
- `DATABASE.md` — Submissions collection schema, indexes, business rules, updated entity relationships
- `ARCHITECTURE.md` — Updated feature modules, cloud storage diagram, submission hooks docs, security table

---

## [0.2.0] — Sprint 5: Project Creation, Title Workflow & Assignment

### Added

**Server — Shared Constants**
- Title status constants (`TITLE_STATUSES`: DRAFT, SUBMITTED, APPROVED, REVISION_REQUIRED, PENDING_MODIFICATION)
- Project status constants (`PROJECT_STATUSES`: ACTIVE, PROPOSAL_SUBMITTED, PROPOSAL_APPROVED, REJECTED, ARCHIVED)
- Submission status constants (`SUBMISSION_STATUSES`: PENDING, UNDER_REVIEW, APPROVED, REVISIONS_REQUIRED, REJECTED, LOCKED)
- Barrel exports updated in `@cms/shared`

**Server — Project Module**
- `Project` Mongoose model with title, abstract, keywords, academic year, capstone phase, team reference, adviser/panelist assignments, deadlines, title modification request subdocument, rejection reason
- Indexes: titleStatus, adviserId, compound `{academicYear, projectStatus}`, text index on `{title, keywords}`
- 13 Zod validation schemas covering all project operations
- Title similarity utility (`levenshteinDistance`, `stringSimilarity`, `keywordOverlap`, `findSimilarProjects`) with weighted scoring (0.7 title + 0.3 keyword, threshold 0.65)
- `ProjectService` class (17 public methods + 2 private helpers): createProject, getProject, getMyProject, listProjects, updateTitle, submitTitle, approveTitle, rejectTitle, reviseAndResubmit, requestTitleModification, resolveTitleModification, assignAdviser, assignPanelist, removePanelist, selectAsPanelist, setDeadlines, rejectProject
- `ProjectController` with 17 thin `catchAsync` handlers
- 17 RESTful API endpoints mounted at `/api/projects` (6 student, 8 instructor, 1 panelist, 2 faculty-shared)
- 11 new notification types for project events (title submitted/approved/rejected/revision/modification, adviser assigned, panelist assigned/removed/selected, project rejected)
- 26 integration tests covering project creation, title workflow, adviser/panelist assignment, deadlines, rejection — all passing

**Client — Project Services & Hooks**
- `projectService` with 20 API methods in `authService.js`
- `useProjects.js` React Query hooks: `projectKeys` factory, 3 query hooks (`useMyProject`, `useProject`, `useProjects`), 14 mutation hooks with automatic cache invalidation

**Client — UI Components**
- `Badge` component (7 variants: default, secondary, destructive, outline, success, warning, info)
- `Textarea` component (shadcn/ui pattern with forwardRef)
- `TitleStatusBadge` — maps title statuses to colored badges
- `ProjectStatusBadge` — maps project statuses to colored badges

**Client — Project Pages**
- `CreateProjectPage` — student form with title (10-300 chars), abstract (0-500 with char count), keyword chip input (max 10), academic year (auto-default), similar project warnings
- `MyProjectPage` — comprehensive student dashboard with conditional sub-components: EditTitleForm (DRAFT), SubmittedCard (SUBMITTED), RequestModificationForm (APPROVED), ReviseAndResubmitForm (REVISION_REQUIRED), PendingModificationCard (PENDING_MODIFICATION)
- `ProjectsPage` — faculty project list with search, status filter buttons, pagination, card-based layout, role-based title
- `ProjectDetailPage` — faculty detail page with 7 sub-components: ProjectInfoPanel, TitleReviewCard (instructor approve/reject), ModificationReviewCard (instructor approve/deny), AssignAdviserCard (adviser dropdown), ManagePanelistsCard (add/remove, max 3), DeadlinesCard (chapter 1-3 + proposal dates), RejectProjectCard (2-step confirmation)

**Client — Navigation & Routing**
- 4 new lazy-loaded routes: `/project/create`, `/project`, `/projects`, `/projects/:id`
- Sidebar updated with project navigation for all 4 roles (student: My Project, faculty: Projects)

### Fixed
- `ThemeToggle` import across 3 files (AuthLayout, Header, SettingsPage) — changed named import to default import to match the component's `export default`

### Changed
- Phase 2 Strategy document (`docs/PHASE_2_STRATEGY.md`) added in prior release covering the complete Capstone 1 workflow
- Total test count: 87 (61 existing + 26 new project tests)

---

## [0.1.0] — 2025-01-15

### Added

**Server — Core Infrastructure**
- Express server with Mongoose (MongoDB) connection
- Environment configuration with validation (`config/env.js`)
- Centralized error handling (`AppError`, `catchAsync`, `errorHandler`)
- JWT token utilities with refresh token rotation and SHA-256 hashing
- OTP generation (6-digit, crypto-secure) with bcrypt hashing
- Rate limiting middleware (general, auth, OTP tiers)
- Request validation middleware using Zod schemas
- Authentication middleware (JWT from HTTP-only cookies)
- Role-based authorization middleware

**Server — Feature Modules**
- **Auth module:** register, login, verify OTP, resend OTP, refresh token, logout, forgot password, reset password
- **Users module:** get/update profile, list users (instructor), create/update/soft-delete users, change roles
- **Teams module:** create team, invite members (email + UUID token), accept/decline invites, lock team, list teams
- **Notifications module:** CRUD operations, mark as read, bulk operations, unread count

**Server — Models**
- User (bcrypt passwords, role enum, soft-delete via isActive)
- OTP (TTL index, bcrypt-hashed codes)
- RefreshToken (SHA-256 hashed, rotation with reuse detection)
- Team (max 4 members, leader, academic year, lock)
- TeamInvite (UUID token, 48h expiry, status tracking)
- Notification (typed, metadata, read tracking)

**Server — Services**
- Email service (Nodemailer, HTML templates for OTP and team invites)

**Client — Infrastructure**
- React 18 + Vite 6 scaffold with path alias (`@/`)
- Tailwind CSS 3.4 with `tw-` prefix and shadcn/ui-compatible theme
- Dark/light/system theme with CSS custom properties (HSL)
- Axios API layer with 401 refresh interceptor and request queuing
- Zustand auth store with full auth flow actions
- React Query client (5min stale, no retry on 4xx)
- React Router v6 with lazy-loaded routes

**Client — UI Components**
- Button (6 variants, 4 sizes)
- Input, Label
- Card (6 sub-components)
- Alert (4 variants with icons)
- ThemeProvider + ThemeToggle

**Client — Pages**
- Login (email/password, visibility toggle)
- Register (with password confirmation, redirects to OTP)
- Verify OTP (6-digit auto-advance, paste support, resend cooldown)
- Forgot Password (email form, auto-redirect to OTP)
- Reset Password (new password + confirm, with email/code from state)
- Dashboard (role-based cards for student/instructor/adviser/panelist)

**Client — Layout System**
- AuthLayout (centered card with branding)
- DashboardLayout (sidebar + header + content)
- Sidebar (role-based navigation, collapsible, mobile responsive)
- Header (user avatar, notifications, theme toggle)

**Shared Package (`@cms/shared`)**
- Role constants (STUDENT, ADVISER, PANELIST, INSTRUCTOR)
- HTTP status code constants

**Documentation**
- README with setup instructions
- Phase 1 Strategy document (4 sprints, risk register)
- Database schema documentation
- API reference (all endpoints)
- Architecture overview
- Contributing guidelines

**Configuration**
- npm workspaces monorepo (server, client, shared)
- ESLint + Prettier (root config)
- EditorConfig
- Git ignore rules
