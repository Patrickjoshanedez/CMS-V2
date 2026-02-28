# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

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
