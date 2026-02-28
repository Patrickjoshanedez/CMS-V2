# Phase 2 Strategy: Capstone 1 — Project Workflow & Document Management

> Last updated: 2025-07-03

---

## Table of Contents

1. [Phase 2 Goal](#1-phase-2-goal)
2. [Prerequisites — Phase 1 Completion Gaps](#2-prerequisites--phase-1-completion-gaps)
3. [Phase 2 Scope](#3-phase-2-scope)
4. [What Phase 2 Does NOT Include (Deferred to Phase 3+)](#4-what-phase-2-does-not-include-deferred-to-phase-3)
5. [Sprint Breakdown](#5-sprint-breakdown)
   - [Sprint 5: Project Creation, Title Submission & Adviser/Panelist Assignment](#sprint-5-project-creation-title-submission--adviserpanelist-assignment)
   - [Sprint 6: Cloud Storage, Document Upload & Versioning](#sprint-6-cloud-storage-document-upload--versioning)
   - [Sprint 7: Review Workflow, Document Locking & Notifications](#sprint-7-review-workflow-document-locking--notifications)
   - [Sprint 8: Plagiarism Checker Integration (Async)](#sprint-8-plagiarism-checker-integration-async)
   - [Sprint 9: Proposal Compilation, Frontend Pages & Integration Testing](#sprint-9-proposal-compilation-frontend-pages--integration-testing)
6. [New Database Collections](#6-new-database-collections)
7. [New API Endpoints](#7-new-api-endpoints)
8. [Folder Structure (End of Phase 2)](#8-folder-structure-end-of-phase-2)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Risk Register](#10-risk-register)
11. [Definition of Done (Phase 2)](#11-definition-of-done-phase-2)
12. [Phase 2 → Phase 3 Handoff Checklist](#12-phase-2--phase-3-handoff-checklist)
13. [Summary](#13-summary)

---

## 1. Phase 2 Goal

**Implement the complete Capstone 1 (Preliminaries & Proposal Phase) workflow** — from project creation through title approval, individual chapter uploads with cloud storage, adviser review with annotations, plagiarism/originality checking, document locking, and final proposal compilation.

Phase 2 transforms the CMS from a user/team management shell into a **functional capstone workflow system** where:

- Teams create projects and submit titles for approval
- The system detects duplicate/similar titles automatically
- Panelists can view and select groups to handle
- Advisers are assigned to teams and receive upload notifications
- Students upload Chapters 1–3 individually to cloud storage
- Each upload triggers an asynchronous plagiarism/originality check
- Advisers review documents and provide feedback (highlight & comment)
- Approved chapters are locked; students must request unlocks
- Late submissions require mandatory remarks
- Once all chapters are approved, teams compile and submit the full proposal

### Mapping to `.instructions.md` Rules

| Rule | Phase 2 Focus Areas |
| ------ | ------------------- |
| **Rule 1 (Architecture)** | New feature modules (`/modules/projects`, `/modules/submissions`, `/modules/plagiarism`), service layer for all business logic, cloud storage config |
| **Rule 2 (Security)** | MIME-type validation (magic bytes), secure cloud storage (pre-signed URLs), file-type allowlist, document locking enforcement server-side |
| **Rule 3 (Data Management)** | Cloud storage for binaries, metadata in MongoDB, versioning, signed URLs with expiration, deadline enforcement |
| **Rule 4 (UX)** | Phased workflow UI, status indicators, adviser review tools, late submission remarks, loading/empty/error states for all new pages |
| **Rule 5 (Scalability)** | BullMQ background jobs for plagiarism checks, email notifications on upload/approval/rejection, async processing with status polling |
| **Rule 6 (Team Standards)** | Feature branches for each sprint, conventional commits, PR reviews, incremental refactoring |
| **Rule 7 (Documentation)** | API.md, DATABASE.md, ARCHITECTURE.md updated every sprint, CHANGELOG.md maintained |

---

## 2. Prerequisites — Phase 1 Completion Gaps

Before Phase 2 development begins, the following Phase 1 gaps must be closed:

### 2A. Sprint 4 Tasks (Not Yet Completed)

Phase 1's Sprint 4 (Integration Testing, Polish & Handoff) was defined but not executed. The following must be completed first:

| ID | Task | Priority |
| ---- | ------ | ---------- |
| S4-GAP-01 | Run `npm install` in root (workspace) to install all dependencies | Critical |
| S4-GAP-02 | Create `.env` from `.env.example` for local development | Critical |
| S4-GAP-03 | Verify server starts and connects to MongoDB | Critical |
| S4-GAP-04 | Verify client dev server starts and renders the login page | Critical |
| S4-GAP-05 | Test full auth flow end-to-end: register → OTP → login → refresh → logout | Critical |
| S4-GAP-06 | Test team flow end-to-end: create → invite → accept → lock | Critical |
| S4-GAP-07 | Run `npm audit` and resolve high/critical vulnerabilities | High |
| S4-GAP-08 | Dark/light mode visual audit on all existing pages | High |
| S4-GAP-09 | Create missing client pages: Teams page, Profile page, Settings page, Notifications page, 404 page | High |
| S4-GAP-10 | Move `@hookform/resolvers` and `zod` from client devDependencies to dependencies (runtime usage) | Medium |
| S4-GAP-11 | Install Husky + lint-staged for pre-commit hooks | Medium |
| S4-GAP-12 | Write integration tests for auth and team lifecycles | High |
| S4-GAP-13 | Write RBAC security tests (403/401 assertions) | High |
| S4-GAP-14 | Create `docs/DEPLOYMENT.md` | Medium |
| S4-GAP-15 | Tag `v0.1.0` on `main` branch | Medium |

> **Estimate:** 1 sprint (1–2 weeks) to close all gaps before Phase 2 sprints begin.

### 2B. External Account Setup

| Service | Purpose | Action Required |
| --------- | --------- | ---------------- |
| **AWS S3** (or Cloudinary / Google Cloud Storage) | Cloud storage for uploaded documents | Create bucket, IAM credentials, configure CORS for signed URL uploads |
| **Copyleaks API** | Plagiarism/originality checking | Register account, obtain API key & sandbox credentials |
| **Redis** | BullMQ job queue for async plagiarism jobs and email queue | Install Redis locally or configure a cloud Redis instance |
| **Transactional Email** (SendGrid / Mailgun / AWS SES) | Production email delivery | Register and configure SMTP credentials (Mailtrap for dev is already stubbed) |

---

## 3. Phase 2 Scope

### Included in Phase 2

| Feature | Description | Rule Ref |
| --------- | ------------- | ---------- |
| **Project Creation** | Teams create a capstone project linked to their team, academic year, and capstone phase (1–4) | Rule 4 |
| **Title Submission & Similarity Check** | System cross-references existing titles using Levenshtein distance + MongoDB text search; alerts team if >70% similarity detected | Rule 4, CMS Guidelines §2 |
| **Title Approval Workflow** | Instructor reviews submitted titles; approves or requests revision; approved titles become read-only unless formal modification request is submitted | Rule 2 (document locking) |
| **Adviser Assignment** | Instructor assigns an adviser to a team; adviser sees assigned groups in their dashboard | CMS Guidelines §2 |
| **Panelist Topic Selection** | Panelists have a dashboard to view drafted topics/chapters and select groups they will handle | CMS Guidelines §2 |
| **Chapter Upload (1–3)** | Individual chapter upload to cloud storage (S3); MIME-type validation via magic bytes; file size limits; metadata stored in MongoDB | Rules 2B, 3 |
| **Document Versioning** | Every re-upload creates a new version; previous versions retained and accessible to advisers/instructors | Rule 3 |
| **Pre-Signed URL Access** | Documents are never served directly; temporary signed URLs generated on-demand for authorized viewers | Rule 3 |
| **Plagiarism/Originality Check** | Upload triggers async BullMQ job → Copyleaks API → stores originality percentage in submission record → notifies student | Rule 5 |
| **Adviser Review & Annotation** | Adviser opens submitted document in-system; can highlight text and leave comments per-highlight; comments stored as annotations linked to submission version | CMS Guidelines §2, Rule 4 |
| **Submission Status Workflow** | Each chapter tracks status: `pending` → `under_review` → `approved` / `revisions_required` / `rejected`; status transitions are server-enforced | Rule 4 |
| **Document Locking** | Approved chapters are locked by default; students must submit "Unlock Request" to adviser; lock enforced server-side | Rule 2A |
| **Unlock Request Workflow** | Student requests unlock → Adviser receives notification → approves/denies → chapter unlocked or remains locked | CMS Guidelines §4 |
| **Late Submission Handling** | If past deadline, backend rejects upload unless `remarks` field is provided; UI prompts mandatory remarks | Rule 3, CMS Guidelines §2 |
| **Deadline Management** | Instructor sets deadlines per chapter/phase; system tracks and displays countdown; visual warnings as deadline approaches | Rule 4 |
| **Upload Notifications** | Adviser notified when student uploads a chapter; student notified when adviser reviews/approves/rejects | Rule 5 |
| **Full Proposal Compilation** | Once Chapters 1, 2, 3 are all approved, team can submit the unified final proposal document | CMS Guidelines §2 |
| **Title Modification Request** | Editing an approved title requires formal request to Instructor; title shows "Pending Modification" until approved | CMS Guidelines §2 |
| **Project Rejection & Restart** | If project is completely rejected, "Create Another Project" resets the workflow from the beginning | CMS Guidelines §2 |

---

## 4. What Phase 2 Does NOT Include (Deferred to Phase 3+)

| Feature | Deferred To | Reason |
| --------- | ------------ | -------- |
| Capstone 2 & 3 development/implementation workflow | Phase 3 | Requires Capstone 1 workflow to be stable first |
| Prototype showcasing (images, videos, web links) | Phase 3 | Capstone 2 & 3 feature |
| Capstone 4 final defense & archiving | Phase 4 | End-of-lifecycle feature |
| Dual version upload (Academic + Journal) | Phase 4 | Final submission feature |
| Archive search with year/topic/keyword filters | Phase 4 | Requires archive data to exist |
| Split-screen document comparison UI | Phase 3 | Complex UI; adviser review tool covers Phase 2 needs |
| Defense evaluation and grading | Phase 3/4 | Capstone 2+ feature |
| Certificate generation | Phase 4 | Post-defense feature |
| Bulk upload by Instructor (legacy documents) | Phase 4 | Archive feature |
| Instructor reporting (by author, title, year) | Phase 4 | Requires aggregated data |
| WebSocket real-time notifications | Phase 3 | Phase 2 uses polling; WebSocket upgrade in Phase 3 |
| Google Docs API integration | Phase 3 | Deferred for complexity management |

---

## 5. Sprint Breakdown

---

### Sprint 5: Project Creation, Title Submission & Adviser/Panelist Assignment

**Goal:** Teams can create capstone projects, submit titles for review, and the system detects similar titles. Instructors assign advisers and panelists to teams. Panelists can view and select groups.

**Duration:** 2 weeks

#### Backend Tasks

| ID | Task | Owner | Priority |
| ---- | ------ | ------- | ---------- |
| S5-01 | Create **Project** Mongoose model (`/server/modules/projects/project.model.js`) — fields: teamId, title, abstract, keywords, academicYear, capstonePhase, titleStatus, projectStatus, adviserId, panelistIds, deadlines, remarks | Backend | Critical |
| S5-02 | Create **ProjectService** (`/server/modules/projects/project.service.js`) with methods: `createProject`, `submitTitle`, `getProjectByTeam`, `getProjectById`, `updateProject`, `approveTitle`, `rejectTitle`, `requestTitleModification`, `approveTitleModification`, `assignAdviser`, `assignPanelist`, `removePanelist`, `rejectProject` | Backend | Critical |
| S5-03 | Create **ProjectController** and **project.routes.js** — RESTful endpoints for all project operations | Backend | Critical |
| S5-04 | Create **project.validation.js** — Zod schemas for all project endpoints (title min 10 chars, abstract max 500 chars, keywords array max 10, etc.) | Backend | High |
| S5-05 | Implement **title similarity check** — when a title is submitted, compare against all existing project titles using: (a) MongoDB text search for keyword overlap, (b) Levenshtein distance algorithm for string similarity; return similarity percentage and list of similar titles if >70% match | Backend | Critical |
| S5-06 | Create **Levenshtein distance utility** (`/server/utils/levenshtein.js`) — pure function, unit-testable, normalized to 0–100% | Backend | High |
| S5-07 | Implement **title status workflow** — `draft` → `submitted` → `approved` / `revision_required` → (if modification) `pending_modification` → `approved` | Backend | Critical |
| S5-08 | Implement **adviser assignment** — Instructor assigns an adviser (userId with role=adviser) to a project; validation: adviser must exist, must have adviser role | Backend | High |
| S5-09 | Implement **panelist assignment** — Instructor assigns panelists to a project; panelists can also self-select from available projects (unless project already has max panelists) | Backend | High |
| S5-10 | Implement **panelist self-selection** — panelist can view all projects with `titleStatus=approved` and select groups to handle; enforce max panelists per project (configurable, default 3) | Backend | High |
| S5-11 | Implement **title modification request** — student submits a formal modification request; title status changes to `pending_modification`; Instructor approves/denies | Backend | Medium |
| S5-12 | Implement **project rejection & restart** — Instructor can reject entire project; status becomes `rejected`; team can create a new project (old one archived in `rejected` state) | Backend | Medium |
| S5-13 | Create **Deadline** embedded schema within Project — stores per-chapter deadlines set by Instructor; used by submission logic to detect late submissions | Backend | High |
| S5-14 | Trigger notifications: title submitted (→ Instructor), title approved/rejected (→ team), adviser assigned (→ adviser + team), panelist assigned (→ panelist + team) | Backend | High |
| S5-15 | Write unit tests for ProjectService — create (happy path, team already has project, team not locked), title similarity (exact match, partial match, no match), approval workflow, adviser assignment, panelist self-selection | Backend | High |
| S5-16 | Write unit tests for Levenshtein utility — exact match (100%), no similarity (0%), partial matches, empty strings, case insensitivity | Backend | High |

#### Frontend Tasks

| ID | Task | Owner | Priority |
| ---- | ------ | ------- | ---------- |
| S5-17 | Build **Create Project page** — form with title, abstract, keywords input (tag input), academic year selector; shows similarity warning if duplicates detected; submit button | Frontend | Critical |
| S5-18 | Build **Project Dashboard** component — displays project title, status badge, assigned adviser/panelists, chapter submission status, deadlines | Frontend | Critical |
| S5-19 | Build **Title Submission Alert** — when similarity >70%, show dialog listing similar titles with percentages; allow student to proceed or revise | Frontend | High |
| S5-20 | Build **Instructor: Project Management page** — list all projects with filters (status, academic year, adviser); bulk title approval actions; assign adviser/panelist dropdowns | Frontend | High |
| S5-21 | Build **Adviser Dashboard: Assigned Groups** — list of teams assigned to adviser with project status, latest submission status, action buttons | Frontend | High |
| S5-22 | Build **Panelist Dashboard: Available Projects** — list of approved projects panelists can select; "Select Group" button; list of already-selected groups | Frontend | High |
| S5-23 | Build **Title Modification Request** UI — modal/form for student to request title change with justification; shows current title and proposed new title | Frontend | Medium |
| S5-24 | Update **Student Dashboard** — replace placeholder cards with real project status, team info, title status, submission overview | Frontend | High |
| S5-25 | Add project-related API service wrappers (`/client/src/services/projectService.js`) and React Query hooks | Frontend | High |
| S5-26 | Add new shadcn/ui components needed: Dialog, Badge, Tabs, Select, Textarea, Toast/Sonner, Table, DropdownMenu, Separator, Tooltip | Frontend | High |

#### Documentation

| ID | Task | Priority |
| ---- | ------ | ---------- |
| S5-27 | Update `API.md` with all project endpoints | High |
| S5-28 | Update `DATABASE.md` with Project schema | High |
| S5-29 | Update `CHANGELOG.md` | High |

#### Sprint 5 Definition of Done

- [ ] Teams can create a project, submit a title, and see similarity warnings
- [ ] Instructors can approve/reject titles and assign advisers/panelists
- [ ] Panelists can view available projects and self-select groups
- [ ] Title modification request workflow works end-to-end
- [ ] Project rejection creates a clean "restart" path for the team
- [ ] Notifications sent for all title/assignment events
- [ ] All unit tests pass (ProjectService, Levenshtein utility)
- [ ] API.md and DATABASE.md updated
- [ ] CHANGELOG.md updated

---

### Sprint 6: Cloud Storage, Document Upload & Versioning

**Goal:** Students can upload chapter documents (PDF, DOCX) to cloud storage. Files are validated for MIME type and size. Each upload creates a versioned submission record. Authorized users retrieve documents via pre-signed URLs.

**Duration:** 2 weeks

#### Backend Tasks

| ID | Task | Owner | Priority |
| ---- | ------ | ------- | ---------- |
| S6-01 | Configure **AWS S3** (or compatible service) — create bucket, set CORS policy, configure IAM role with minimal permissions (PutObject, GetObject, DeleteObject) | DevOps | Critical |
| S6-02 | Create **storage config** (`/server/config/storage.js`) — S3 client initialization, bucket name, region; abstracted behind a `StorageService` interface so provider can be swapped | Backend | Critical |
| S6-03 | Create **StorageService** (`/server/services/storage.service.js`) with methods: `uploadFile(buffer, key, contentType)`, `getSignedUrl(key, expiresIn)`, `deleteFile(key)` — single file for all S3 interaction; provider-agnostic interface | Backend | Critical |
| S6-04 | Create **Submission** Mongoose model (`/server/modules/submissions/submission.model.js`) — fields: projectId, chapter (1-5), version, fileName, fileType, fileSize, storageKey, status, originalityScore, submittedBy, remarks, deadline, isLate, annotations[], createdAt | Backend | Critical |
| S6-05 | Create **SubmissionService** (`/server/modules/submissions/submission.service.js`) with methods: `uploadChapter`, `getSubmission`, `getChapterHistory`, `getLatestChapterSubmission`, `getSubmissionsByProject`, `getSignedViewUrl` | Backend | Critical |
| S6-06 | Create **SubmissionController** and **submission.routes.js** — upload endpoint uses multer with memory storage (buffer); controller validates then delegates to service | Backend | Critical |
| S6-07 | Create **submission.validation.js** — Zod schemas: chapter (1-5), file required, remarks (required if late) | Backend | High |
| S6-08 | Implement **MIME-type validation middleware** (`/server/middleware/fileValidation.js`) — use `file-type` npm package to inspect binary magic bytes; reject if actual type doesn't match allowlist (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`); do NOT trust file extension | Backend | Critical |
| S6-09 | Implement **file size validation** — max 25MB per upload; configurable via env var `MAX_UPLOAD_SIZE_MB` | Backend | High |
| S6-10 | Implement **document versioning** — on re-upload of the same chapter, auto-increment version number; previous versions retained and queryable by advisers/instructors | Backend | Critical |
| S6-11 | Implement **pre-signed URL generation** — when an authorized user requests to view a document, server generates a temporary pre-signed S3 URL (5-minute expiry by default); URL is never cached or stored permanently | Backend | Critical |
| S6-12 | Implement **late submission detection** — compare `submittedAt` against project deadline for that chapter; if late, require `remarks` field; flag `isLate: true` on submission record | Backend | High |
| S6-13 | Implement **upload authorization** — only team members can upload to their project's submissions; only for chapters whose status is not `locked` or `approved` (unless unlocked) | Backend | High |
| S6-14 | Implement **view authorization** — Students can view their own team's submissions; Advisers can view assigned teams' submissions; Panelists can view assigned projects' submissions; Instructors can view all | Backend | High |
| S6-15 | S3 key naming convention: `projects/{projectId}/chapters/{chapterNum}/v{version}/{originalFileName}` | Backend | Medium |
| S6-16 | Trigger notifications: chapter uploaded (→ adviser), new version uploaded (→ adviser) | Backend | High |
| S6-17 | Write unit tests for StorageService (mock S3), SubmissionService (upload, versioning, late detection, authorization) | Backend | High |
| S6-18 | Write unit tests for MIME-type validation middleware — valid PDF, valid DOCX, disguised EXE with .pdf extension (reject), oversized file (reject) | Backend | High |

#### Frontend Tasks

| ID | Task | Owner | Priority |
| ---- | ------ | ------- | ---------- |
| S6-19 | Build **Chapter Upload** component — file dropzone (drag-and-drop + click), shows accepted file types, file size limit, upload progress bar, preview of selected file name/size before submission | Frontend | Critical |
| S6-20 | Build **Chapter Submission Page** — per-chapter section showing: current status, latest version info, submission history (version list with dates and scores), upload button (if eligible), remarks textarea (shows only if past deadline) | Frontend | Critical |
| S6-21 | Build **Submission History** component — expandable list of all versions for a chapter; each row shows version number, date, originality score (or "Processing..."), status badge | Frontend | High |
| S6-22 | Build **Document Viewer** component — embeds PDF viewer (react-pdf or iframe with signed URL); white "paper" background even in dark mode; dimmed brightness filter in dark mode per Rule 4C | Frontend | High |
| S6-23 | Build **Version Comparison** selector — dropdown to select which version to view; adviser can toggle between versions | Frontend | Medium |
| S6-24 | Add new shadcn/ui components: Progress, Skeleton (for upload), ScrollArea, Sheet (for document viewer side panel) | Frontend | Medium |
| S6-25 | Add submission API service wrappers and React Query hooks with `useMutation` for uploads and `useQuery` for submissions | Frontend | High |
| S6-26 | Handle upload errors gracefully: MIME type rejected → "Invalid file type", size exceeded → "File too large", network error → retry option, late submission → remarks required notice | Frontend | High |

#### Documentation

| ID | Task | Priority |
| ---- | ------ | ---------- |
| S6-27 | Update `API.md` with submission endpoints (upload, get, signed URL) | High |
| S6-28 | Update `DATABASE.md` with Submission schema | High |
| S6-29 | Update `ARCHITECTURE.md` with cloud storage architecture and signed URL flow | High |
| S6-30 | Update `CHANGELOG.md` | High |

#### Sprint 6 Definition of Done

- [ ] Students can upload PDF/DOCX files for Chapters 1–3
- [ ] Uploads are stored in S3 with tenant-prefixed keys
- [ ] MIME-type validation rejects disguised files (magic byte check)
- [ ] File size limit enforced (25MB)
- [ ] Document versions auto-increment; history is queryable
- [ ] Pre-signed URLs generated for authorized document viewing
- [ ] Late submissions are flagged and require remarks
- [ ] Upload authorization enforced (team members only, unlocked chapters only)
- [ ] View authorization enforced (role-based access)
- [ ] Document viewer renders PDFs with white "paper" background in dark mode
- [ ] All unit tests pass (StorageService, SubmissionService, file validation)
- [ ] Documentation updated

---

### Sprint 7: Review Workflow, Document Locking & Notifications

**Goal:** Advisers can review submissions, leave annotated comments, approve/reject chapters, and manage document locks. The complete submission status lifecycle is enforced.

**Duration:** 2 weeks

#### Backend Tasks

| ID | Task | Owner | Priority |
| ---- | ------ | ------- | ---------- |
| S7-01 | Create **Annotation** embedded schema within Submission — `{ text, highlightRange: { start, end, pageNumber }, comment, createdBy, createdAt }` — stores adviser highlights and comments linked to a specific submission version | Backend | Critical |
| S7-02 | Create **ReviewService** (`/server/modules/submissions/review.service.js`) with methods: `addAnnotation`, `getAnnotations`, `updateSubmissionStatus`, `approveChapter`, `rejectChapter`, `requestRevisions` | Backend | Critical |
| S7-03 | Create **Review endpoints** in `submission.routes.js`: `POST /api/submissions/:id/annotations` (add annotation), `GET /api/submissions/:id/annotations`, `PATCH /api/submissions/:id/status` (approve/reject/request-revisions) | Backend | Critical |
| S7-04 | Implement **status transition enforcement** — strict state machine: `pending` → `under_review` (when adviser opens), `under_review` → `approved` / `revisions_required` / `rejected`; `revisions_required` → `pending` (on re-upload); `approved` → `locked` (automatic); only valid transitions allowed | Backend | Critical |
| S7-05 | Create **UnlockRequest** model (`/server/modules/submissions/unlockRequest.model.js`) — fields: submissionId, requestedBy, reason, status (pending/approved/denied), reviewedBy, reviewedAt | Backend | Critical |
| S7-06 | Create **UnlockRequestService** with methods: `createRequest`, `approveRequest`, `denyRequest`, `getRequestsByAdviser`, `getRequestsByProject` | Backend | Critical |
| S7-07 | Create **unlock request endpoints**: `POST /api/submissions/:id/unlock-request`, `GET /api/unlock-requests` (adviser), `PATCH /api/unlock-requests/:id` (approve/deny) | Backend | Critical |
| S7-08 | Implement **document locking logic** — when chapter status becomes `approved`, set `isLocked: true`; reject any upload attempts to locked chapters; unlock only via approved UnlockRequest | Backend | Critical |
| S7-09 | Implement **chapter-level status aggregation** on Project — computed virtual/method that checks all chapter submissions and returns overall project proposal status (`incomplete`, `all_chapters_submitted`, `all_chapters_approved`, `proposal_ready`) | Backend | High |
| S7-10 | Enhance notification triggers: submission status changed (→ student), annotation added (→ student), unlock request created (→ adviser), unlock request resolved (→ student), all chapters approved (→ team + adviser) | Backend | High |
| S7-11 | Write unit tests for ReviewService — add annotation (happy path, unauthorized adviser), status transitions (valid and invalid), approve/reject flows | Backend | High |
| S7-12 | Write unit tests for UnlockRequestService — create (happy path, chapter not locked), approve (unlocks chapter), deny (chapter stays locked) | Backend | High |
| S7-13 | Write unit tests for document locking — upload to locked chapter (reject), upload after unlock (accept), re-lock after approval | Backend | High |

#### Frontend Tasks

| ID | Task | Owner | Priority |
| ---- | ------ | ------- | ---------- |
| S7-14 | Build **Adviser Review Page** — split view: document viewer on left, annotations panel on right; highlight text in PDF → comment form appears → save annotation | Frontend | Critical |
| S7-15 | Build **Annotation Overlay** component — renders highlight rectangles on the PDF viewer at the correct positions; click a highlight to see the comment | Frontend | Critical |
| S7-16 | Build **Review Actions Bar** — buttons for: "Request Revisions", "Approve Chapter", "Reject Chapter"; confirmation dialogs with optional comment | Frontend | High |
| S7-17 | Build **Submission Status Timeline** component — visual timeline showing all status transitions for a chapter (pending → under review → approved, etc.) with dates | Frontend | High |
| S7-18 | Build **Unlock Request** UI — student sees "Request Unlock" button on locked chapters; form with reason textarea; shows request status (pending/approved/denied) | Frontend | High |
| S7-19 | Build **Adviser Unlock Requests** page — list of pending unlock requests with approve/deny actions | Frontend | High |
| S7-20 | Build **Project Progress Tracker** — visual indicator showing which chapters are submitted/approved/locked; overall proposal readiness percentage | Frontend | High |
| S7-21 | Enhance **Notification system** — notification items now link to relevant pages (e.g., "Chapter 1 approved" links to the submission page) | Frontend | Medium |
| S7-22 | Implement **deadline countdown** UI — show remaining time for each chapter deadline; visual warning (amber) at 3 days, critical (red) at 1 day | Frontend | Medium |

#### Documentation

| ID | Task | Priority |
| ---- | ------ | ---------- |
| S7-23 | Update `API.md` with review, annotation, unlock request endpoints | High |
| S7-24 | Update `DATABASE.md` with Annotation schema and UnlockRequest schema | High |
| S7-25 | Update `CHANGELOG.md` | High |

#### Sprint 7 Definition of Done

- [ ] Advisers can open a submitted document, highlight text, and leave comments
- [ ] Annotations are stored per-submission-version and display correctly on re-open
- [ ] Advisers can approve, reject, or request revisions on chapters
- [ ] Status transitions are strictly enforced (invalid transitions return 400)
- [ ] Approved chapters are automatically locked
- [ ] Students can submit unlock requests; advisers can approve/deny
- [ ] Unlocking a chapter allows re-upload; re-approval re-locks
- [ ] Project progress tracker accurately reflects chapter statuses
- [ ] Deadline countdown displays correctly with visual warnings
- [ ] All notifications fire for review/lock/unlock events
- [ ] All unit tests pass
- [ ] Documentation updated

---

### Sprint 8: Plagiarism Checker Integration (Async)

**Goal:** Every chapter upload triggers an asynchronous plagiarism check via Copyleaks API. Results are stored and displayed to students and advisers. The entire flow is non-blocking.

**Duration:** 1.5 weeks

#### Backend Tasks

| ID | Task | Owner | Priority |
| ---- | ------ | ------- | ---------- |
| S8-01 | Set up **Redis** connection (`/server/config/redis.js`) — connect to Redis instance using `ioredis`; export client instance | Backend | Critical |
| S8-02 | Set up **BullMQ** queue system (`/server/jobs/queue.js`) — create `plagiarismQueue` and `emailQueue`; configure worker concurrency and retry policies | Backend | Critical |
| S8-03 | Create **Copyleaks service adapter** (`/server/services/copyleaks.service.js`) — abstracted interface: `submitDocument(text)` → returns `scanId`; `getScanResult(scanId)` → returns `{ originalityScore, matchedSources[] }`; provider-agnostic so Copyleaks can be swapped | Backend | Critical |
| S8-04 | Create **plagiarism job processor** (`/server/jobs/plagiarism.job.js`) — BullMQ worker that: (1) extracts text from uploaded PDF/DOCX, (2) calls Copyleaks API, (3) updates submission record with originality score, (4) creates notification for student | Backend | Critical |
| S8-05 | Implement **text extraction** — use `pdf-parse` for PDFs and `mammoth` for DOCX files; create a utility `extractText(buffer, mimeType)` | Backend | High |
| S8-06 | Integrate plagiarism job into upload flow — after successful upload in `SubmissionService.uploadChapter()`, enqueue a plagiarism job; return `202 Accepted` with `plagiarismStatus: 'processing'` | Backend | Critical |
| S8-07 | Create **plagiarism status endpoint**: `GET /api/submissions/:id/plagiarism` — returns current plagiarism status (`processing`, `completed`, `failed`) and score if available | Backend | High |
| S8-08 | Implement **job retry logic** — if Copyleaks returns 503 or times out, retry up to 3 times with exponential backoff; if all retries fail, mark `plagiarismStatus: 'failed'` and notify student | Backend | High |
| S8-09 | Create **PlagiarismResult** embedded schema within Submission — `{ status, originalityScore, matchedSources: [{ title, url, matchPercentage }], processedAt, jobId }` | Backend | High |
| S8-10 | Rate limit Copyleaks API calls — use BullMQ rate limiter to enforce max concurrent jobs per the API's rate limits (e.g., max 10 concurrent scans) | Backend | Medium |
| S8-11 | Implement **fallback mode** — if COPYLEAKS_API_KEY is not configured (dev environments), skip the API call and return a mock score (random 70–100%); log a warning | Backend | Medium |
| S8-12 | Move the Phase 1 email job stub to a proper BullMQ email worker — all notification emails dispatched via the email queue | Backend | Medium |
| S8-13 | Write unit tests for plagiarism job (mocked Copyleaks API), text extraction utility, job retry behavior, fallback mode | Backend | High |

#### Frontend Tasks

| ID | Task | Owner | Priority |
| ---- | ------ | ------- | ---------- |
| S8-14 | Build **Originality Score Badge** component — displays score as a colored badge: green (>80%), yellow (60–80%), red (<60%); shows "Processing..." with spinner while `plagiarismStatus === 'processing'` | Frontend | High |
| S8-15 | Implement **polling for plagiarism result** — after upload, React Query polls `GET /api/submissions/:id/plagiarism` every 5 seconds until status is `completed` or `failed` (max 60 polls = 5 minutes) | Frontend | High |
| S8-16 | Build **Plagiarism Report** component — expandable section showing matched sources list: source title, URL (if available), match percentage | Frontend | Medium |
| S8-17 | Display originality score in **Submission History** and **Adviser Review Page** | Frontend | High |

#### Documentation

| ID | Task | Priority |
| ---- | ------ | ---------- |
| S8-18 | Update `ARCHITECTURE.md` with async job queue architecture diagram (upload → BullMQ → Copyleaks → result) | High |
| S8-19 | Update `API.md` with plagiarism endpoint | High |
| S8-20 | Update `DATABASE.md` with PlagiarismResult schema | High |
| S8-21 | Document Copyleaks API integration and fallback mode in `DEPLOYMENT.md` | High |
| S8-22 | Update `CHANGELOG.md` | High |

#### Sprint 8 Definition of Done

- [ ] Uploading a chapter automatically triggers a plagiarism check in the background
- [ ] Upload endpoint returns 202 Accepted immediately (non-blocking)
- [ ] Plagiarism job runs asynchronously via BullMQ/Redis
- [ ] Originality score is stored in the submission record after processing
- [ ] Student is notified when plagiarism check completes
- [ ] Frontend polls for result and displays score (green/yellow/red badge)
- [ ] Matched sources are displayed in an expandable report
- [ ] Retry logic handles Copyleaks API failures gracefully
- [ ] Fallback mode works when API key is not configured (dev/testing)
- [ ] All unit tests pass (mocked API, text extraction, retry logic)
- [ ] Documentation updated

---

### Sprint 9: Proposal Compilation, Frontend Pages & Integration Testing

**Goal:** Once all chapters are approved, teams compile the full proposal. All Phase 2 frontend pages are polished. End-to-end integration tests verify the entire Capstone 1 workflow.

**Duration:** 2 weeks

#### Backend Tasks

| ID | Task | Owner | Priority |
| ---- | ------ | ------- | ---------- |
| S9-01 | Implement **proposal compilation** endpoint `POST /api/projects/:id/compile-proposal` — validates all chapters are approved; team uploads the unified proposal PDF; stored as a special "proposal" submission type | Backend | Critical |
| S9-02 | Implement **proposal approval workflow** — same status flow as chapters but at the project level; once proposal is approved, project status becomes `proposal_approved` | Backend | High |
| S9-03 | Write **end-to-end integration tests** for the full Capstone 1 lifecycle: create project → submit title → approve title → upload Ch.1 → plagiarism check → adviser review → approve → repeat for Ch.2 & 3 → compile proposal → approve proposal | Backend | Critical |
| S9-04 | Write **RBAC integration tests** for all Phase 2 endpoints: student accessing other team's project (403), adviser accessing unassigned team (403), panelist performing adviser-only actions (403) | Backend | Critical |
| S9-05 | Write **document lock integration tests**: upload to locked chapter (400), unlock request → approve → re-upload (success), re-approval → re-lock (verify) | Backend | High |
| S9-06 | Write **deadline integration tests**: upload past deadline without remarks (400), upload past deadline with remarks (success, isLate=true) | Backend | High |
| S9-07 | Write **file validation integration tests**: upload disguised EXE (400), upload oversized file (400), upload valid PDF (success) | Backend | High |
| S9-08 | Run `npm audit` on both client and server; resolve all high/critical vulnerabilities | Backend | High |
| S9-09 | Performance audit: add MongoDB indexes for all new collections (projects, submissions); query plan analysis for common queries | Backend | High |

#### Frontend Tasks

| ID | Task | Owner | Priority |
| ---- | ------ | ------- | ---------- |
| S9-10 | Build **Proposal Compilation Page** — shows all approved chapters with status; "Compile Proposal" button that opens upload form for the unified document | Frontend | High |
| S9-11 | Build **Instructor: All Projects Overview** — table/grid of all projects with status filters, search by title/team/adviser; click to view project detail | Frontend | High |
| S9-12 | Build **Panelist: My Groups** page — list of groups the panelist has selected; project status, submissions, originality scores | Frontend | High |
| S9-13 | Polish all Phase 2 pages: loading skeletons, empty states, error states with retry, responsive design (desktop + tablet) | Frontend | High |
| S9-14 | Dark/light mode visual audit for all Phase 2 pages — verify PDF viewer "paper" background, annotation highlights, status badges, progress tracker colors | Frontend | High |
| S9-15 | Build **Workflow Phase Tracker** — a visual stepper component showing the capstone phases: Team Formation ✓ → Topic Submission → Chapter Uploads → Proposal → (Development → Defense → Archive grayed out) | Frontend | High |
| S9-16 | Build **Not Found (404)** and **Forbidden (403)** pages with helpful messages and navigation links | Frontend | Medium |
| S9-17 | Implement **toast notifications** for all actions (upload success, review submitted, unlock approved, etc.) using shadcn/ui Toast/Sonner | Frontend | Medium |

#### Documentation

| ID | Task | Priority |
| ---- | ------ | ---------- |
| S9-18 | Finalize `API.md` for all Phase 2 endpoints | High |
| S9-19 | Finalize `DATABASE.md` for all Phase 2 schemas | High |
| S9-20 | Update `ARCHITECTURE.md` with complete Phase 2 system diagram | High |
| S9-21 | Update `DEPLOYMENT.md` with Phase 2 requirements (S3, Redis, Copyleaks) | High |
| S9-22 | Finalize `CHANGELOG.md` — all Phase 2 additions under `[0.2.0]` | High |
| S9-23 | Create **Phase 3 backlog** — prioritized list of Phase 3 features (Capstone 2 & 3 workflow, split-screen viewer, defense evaluation, prototype showcasing, WebSocket notifications) | High |
| S9-24 | **Code freeze.** Tag `v0.2.0`. Merge `develop` → `main`. | Critical |

#### Sprint 9 Definition of Done

- [ ] Full Capstone 1 lifecycle works end-to-end
- [ ] Proposal compilation validates all chapters are approved before allowing submission
- [ ] All integration tests pass (lifecycle, RBAC, locking, deadlines, file validation)
- [ ] `npm audit` clean (zero high/critical)
- [ ] All pages have loading/empty/error states
- [ ] Dark/light mode audit passed for all Phase 2 pages
- [ ] Responsive design verified (desktop + tablet)
- [ ] All documentation current
- [ ] `v0.2.0` tagged on `main`
- [ ] Phase 3 backlog written

---

## 6. New Database Collections

### 6.1 `projects`

| Field | Type | Constraints | Notes |
| ------- | ------ | ------------- | ------- |
| `_id` | ObjectId | auto | |
| `teamId` | ObjectId | ref: `teams`, required, unique | One project per team |
| `title` | String | required, min 10 chars | Full project title |
| `abstract` | String | max 500 chars | Brief project description |
| `keywords` | [String] | max 10 items | For search and similarity |
| `academicYear` | String | required | e.g., `"2025-2026"` |
| `capstonePhase` | Number | enum: 1-4, default: 1 | Current capstone phase |
| `titleStatus` | String | enum: `draft`, `submitted`, `approved`, `revision_required`, `pending_modification` | Default: `draft` |
| `projectStatus` | String | enum: `active`, `proposal_submitted`, `proposal_approved`, `rejected`, `archived` | Default: `active` |
| `adviserId` | ObjectId | ref: `users`, nullable | Assigned adviser |
| `panelistIds` | [ObjectId] | ref: `users`, max 3 | Assigned panelists |
| `deadlines` | Object | embedded | `{ chapter1: Date, chapter2: Date, chapter3: Date, proposal: Date }` |
| `titleModificationRequest` | Object | nullable | `{ proposedTitle, justification, status, requestedAt }` |
| `rejectionReason` | String | nullable | Set when project is rejected |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ teamId: 1 }` (unique), `{ titleStatus: 1 }`, `{ adviserId: 1 }`, `{ academicYear: 1, projectStatus: 1 }` (compound), text index on `{ title: 'text', keywords: 'text' }`

### 6.2 `submissions`

| Field | Type | Constraints | Notes |
| ------- | ------ | ------------- | ------- |
| `_id` | ObjectId | auto | |
| `projectId` | ObjectId | ref: `projects`, required | |
| `chapter` | Number | 1-5 (1-3 for chapters, 4 for proposal, 5 reserved) | |
| `version` | Number | default: 1 | Auto-incremented on re-upload |
| `type` | String | enum: `chapter`, `proposal` | Default: `chapter` |
| `fileName` | String | required | Original file name |
| `fileType` | String | required | Validated MIME type |
| `fileSize` | Number | required | In bytes |
| `storageKey` | String | required | S3 object key |
| `status` | String | enum: `pending`, `under_review`, `approved`, `revisions_required`, `rejected`, `locked` | Default: `pending` |
| `isLocked` | Boolean | default: false | Set to true when approved |
| `submittedBy` | ObjectId | ref: `users`, required | Student who uploaded |
| `remarks` | String | nullable | Required if late submission |
| `isLate` | Boolean | default: false | Flagged if past deadline |
| `plagiarismResult` | Object | nullable | `{ status, originalityScore, matchedSources[], processedAt, jobId }` |
| `annotations` | [Object] | embedded | `[{ text, highlightRange: { start, end, pageNumber }, comment, createdBy, createdAt }]` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ projectId: 1, chapter: 1, version: -1 }` (compound), `{ projectId: 1, status: 1 }`, `{ submittedBy: 1 }`, `{ 'plagiarismResult.status': 1 }`

### 6.3 `unlockrequests`

| Field | Type | Constraints | Notes |
| ------- | ------ | ------------- | ------- |
| `_id` | ObjectId | auto | |
| `submissionId` | ObjectId | ref: `submissions`, required | The locked submission |
| `projectId` | ObjectId | ref: `projects`, required | For querying by project |
| `requestedBy` | ObjectId | ref: `users`, required | Student requesting unlock |
| `reason` | String | required, min 20 chars | Justification for unlock |
| `status` | String | enum: `pending`, `approved`, `denied` | Default: `pending` |
| `reviewedBy` | ObjectId | ref: `users`, nullable | Adviser who reviewed |
| `reviewNote` | String | nullable | Adviser's note on decision |
| `reviewedAt` | Date | nullable | |
| `createdAt` | Date | auto | |

**Indexes:** `{ projectId: 1, status: 1 }`, `{ submissionId: 1 }`, `{ reviewedBy: 1, status: 1 }`

---

## 7. New API Endpoints

### Projects (`/api/projects`)

| Method | Path | Auth | Roles | Description |
| -------- | ------ | ------ | ------- | ------------- |
| POST | `/api/projects` | Bearer | Student (leader) | Create a new project for the team |
| GET | `/api/projects/me` | Bearer | Student | Get current team's project |
| GET | `/api/projects/:id` | Bearer | All (role-filtered) | Get project details |
| GET | `/api/projects` | Bearer | Instructor, Adviser, Panelist | List projects (paginated, filterable) |
| PATCH | `/api/projects/:id/title` | Bearer | Student (leader) | Update project title (draft only) |
| POST | `/api/projects/:id/submit-title` | Bearer | Student (leader) | Submit title for review |
| PATCH | `/api/projects/:id/approve-title` | Bearer | Instructor | Approve a submitted title |
| PATCH | `/api/projects/:id/reject-title` | Bearer | Instructor | Reject title (with reason) |
| POST | `/api/projects/:id/title-modification` | Bearer | Student (leader) | Request title modification |
| PATCH | `/api/projects/:id/title-modification` | Bearer | Instructor | Approve/deny title modification |
| PATCH | `/api/projects/:id/assign-adviser` | Bearer | Instructor | Assign adviser to project |
| PATCH | `/api/projects/:id/assign-panelist` | Bearer | Instructor | Assign panelist to project |
| POST | `/api/projects/:id/select-panelist` | Bearer | Panelist | Panelist self-selects this project |
| DELETE | `/api/projects/:id/panelist/:panelistId` | Bearer | Instructor | Remove panelist from project |
| PATCH | `/api/projects/:id/reject` | Bearer | Instructor | Reject entire project |
| PATCH | `/api/projects/:id/deadlines` | Bearer | Instructor | Set chapter/proposal deadlines |
| POST | `/api/projects/:id/compile-proposal` | Bearer | Student (leader) | Upload compiled proposal (all chapters must be approved) |

### Submissions (`/api/submissions`)

| Method | Path | Auth | Roles | Description |
| -------- | ------ | ------ | ------- | ------------- |
| POST | `/api/projects/:projectId/submissions` | Bearer | Student (team member) | Upload a chapter (multipart/form-data) |
| GET | `/api/projects/:projectId/submissions` | Bearer | All (role-filtered) | List all submissions for a project |
| GET | `/api/submissions/:id` | Bearer | All (role-filtered) | Get submission details |
| GET | `/api/submissions/:id/view-url` | Bearer | All (role-filtered) | Get pre-signed URL to view document |
| GET | `/api/projects/:projectId/chapters/:chapter/history` | Bearer | All (role-filtered) | Get version history for a chapter |
| GET | `/api/submissions/:id/plagiarism` | Bearer | All (role-filtered) | Get plagiarism check status/result |

### Reviews & Annotations (`/api/submissions/:id/...`)

| Method | Path | Auth | Roles | Description |
| -------- | ------ | ------ | ------- | ------------- |
| POST | `/api/submissions/:id/annotations` | Bearer | Adviser | Add annotation to submission |
| GET | `/api/submissions/:id/annotations` | Bearer | Adviser, Instructor, Student (own) | Get annotations for submission |
| PATCH | `/api/submissions/:id/status` | Bearer | Adviser | Change submission status (approve/reject/request-revisions) |

### Unlock Requests (`/api/unlock-requests`)

| Method | Path | Auth | Roles | Description |
| -------- | ------ | ------ | ------- | ------------- |
| POST | `/api/submissions/:id/unlock-request` | Bearer | Student (team member) | Request to unlock a locked chapter |
| GET | `/api/unlock-requests` | Bearer | Adviser | Get pending unlock requests for assigned teams |
| PATCH | `/api/unlock-requests/:id` | Bearer | Adviser | Approve or deny unlock request |
| GET | `/api/projects/:projectId/unlock-requests` | Bearer | Student, Adviser | Get unlock requests for a project |

---

## 8. Folder Structure (End of Phase 2)

```text
CMS V2/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                       ← shadcn/ui components (expanded set)
│   │   │   ├── layout/                   ← Sidebar, Header, ThemeToggle, ProtectedRoute
│   │   │   ├── auth/                     ← LoginForm, RegisterForm, etc.
│   │   │   ├── teams/                    ← CreateTeamForm, InviteForm, TeamRoster
│   │   │   ├── projects/                 ← NEW: ProjectCard, TitleSubmissionForm, SimilarityAlert
│   │   │   ├── submissions/              ← NEW: ChapterUpload, SubmissionHistory, VersionSelector
│   │   │   ├── review/                   ← NEW: AnnotationOverlay, ReviewActions, AnnotationPanel
│   │   │   ├── plagiarism/              ← NEW: OriginalityBadge, PlagiarismReport
│   │   │   ├── notifications/
│   │   │   └── common/                   ← LoadingState, EmptyState, ErrorState, WorkflowStepper
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── teams/                    ← NEW: TeamPage, AcceptInvitePage
│   │   │   ├── projects/                ← NEW: CreateProjectPage, ProjectDetailPage, TitleModificationPage
│   │   │   ├── submissions/             ← NEW: ChapterSubmissionPage, ProposalCompilationPage
│   │   │   ├── review/                  ← NEW: AdviserReviewPage, UnlockRequestsPage
│   │   │   ├── instructor/             ← NEW: ProjectManagementPage, DeadlineManagementPage
│   │   │   ├── panelist/               ← NEW: AvailableProjectsPage, MyGroupsPage
│   │   │   ├── profile/                ← NEW: ProfilePage
│   │   │   └── NotFoundPage.jsx         ← NEW
│   │   ├── hooks/                       ← useProject, useSubmissions, usePlagiarism (NEW)
│   │   ├── stores/                      ← authStore.js
│   │   ├── services/                    ← projectService.js, submissionService.js (NEW)
│   │   ├── lib/
│   │   └── ...
│   └── ...
├── server/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── teams/
│   │   ├── notifications/
│   │   ├── projects/                    ← NEW
│   │   │   ├── project.model.js
│   │   │   ├── project.service.js
│   │   │   ├── project.controller.js
│   │   │   ├── project.routes.js
│   │   │   └── project.validation.js
│   │   └── submissions/                 ← NEW
│   │       ├── submission.model.js
│   │       ├── submission.service.js
│   │       ├── submission.controller.js
│   │       ├── submission.routes.js
│   │       ├── submission.validation.js
│   │       ├── review.service.js
│   │       ├── unlockRequest.model.js
│   │       └── unlockRequest.service.js
│   ├── services/                        ← NEW
│   │   ├── storage.service.js           ← S3 abstraction
│   │   └── copyleaks.service.js         ← Plagiarism API abstraction
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── authorize.js
│   │   ├── errorHandler.js
│   │   ├── validate.js
│   │   ├── rateLimiter.js
│   │   └── fileValidation.js            ← NEW: MIME-type + size validation
│   ├── jobs/                            ← NEW (fully implemented)
│   │   ├── queue.js                     ← BullMQ queue setup
│   │   ├── plagiarism.job.js            ← Plagiarism check worker
│   │   └── email.job.js                 ← Email dispatch worker
│   ├── utils/
│   │   ├── AppError.js
│   │   ├── catchAsync.js
│   │   ├── generateToken.js
│   │   ├── generateOtp.js
│   │   ├── levenshtein.js              ← NEW: Title similarity utility
│   │   └── extractText.js              ← NEW: PDF/DOCX text extraction
│   ├── config/
│   │   ├── db.js
│   │   ├── env.js
│   │   ├── redis.js                    ← NEW: Redis connection
│   │   └── storage.js                  ← NEW: S3 configuration
│   └── ...
├── shared/
│   └── constants/
│       ├── roles.js
│       ├── statusCodes.js
│       ├── submissionStatuses.js        ← NEW
│       ├── titleStatuses.js             ← NEW
│       └── projectStatuses.js           ← NEW
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── CONTRIBUTING.md
│   ├── CHANGELOG.md
│   ├── PHASE_1_STRATEGY.md
│   └── PHASE_2_STRATEGY.md             ← This document
└── ...
```

---

## 9. Third-Party Integrations

### 9.1 AWS S3 (Cloud Storage)

| Aspect | Detail |
| -------- | -------- |
| **Purpose** | Store uploaded PDF/DOCX chapter files |
| **npm Packages** | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| **Key Structure** | `projects/{projectId}/chapters/{chapterNum}/v{version}/{fileName}` |
| **Access Pattern** | Upload: server-side `PutObject`; View: pre-signed `GetObject` URL (5-min expiry) |
| **Env Vars** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` |
| **Abstraction** | `StorageService` interface — swap to GCS or Cloudinary by changing one file |
| **Security** | Bucket is private (no public access); all access via pre-signed URLs; IAM policy grants only `PutObject`, `GetObject`, `DeleteObject` |

### 9.2 Copyleaks API (Plagiarism Checker)

| Aspect | Detail |
| -------- | -------- |
| **Purpose** | Originality/plagiarism checking for uploaded documents |
| **npm Packages** | `plagiarism-checker` (Copyleaks SDK) or direct HTTP calls via Axios |
| **Flow** | Extract text → Submit to Copyleaks → Poll for result → Store score |
| **Env Vars** | `COPYLEAKS_EMAIL`, `COPYLEAKS_API_KEY` |
| **Abstraction** | `CopyleaksService` interface — can be swapped for another provider |
| **Rate Limits** | Respect API rate limits via BullMQ rate limiting (max 10 concurrent) |
| **Fallback** | If API key not configured, return mock score + log warning (dev mode) |
| **Cost** | Free tier offers limited scans/month; ensure rate limiting to stay within quota |

### 9.3 Redis (Job Queue)

| Aspect | Detail |
| -------- | -------- |
| **Purpose** | BullMQ message broker for async plagiarism and email jobs |
| **npm Packages** | `ioredis`, `bullmq` |
| **Queues** | `plagiarism-check`, `email-dispatch` |
| **Env Vars** | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional) |
| **Monitoring** | BullMQ Dashboard (bull-board) accessible at `/admin/queues` (Instructor only) |

### 9.4 Text Extraction Libraries

| Library | Purpose | npm Package |
| --------- | --------- | ------------- |
| **pdf-parse** | Extract text content from PDF files | `pdf-parse` |
| **mammoth** | Extract text content from DOCX files | `mammoth` |

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
| ------ | ----------- | -------- | ------------ |
| **Copyleaks API rate limits or outages** | Medium | High | Implement robust retry logic with exponential backoff; fallback mock mode for dev/testing; alert system for persistent failures; consider caching results for re-checks of identical content |
| **S3 upload failures** (network, permissions) | Low | High | Retry mechanism in `StorageService`; validate IAM permissions in deployment checklist; use multipart upload for large files; client-side retry on failure |
| **PDF text extraction quality varies** | Medium | Medium | `pdf-parse` struggles with scanned/image-only PDFs; document this limitation in user guides; consider OCR integration in Phase 3+ for scanned documents |
| **Document annotation positioning** | High | Medium | PDF highlight coordinates are complex to map accurately; start with page-number + character-offset annotations; consider using an annotation library like `pdf-annotate.js` or building on top of `react-pdf` |
| **Large file uploads timing out** | Medium | Medium | Set multer file size limit; increase Express request timeout for upload routes; show progress bar on frontend; consider chunked uploads for files >10MB |
| **Title similarity false positives** | Medium | Low | Levenshtein alone may flag unrelated titles; combine with keyword overlap scoring; show similarity as a warning (not a block) so teams can proceed with justification |
| **Concurrent uploads to same chapter** | Low | Medium | Use MongoDB optimistic locking (version check) or a Redis lock to prevent two simultaneous uploads overwriting each other's version number |
| **Redis connection failure** | Low | High | BullMQ queues stall without Redis; implement health check endpoint that verifies Redis connectivity; fallback: process plagiarism synchronously if queue is unavailable (degrade gracefully) |
| **Scope creep into Capstone 2-4 features** | High | High | Stick strictly to Capstone 1 workflow; any Capstone 2+ work goes to `phase-3/` branches; review sprint scope at each standup |

---

## 11. Definition of Done (Phase 2)

Phase 2 is complete when **all** of the following are true:

- [ ] **Project lifecycle works end-to-end:** create project → submit title → similarity check returns result → title approved → adviser assigned → panelists selected
- [ ] **Title similarity detection works:** submitting a title that matches an existing one at >70% similarity triggers a warning with matched titles
- [ ] **Title modification request workflow works:** student requests → instructor reviews → approved/denied
- [ ] **Chapter upload works end-to-end:** upload PDF/DOCX → stored in S3 → metadata in MongoDB → version incremented on re-upload
- [ ] **MIME-type validation rejects invalid files:** disguised executables, oversized files blocked at middleware level
- [ ] **Pre-signed URLs work:** authorized users can view documents via temporary signed URLs
- [ ] **Plagiarism check runs asynchronously:** upload → BullMQ job → Copyleaks API → result stored → student notified
- [ ] **Adviser review works:** open document → highlight text → add comment → approve/reject/request revisions
- [ ] **Document locking enforced server-side:** approved chapters locked → upload rejected → unlock request workflow works
- [ ] **Late submission handling works:** past-deadline uploads require remarks → flagged as late in system
- [ ] **Proposal compilation works:** all chapters approved → team uploads unified proposal → proposal follows same review cycle
- [ ] **All role-based dashboards show real data:** Student (project status, submissions), Adviser (assigned groups, reviews), Panelist (available/selected groups), Instructor (all projects, management tools)
- [ ] **Notifications fire for all workflow events** (title, upload, review, lock/unlock, plagiarism)
- [ ] **Dark/light mode compliant** for all Phase 2 pages
- [ ] **All integration tests pass** (lifecycle, RBAC, locking, deadlines, file validation, plagiarism)
- [ ] **Documentation current** for Phase 2 scope
- [ ] **npm audit clean** (zero high/critical)
- [ ] **Git tagged:** `v0.2.0` on `main`

---

## 12. Phase 2 → Phase 3 Handoff Checklist

Before starting Phase 3, confirm:

- [ ] All Phase 2 Definition of Done items are met
- [ ] Phase 3 backlog is written (Capstone 2 & 3: continued iterations, prototype showcasing, split-screen viewer, defense scheduling)
- [ ] S3 bucket and Copyleaks integration are stable in staging
- [ ] BullMQ + Redis are operational and monitored (bull-board dashboard accessible)
- [ ] All document workflow edge cases are tested (lock/unlock cycles, version conflicts, late submissions)
- [ ] The team has reviewed `.instructions.md` rules for Phase 3 scope (Capstone 2 & 3 workflow, prototype media uploads, defense evaluation)
- [ ] Phase 2 user feedback (if any) is documented and triaged for Phase 3

---

## 13. Summary

Phase 2 is the **core domain logic phase** — it transforms the CMS from a user management shell into a functional Capstone 1 workflow system. It introduces:

- **5 new sprints** (Sprint 5–9) across approximately 9–10 weeks
- **3 new database collections** (projects, submissions, unlock requests)
- **~40 new API endpoints** across projects, submissions, reviews, and unlock requests
- **3 new server modules** (projects, submissions with reviews, storage/plagiarism services)
- **3 external integrations** (AWS S3, Copyleaks, Redis/BullMQ)
- **15+ new frontend pages** covering all role-specific workflows

### Phase 2 Sprint Summary

| Sprint | Duration | Focus | Key Deliverables |
| -------- | ---------- | ------- | ----------------- |
| **Sprint 5** | 2 weeks | Project & Title | Project model, title similarity, adviser/panelist assignment, project dashboards |
| **Sprint 6** | 2 weeks | Upload & Storage | S3 integration, chapter uploads, MIME validation, versioning, document viewer |
| **Sprint 7** | 2 weeks | Review & Locking | Adviser annotations, status workflow, document locking, unlock requests |
| **Sprint 8** | 1.5 weeks | Plagiarism | BullMQ/Redis, Copyleaks API, async jobs, originality scoring |
| **Sprint 9** | 2 weeks | Polish & Testing | Proposal compilation, integration tests, UI polish, `v0.2.0` tag |

### New Dependencies (npm packages to add)

| Package | Purpose | Install Location |
| --------- | --------- | ----------------- |
| `@aws-sdk/client-s3` | S3 file operations | server |
| `@aws-sdk/s3-request-presigner` | Pre-signed URL generation | server |
| `multer` | File upload handling (multipart/form-data) | server |
| `file-type` | MIME-type detection via magic bytes | server |
| `ioredis` | Redis client | server |
| `bullmq` | Job queue system | server |
| `pdf-parse` | PDF text extraction | server |
| `mammoth` | DOCX text extraction | server |
| `react-pdf` | PDF viewer component | client |
| `react-dropzone` | File upload dropzone | client |

**When Phase 2 is done, the system supports the complete Capstone 1 workflow — from project creation through proposal approval. Every subsequent phase (Capstone 2-4) follows the same iterative pattern with the infrastructure already proven.**
