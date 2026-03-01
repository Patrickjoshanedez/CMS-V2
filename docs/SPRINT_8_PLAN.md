# Sprint 8 Plan: Plagiarism Checker & Proposal Compilation (v0.5.0)

> **Version:** 0.5.0
> **Duration:** 2 weeks
> **Depends on:** Sprint 7 (v0.4.0) — Dashboard & Notifications ✅

---

## Table of Contents

1. [Sprint Goal](#1-sprint-goal)
2. [Rationale](#2-rationale)
3. [Sprint Scope](#3-sprint-scope)
4. [Backend Tasks](#4-backend-tasks)
   - [4A. Redis & BullMQ Infrastructure](#4a-redis--bullmq-infrastructure)
   - [4B. Text Extraction Utility](#4b-text-extraction-utility)
   - [4C. Plagiarism Service (Provider-Agnostic)](#4c-plagiarism-service-provider-agnostic)
   - [4D. Async Plagiarism Job](#4d-async-plagiarism-job)
   - [4E. Plagiarism API Endpoint](#4e-plagiarism-api-endpoint)
   - [4F. Hook into Upload Flow](#4f-hook-into-upload-flow)
   - [4G. Email Queue Worker](#4g-email-queue-worker)
   - [4H. Proposal Compilation](#4h-proposal-compilation)
5. [Frontend Tasks](#5-frontend-tasks)
   - [5A. Originality Score Display](#5a-originality-score-display)
   - [5B. Plagiarism Result Polling](#5b-plagiarism-result-polling)
   - [5C. Plagiarism Report Component](#5c-plagiarism-report-component)
   - [5D. Proposal Compilation Page](#5d-proposal-compilation-page)
   - [5E. Integration Into Existing Pages](#5e-integration-into-existing-pages)
6. [New Dependencies](#6-new-dependencies)
7. [Environment Variables](#7-environment-variables)
8. [New API Endpoints](#8-new-api-endpoints)
9. [Database Changes](#9-database-changes)
10. [File Structure (New/Modified)](#10-file-structure-newmodified)
11. [Test Plan](#11-test-plan)
12. [Documentation Updates](#12-documentation-updates)
13. [Definition of Done](#13-definition-of-done)
14. [Risk Register](#14-risk-register)

---

## 1. Sprint Goal

**Implement asynchronous plagiarism/originality checking on every chapter upload and enable proposal compilation once all chapters are approved.**

After this sprint:
- Every chapter upload automatically triggers a background plagiarism check
- Students and advisers see originality scores (green/yellow/red) on submissions
- Matched sources are displayed in an expandable report
- Teams can compile and submit a unified proposal once Ch 1–3 are all approved
- The proposal follows the same review cycle as individual chapters
- All email notifications are dispatched via a proper job queue (not inline)
- Phase 2 (Capstone 1 workflow) is **feature-complete**

---

## 2. Rationale

| Factor | Why Sprint 8 |
|--------|-------------|
| **Strategy alignment** | `PHASE_2_STRATEGY.md` explicitly designates Sprint 8 as "Plagiarism Checker Integration (Async)" |
| **Model readiness** | `Submission.originalityScore` field already exists (null, awaiting async population) |
| **Infrastructure gap** | No Redis/BullMQ/job system exists yet — needed for plagiarism, email, and future features |
| **Feature completeness** | Plagiarism + proposal compilation closes the last two Phase 2 features |
| **Impact** | Plagiarism checking is a **core differentiator** per the CMS requirements document — it's the #1 missing feature |
| **Dependency chain** | Later features (archive search, final defense, Capstone 2–4) all assume Phase 2 is fully done |

Combining planned Sprint 8 (plagiarism, 1.5 weeks) with the remaining Sprint 9 backend work (proposal compilation) into a single 2-week sprint lets us close out Phase 2 completely and tag `v0.5.0`.

---

## 3. Sprint Scope

### Included

| Feature | Description |
|---------|-------------|
| **Redis connection** | `ioredis` client config, health check integration |
| **BullMQ job queues** | `plagiarism-check` queue, `email-dispatch` queue, workers with retry/backoff |
| **Text extraction** | Extract text from PDF (`pdf-parse`) and DOCX (`mammoth`) uploads |
| **Plagiarism service** | Provider-agnostic adapter — Copyleaks API in production, internal comparison + mock in dev |
| **Internal similarity engine** | Compare extracted text against all archived submissions in DB (TF-IDF / cosine similarity) as a baseline, independent of external API |
| **Async plagiarism job** | BullMQ worker: extract text → check originality → store score → notify student |
| **Plagiarism status endpoint** | `GET /api/submissions/:id/plagiarism` — returns processing/completed/failed + score |
| **Upload flow integration** | After successful S3 upload, enqueue plagiarism job (non-blocking, returns 201 immediately) |
| **Originality score UI** | Color-coded badge (green >80%, yellow 60–80%, red <60%), spinner while processing |
| **Plagiarism report UI** | Expandable matched-sources list with percentages |
| **Polling for results** | React Query polls plagiarism endpoint every 5s until complete (max 60 polls) |
| **Proposal compilation** | `POST /api/projects/:id/compile-proposal` — validates all Ch 1–3 approved, accepts unified PDF |
| **Proposal review cycle** | Proposal uses same review workflow (pending → under_review → approved) |
| **Email queue** | All notification emails dispatched via BullMQ instead of inline `nodemailer` calls |
| **Fallback mode** | If no API key configured, use internal comparison only + log warning |

### Excluded (deferred)

| Feature | Deferred To |
|---------|-------------|
| Split-screen document comparison | Sprint 9+ (Phase 3) |
| Capstone 2–4 phase progression | Phase 3 |
| WebSocket real-time notifications | Phase 3 |
| Archive search | Phase 3/4 |
| BullMQ admin dashboard (bull-board) | Sprint 9 (nice-to-have) |

---

## 4. Backend Tasks

### 4A. Redis & BullMQ Infrastructure

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-01 | Install `ioredis` and `bullmq` as server dependencies | Critical | 15m |
| S8-02 | Create `/server/config/redis.js` — Redis client init using env vars (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`); graceful error handling; export client | Critical | 1h |
| S8-03 | Create `/server/jobs/queue.js` — define `plagiarismQueue` and `emailQueue` with default job options (attempts: 3, backoff: exponential 2s); export queues | Critical | 1h |
| S8-04 | Create `/server/jobs/worker.js` — BullMQ Worker bootstrap; imports and registers job processors; called from `server.js` on startup | Critical | 1h |
| S8-05 | Add Redis health check to `GET /api/health` — verify Redis ping alongside MongoDB readiness | Medium | 30m |
| S8-06 | Add env vars to `/server/config/env.js`: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `COPYLEAKS_EMAIL`, `COPYLEAKS_API_KEY` | Critical | 15m |

**Files created:**
- `/server/config/redis.js`
- `/server/jobs/queue.js`
- `/server/jobs/worker.js`

**Files modified:**
- `/server/config/env.js` (new env vars)
- `/server/server.js` (import worker bootstrap)
- `/server/app.js` (health check enhanced)

---

### 4B. Text Extraction Utility

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-07 | Install `pdf-parse` and `mammoth` as server dependencies | Critical | 10m |
| S8-08 | Create `/server/utils/extractText.js` — async function `extractText(buffer, mimeType)` that returns plain text string; dispatches to `pdf-parse` for PDF, `mammoth` for DOCX; throws `AppError` for unsupported types | Critical | 2h |
| S8-09 | Write unit tests for `extractText`: valid PDF → text, valid DOCX → text, unsupported MIME → error, empty buffer → error, corrupted file → graceful error | High | 2h |

**Files created:**
- `/server/utils/extractText.js`
- `/server/tests/unit/extractText.test.js`

---

### 4C. Plagiarism Service (Provider-Agnostic)

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-10 | Create `/server/services/plagiarism.service.js` with interface: `checkOriginality(text, submissionId)` → returns `{ originalityScore: Number, matchedSources: Array, provider: String }` | Critical | 3h |
| S8-11 | Implement **internal comparison engine**: (a) extract stored text from all existing submissions in the same project + all archived projects, (b) compute text similarity using a simple token-overlap / Jaccard similarity approach, (c) return highest match percentage and matching submission IDs | High | 4h |
| S8-12 | Implement **Copyleaks adapter** (conditionally loaded if API key is configured): submit text → poll for result → return score + matched sources | Medium | 3h |
| S8-13 | Implement **fallback logic**: if `COPYLEAKS_API_KEY` is not set, use internal engine only; if set, run both internal + Copyleaks and return the lower (stricter) score; log which provider was used | High | 1h |
| S8-14 | Implement **result caching**: store extracted text hash; if the same content is re-checked, return cached result instead of re-running | Medium | 1h |

**Design decision — Internal comparison engine:**

Rather than being wholly dependent on an external API (cost, rate limits, availability), Sprint 8 implements a **built-in similarity engine** as the primary checker:

1. On upload, extract text from the new submission
2. Query all other submissions' extracted text (stored in a new `extractedText` field or a separate `submission_texts` collection)
3. Compute Jaccard similarity (token overlap) against each
4. Return the highest match as the "internal originality" score
5. Copyleaks (when configured) acts as a secondary, internet-wide check

This approach:
- Works offline / in development with no API key
- Catches intra-system plagiarism (students copying from each other)
- Reduces API costs (only call Copyleaks for submissions that pass internal check)
- Provides instant results for internal comparisons

**Files created:**
- `/server/services/plagiarism.service.js`

---

### 4D. Async Plagiarism Job

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-15 | Create `/server/jobs/plagiarism.job.js` — BullMQ processor that: (1) fetches submission + file from S3, (2) extracts text via `extractText()`, (3) calls `plagiarismService.checkOriginality()`, (4) updates `Submission.originalityScore` and new `Submission.plagiarismResult` embedded doc, (5) creates notification for submitter, (6) logs completion | Critical | 4h |
| S8-16 | Implement retry logic: 3 attempts with exponential backoff (2s, 4s, 8s); on final failure, set `plagiarismResult.status = 'failed'` and notify student | High | 1h |
| S8-17 | Implement rate limiting on the queue: max 5 concurrent jobs (prevents overloading external API + DB) | Medium | 30m |

**Files created:**
- `/server/jobs/plagiarism.job.js`

---

### 4E. Plagiarism API Endpoint

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-18 | Add `GET /api/submissions/:id/plagiarism` route — returns `{ status, originalityScore, matchedSources[], processedAt }` from the submission's `plagiarismResult` field | High | 1h |
| S8-19 | Add Zod validation schema for the plagiarism endpoint (params only) | Medium | 15m |
| S8-20 | Authorization: same view rules as `getSubmission` (team members, assigned adviser, assigned panelist, instructor) | High | 30m |

**Files modified:**
- `/server/modules/submissions/submission.routes.js`
- `/server/modules/submissions/submission.controller.js`
- `/server/modules/submissions/submission.service.js`
- `/server/modules/submissions/submission.validation.js`

---

### 4F. Hook into Upload Flow

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-21 | Modify `SubmissionService.uploadChapter()` — after successful S3 upload and DB save, enqueue a `plagiarism-check` job with `{ submissionId, storageKey, fileType }` | Critical | 1h |
| S8-22 | The upload endpoint continues to return `201 Created` immediately (non-blocking); the response now includes `plagiarismResult: { status: 'processing' }` | High | 30m |
| S8-23 | Handle queue unavailability gracefully: if Redis is down, log error but don't fail the upload; mark `plagiarismResult.status = 'skipped'` | Medium | 30m |

**Files modified:**
- `/server/modules/submissions/submission.service.js`

---

### 4G. Email Queue Worker

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-24 | Create `/server/jobs/email.job.js` — BullMQ processor that sends emails via `nodemailer` (using existing SMTP config); accepts `{ to, subject, html }` | High | 2h |
| S8-25 | Refactor `email.service.js` to enqueue emails via BullMQ instead of sending inline; keep a `sendDirect()` escape hatch for critical auth emails (OTP, password reset) | High | 2h |

**Files created:**
- `/server/jobs/email.job.js`

**Files modified:**
- `/server/modules/notifications/email.service.js`

---

### 4H. Proposal Compilation

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-26 | Add `compileProposal()` method to `SubmissionService` — validates all Ch 1–3 latest versions are `approved` or `locked`; accepts a unified proposal PDF upload; creates a submission with `chapter: 4` (proposal slot); triggers plagiarism check | Critical | 3h |
| S8-27 | Add `POST /api/submissions/:projectId/proposal` route — same middleware chain as chapter upload (auth → authorize → multer → validateFile → controller) | Critical | 1h |
| S8-28 | Add proposal-specific validation: reject if any of Ch 1–3 is not approved, reject if a proposal submission already exists with status `pending` or `under_review` | High | 1h |
| S8-29 | On proposal `approved` status → update `Project.projectStatus` to `proposal_approved` | High | 1h |
| S8-30 | Add Zod schema for proposal upload (same as chapter upload but chapter is always 4) | Medium | 15m |
| S8-31 | Trigger notifications: proposal submitted (→ adviser + instructor), proposal approved (→ team) | High | 30m |

**Files modified:**
- `/server/modules/submissions/submission.service.js`
- `/server/modules/submissions/submission.controller.js`
- `/server/modules/submissions/submission.routes.js`
- `/server/modules/submissions/submission.validation.js`

---

## 5. Frontend Tasks

### 5A. Originality Score Display

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-32 | Create `/client/src/components/submissions/OriginalityBadge.jsx` — colored badge: green (≥80%), yellow (60–79%), red (<60%); spinner + "Checking…" while processing; "Failed" with retry hint on error; tooltip showing exact percentage | High | 2h |

**Component API:**
```jsx
<OriginalityBadge
  status="completed"    // 'processing' | 'completed' | 'failed' | 'skipped' | null
  score={85}            // 0–100 or null
  className=""
/>
```

---

### 5B. Plagiarism Result Polling

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-33 | Add `getPlagiarismResult(submissionId)` to `submissionService.js` | High | 15m |
| S8-34 | Create `usePlagiarismResult(submissionId)` hook in `/client/src/hooks/useSubmissions.js` — React Query with `refetchInterval: 5000` while `status === 'processing'`, stops polling on `completed` / `failed` (max 60 polls = 5 min timeout) | High | 2h |

---

### 5C. Plagiarism Report Component

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-35 | Create `/client/src/components/submissions/PlagiarismReport.jsx` — expandable accordion showing: overall score gauge, list of matched sources (title, match%, link if available), processing timestamp | Medium | 3h |

---

### 5D. Proposal Compilation Page

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-36 | Create `/client/src/pages/submissions/ProposalCompilationPage.jsx` — shows status of all 3 chapters (approved ✓ / not approved ✗), "Compile Proposal" button (enabled only when all 3 are approved), file upload zone for the unified PDF, submit action | High | 4h |
| S8-37 | Add route `/projects/:projectId/proposal` in React Router config | High | 15m |
| S8-38 | Add `compileProposal(projectId, formData, onProgress)` method to `submissionService.js` | High | 15m |

---

### 5E. Integration Into Existing Pages

| ID | Task | Priority | Est. |
|----|------|----------|------|
| S8-39 | **SubmissionDetailPage** — add `OriginalityBadge` next to status badge; add expandable `PlagiarismReport` section; use `usePlagiarismResult` hook for live polling | High | 2h |
| S8-40 | **ProjectSubmissionsPage** — show originality score column in submissions table; color-code rows by score | High | 1h |
| S8-41 | **ChapterUploadPage** — after successful upload, show "Plagiarism check in progress…" with spinning badge that auto-updates when result arrives | High | 1h |
| S8-42 | **MyProjectPage** — add "Compile Proposal" card/section that appears when all chapters are approved; shows proposal status if already submitted | High | 2h |
| S8-43 | **StudentDashboard** — add originality score summary (average across chapters) in stat cards | Medium | 1h |
| S8-44 | **AdviserDashboard** — show originality scores for assigned projects' submissions | Medium | 1h |

---

## 6. New Dependencies

### Server (`/server/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| `ioredis` | `^5.x` | Redis client for BullMQ |
| `bullmq` | `^5.x` | Job queue system (plagiarism + email workers) |
| `pdf-parse` | `^1.1.1` | Extract text from PDF files |
| `mammoth` | `^1.8.x` | Extract text from DOCX files |

### Client (none)

No new client dependencies — all new UI uses existing shadcn/ui components + React Query.

---

## 7. Environment Variables

Add to `/server/config/env.js` and `.env.example`:

```env
# Redis (BullMQ job queue)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Plagiarism Checker (optional — internal engine used as fallback)
COPYLEAKS_EMAIL=
COPYLEAKS_API_KEY=

# Job Queue Settings
PLAGIARISM_MAX_CONCURRENT=5
PLAGIARISM_MAX_RETRIES=3
```

**Redis is required for Sprint 8.** For local development, install Redis via:
- Windows: `winget install Redis.Redis` or use Docker (`docker run -p 6379:6379 redis:7`)
- macOS: `brew install redis`

---

## 8. New API Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/api/submissions/:id/plagiarism` | Bearer | Student (own), Adviser (assigned), Panelist (assigned), Instructor | Get plagiarism check status and results |
| `POST` | `/api/submissions/:projectId/proposal` | Bearer | Student (team member) | Upload compiled proposal (all Ch 1–3 must be approved) |

**Modified endpoints:**

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/api/submissions/:projectId/chapters` | Response now includes `plagiarismResult: { status: 'processing' }` |
| `GET` | `/api/submissions/:id` | Response now includes populated `plagiarismResult` object |
| `GET` | `/api/health` | Now checks Redis connectivity in addition to MongoDB |

---

## 9. Database Changes

### 9A. New Embedded Schema: `plagiarismResult` on Submission

Add to `submission.model.js`:

```javascript
const plagiarismResultSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed', 'skipped'],
      default: 'processing',
    },
    originalityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    matchedSources: [
      {
        title: { type: String },
        submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
        matchPercentage: { type: Number, min: 0, max: 100 },
        url: { type: String, default: null },
      },
    ],
    provider: {
      type: String,
      enum: ['internal', 'copyleaks', 'combined'],
      default: 'internal',
    },
    processedAt: {
      type: Date,
      default: null,
    },
    jobId: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);
```

**Add field to `submissionSchema`:**

```javascript
plagiarismResult: {
  type: plagiarismResultSchema,
  default: null, // Set to { status: 'processing' } when job is enqueued
},
```

### 9B. New Collection: `submission_texts` (for internal comparison)

Store extracted text separately (to avoid bloating the Submission document):

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `submissionId` | ObjectId | ref: Submission, unique |
| `projectId` | ObjectId | ref: Project (for cross-project queries) |
| `text` | String | Extracted plain text content |
| `textHash` | String | SHA-256 hash (for dedup/cache) |
| `wordCount` | Number | For quick filtering |
| `tokens` | [String] | Tokenized words (lowercased, stopwords removed) for similarity |
| `createdAt` | Date | |

**Indexes:** `{ submissionId: 1 }` (unique), `{ projectId: 1 }`, `{ textHash: 1 }`

### 9C. New Index on Submission

```javascript
submissionSchema.index({ 'plagiarismResult.status': 1 });
```

---

## 10. File Structure (New/Modified)

```
server/
├── config/
│   ├── env.js                          ← MODIFIED (new Redis + Copyleaks vars)
│   └── redis.js                        ← NEW
├── jobs/                               ← NEW directory
│   ├── queue.js                        ← NEW (queue definitions)
│   ├── worker.js                       ← NEW (worker bootstrap)
│   ├── plagiarism.job.js               ← NEW (plagiarism check processor)
│   └── email.job.js                    ← NEW (email dispatch processor)
├── models/
│   └── submissionText.model.js         ← NEW (extracted text storage)
├── modules/
│   ├── submissions/
│   │   ├── submission.model.js         ← MODIFIED (plagiarismResult schema)
│   │   ├── submission.service.js       ← MODIFIED (enqueue job, compileProposal)
│   │   ├── submission.controller.js    ← MODIFIED (getPlagiarismResult, compileProposal)
│   │   ├── submission.routes.js        ← MODIFIED (new routes)
│   │   └── submission.validation.js    ← MODIFIED (new schemas)
│   └── notifications/
│       └── email.service.js            ← MODIFIED (queue-based dispatch)
├── services/
│   ├── storage.service.js              ← EXISTING
│   └── plagiarism.service.js           ← NEW
├── utils/
│   ├── extractText.js                  ← NEW
│   └── textSimilarity.js              ← NEW (Jaccard/cosine similarity)
├── server.js                           ← MODIFIED (start workers)
├── app.js                              ← MODIFIED (health check)
└── tests/
    ├── unit/
    │   ├── extractText.test.js         ← NEW
    │   └── textSimilarity.test.js      ← NEW
    └── integration/
        └── plagiarism.test.js          ← NEW

client/src/
├── components/
│   └── submissions/
│       ├── OriginalityBadge.jsx        ← NEW
│       └── PlagiarismReport.jsx        ← NEW
├── hooks/
│   └── useSubmissions.js               ← MODIFIED (usePlagiarismResult)
├── pages/
│   └── submissions/
│       └── ProposalCompilationPage.jsx ← NEW
├── services/
│   └── submissionService.js            ← MODIFIED (getPlagiarismResult, compileProposal)
└── App.jsx                             ← MODIFIED (new route)
```

---

## 11. Test Plan

### 11A. Unit Tests (New)

| ID | Test File | Test Cases | Est. |
|----|-----------|-----------|------|
| T8-01 | `extractText.test.js` | (1) PDF → returns text, (2) DOCX → returns text, (3) unsupported MIME → throws, (4) empty buffer → throws, (5) corrupted file → graceful error | 2h |
| T8-02 | `textSimilarity.test.js` | (1) identical text → 100%, (2) completely different → ~0%, (3) partial overlap → proportional score, (4) empty strings → 0%, (5) case insensitivity | 1h |

### 11B. Integration Tests (New)

| ID | Test File | Test Cases | Est. |
|----|-----------|-----------|------|
| T8-03 | `plagiarism.test.js` | See below — 16 test cases | 6h |

**Plagiarism integration test cases:**

```
Plagiarism Check Flow
  Auth & Guard
    ✓ GET /submissions/:id/plagiarism — 401 without token
    ✓ GET /submissions/:id/plagiarism — 403 for student viewing other team's submission

  Upload → Plagiarism Trigger
    ✓ Upload chapter → submission.plagiarismResult.status is 'processing'
    ✓ Upload chapter → plagiarism job is enqueued (mock BullMQ)

  Plagiarism Result Endpoint
    ✓ Returns { status: 'processing' } before job completes
    ✓ Returns { status: 'completed', originalityScore, matchedSources } after job
    ✓ Returns { status: 'failed', error } when job fails
    ✓ Returns { status: 'skipped' } when Redis is unavailable

  Internal Comparison Engine
    ✓ Detects high similarity between two submissions with same text
    ✓ Returns low similarity for completely different documents
    ✓ Cross-project comparison works (detects copying between teams)

  Proposal Compilation
    ✓ POST /submissions/:projectId/proposal — 201 when all Ch 1–3 approved
    ✓ POST /submissions/:projectId/proposal — 400 when Ch 2 is not yet approved
    ✓ POST /submissions/:projectId/proposal — 400 when proposal already pending
    ✓ POST /submissions/:projectId/proposal — 403 for non-team-member
    ✓ Proposal approval updates project status to 'proposal_approved'
```

### 11C. Existing Test Suites (Regression)

All 132 existing tests must continue to pass. The upload flow changes (adding plagiarism enqueue) must not break existing submission tests.

**Strategy:** Mock BullMQ in test environment so the queue is a no-op.

---

## 12. Documentation Updates

| ID | Document | Updates |
|----|----------|---------|
| D8-01 | `API.md` | Add plagiarism endpoint, proposal compilation endpoint, updated upload response schema |
| D8-02 | `DATABASE.md` | Add `plagiarismResult` embedded schema, `submission_texts` collection, new indexes |
| D8-03 | `ARCHITECTURE.md` | Add async job queue architecture diagram (upload → S3 → BullMQ → Plagiarism Service → DB → Notification) |
| D8-04 | `DEPLOYMENT.md` | Add Redis setup instructions, Copyleaks API configuration, fallback mode documentation |
| D8-05 | `.env.example` | Add Redis + Copyleaks env vars |
| D8-06 | `CHANGELOG.md` | Sprint 8 entries under `[0.5.0]` |

---

## 13. Definition of Done

Sprint 8 is complete when **all** of the following are true:

- [ ] **Redis + BullMQ operational:** queues start on server boot; health check reports Redis status
- [ ] **Upload triggers plagiarism check:** every chapter upload enqueues a background job; upload returns 201 immediately with `plagiarismResult.status: 'processing'`
- [ ] **Text extraction works:** PDF and DOCX files are correctly parsed to plain text
- [ ] **Internal comparison engine works:** detects high-similarity submissions within the system
- [ ] **Originality score stored:** `Submission.plagiarismResult` populated with score, matched sources, provider, timestamp
- [ ] **Student notified:** in-app notification created when plagiarism check completes
- [ ] **Frontend displays score:** `OriginalityBadge` shows green/yellow/red badge on SubmissionDetailPage and ProjectSubmissionsPage
- [ ] **Polling works:** React Query polls every 5s while processing, stops on completion
- [ ] **Plagiarism report expandable:** matched sources displayed with title and percentage
- [ ] **Proposal compilation works:** team can upload unified proposal only when all Ch 1–3 are approved
- [ ] **Proposal review cycle works:** same approve/reject flow as chapters
- [ ] **Proposal approval updates project status:** `projectStatus` → `proposal_approved`
- [ ] **Email queue operational:** notification emails dispatched via BullMQ worker
- [ ] **Fallback mode works:** system functions without Copyleaks API key (internal engine only)
- [ ] **Retry logic works:** failed jobs retry 3x with backoff; permanent failures marked as `failed`
- [ ] **Queue unavailability handled:** if Redis is down, uploads still succeed; plagiarism marked `skipped`
- [ ] **All 16 new tests pass** (plagiarism + proposal)
- [ ] **All 132 existing tests pass** (regression)
- [ ] **Documentation updated** (API.md, DATABASE.md, ARCHITECTURE.md, DEPLOYMENT.md, CHANGELOG.md)
- [ ] **Git tagged:** `v0.5.0` on `main`

---

## 14. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Redis not installed locally** | High (Windows devs) | High | Document Docker fallback (`docker run -p 6379:6379 redis:7`); detect missing Redis on startup and warn |
| **PDF text extraction quality varies** | Medium | Medium | `pdf-parse` struggles with scanned/image-only PDFs; document limitation; add `wordCount` check — if <50 words extracted, flag as "insufficient text for analysis" |
| **Internal comparison is too slow on large datasets** | Low | Medium | Index `submission_texts` by `projectId`; limit cross-project comparison to same `academicYear`; batch token comparisons |
| **Copyleaks rate limits** | Medium | Medium | BullMQ rate limiter (max 5 concurrent); queue throttling; fallback to internal engine if rate limited |
| **BullMQ job loss on server restart** | Low | Medium | BullMQ persists jobs in Redis; configure `removeOnComplete: 100` and `removeOnFail: 200` to keep history |
| **Large DOCX files (>10MB) slow text extraction** | Medium | Low | Set extraction timeout (30s); skip extraction for files >15MB with "too large for analysis" status |
| **Existing tests break due to BullMQ import** | Medium | High | Mock BullMQ in test setup (`vi.mock('bullmq')`) so queue operations are no-ops in test environment |

---

## Sprint 8 Task Summary

| Category | Task Count | Estimated Total |
|----------|-----------|----------------|
| Backend — Infrastructure (Redis, BullMQ) | 6 | 4h |
| Backend — Text Extraction | 3 | 4h |
| Backend — Plagiarism Service | 5 | 12h |
| Backend — Async Job | 3 | 5.5h |
| Backend — API Endpoint | 3 | 1.75h |
| Backend — Upload Integration | 3 | 2h |
| Backend — Email Queue | 2 | 4h |
| Backend — Proposal Compilation | 6 | 5.75h |
| Frontend — Components | 3 | 7h |
| Frontend — Proposal Page | 3 | 4.5h |
| Frontend — Existing Page Updates | 6 | 8h |
| Tests | 3 suites (18+ cases) | 9h |
| Documentation | 6 | 3h |
| **Total** | **52 tasks** | **~70h (2 weeks)** |
