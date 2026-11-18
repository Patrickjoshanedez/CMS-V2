# Comprehensive Survey Report: Authentication, Dedicated Seed Accounts & E2E Browser Testing Infrastructure (R4)

**Investigator**: `survey_explorer_3` (Specification Miner)  
**Parent Conversation ID**: `ed92d340-7260-43d5-8952-0ac19a527b4f`  
**Target Repository**: BukSU Capstone Management System V2 (CMS-V2)  
**Standard**: ASDLC v2.0 & ISO/IEC/IEEE 29119-3 Ready  
**Date**: November 14, 2026  

---

## 1. Executive Summary

This survey evaluates the authentication architecture, user seeders, dedicated role account requirements, and Playwright end-to-end (E2E) browser testing harness for BukSU CMS-V2. It addresses Requirement **R4** ("Seed Account Testing & Real-Scenario Browser Verification") of the user request, ensuring all workflows across all roles (Student Lead/Members, Course Instructor, Capstone Adviser, Committee Secretary, Committee Panelists 1–3, Committee Chair, and College Dean) are realistically verified without simulated finishes.

### Key Architectural Findings:
1. **Authentication & Session Lifecycle**:
   - Backend auth (`server/modules/auth/`) issues HTTP-only JWT cookies (`accessToken` with 15m expiry, `refreshToken` with 7d rotation window). Passwords utilize `bcrypt` (10 rounds) via off-thread Piscina worker pool (`server/utils/cryptoWorkerPool.js`).
   - The React frontend uses Zustand (`client/src/stores/authStore.js`) and TanStack Query. On app initialization or refresh, `sessionLoading: true` displays an `Initializing session...` spinner or `.animate-pulse` skeletons. Automated browser tests **must** await session hydration before interacting with components.
2. **Current Seeders & Role Gaps**:
   - `server/seeders/seed-canonical-role-accounts.js` seeds only 6 accounts (`instructor`, `adviser`, `panelchair`, `student`, `student2`, `student3`). It lacks dedicated accounts for **Committee Secretary**, **Panelist 2**, **Panelist 3**, **Student Members 2–4**, and **College Dean**.
   - `scripts/seed_demo_state.js` contains a deprecated role assignment bug: faculty committee members were assigned `role: 'instructor'` rather than `role: 'faculty'`, violating the institutional rule that Course Instructors cannot serve on defense committees.
   - `server/seeders/index.js` seeds full cohorts for 2024–2025 and 2025–2026, but uses non-standard gmail/student emails (`bennettchristiangeofferdon15@gmail.com`, `leon.mentor.buksu@gmail.com`).
3. **Flaws in Existing E2E Test Runners**:
   - `scripts/e2e-capstone-core-scenarios.js` (TC-E2E-001 through 010) and `scripts/qa-test-runner.js` exhibit **simulated finishes**: they merely navigate to URLs, grab page titles, take screenshots, and push `status: 'Pass'` with synthetic expected text without actually filling forms, clicking triggers, waiting for network mutations, or asserting live DOM states.
   - `scripts/test-all-roles-browser.mjs` violates the mandatory `networkidle` ban at line 116 (`await page.waitForLoadState('networkidle')`). CMS-V2's continuous notification poller (`/api/notifications?page=1&limit=1`) and WebSockets cause `networkidle` to hang indefinitely until watchdog timeout.
4. **Institutional Role Boundaries & Defense Committee Composition Rules**:
   - Defense committees strictly require **exactly 5 distinct faculty accounts** (`role: 'faculty'`): 1 Adviser, 1 Secretary, 1 Panel Chair (Lead Panelist), 1 Panel Member 2, and 1 Panel Member 3. None can be duplicates, and none can be Course Instructors (`role: 'instructor'`).
   - Action Done Matrix (ADM) Tiered Sign-off requires Secretary Compliance Verification Endorsement (`project.admSignatures.secretary.endorsed === true`) before Tier 1 (Adviser & Instructor), Tier 2 (Panelists), and Tier 3 (Chair & Dean) signatures unlock.

---

## 2. Features Discovered

The following features were discovered by probing authoritative specification files, routes, middleware, and schemas:

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Auth | Email/Password Local Authentication | Authenticates users using email and bcrypt password hash via off-thread Piscina worker pool; sets HTTP-only JWT cookies. | Email string, password string | 200 OK + `accessToken`, `refreshToken` cookies, User profile payload | 401 `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_DEACTIVATED` | `server/modules/auth/auth.service.js:194`, `auth.controller.js:55` |
| 2 | Auth | Session Hydration & Restoration | Frontend restores active authentication state on page load/refresh via `GET /api/users/me`. | Cookies | User document in Zustand `authStore` | Flash redirect to `/login` if unauthenticated | `client/src/stores/authStore.js:167`, `client/src/App.jsx:313` |
| 3 | Access Control | Role-Based Route Authorization | Middleware gating Express routes by primary account role. Automatically allows `faculty` to satisfy `adviser` and `panelist`. | `req.user.role`, allowed roles array | Passes to `next()` | 403 `FORBIDDEN` | `server/middleware/authorize.js:16` |
| 4 | Access Control | Committee Panel Role Authorization | Gates project defense routes based on per-project panel assignment (`chair`, `secretary`, `member`). | `projectId`, `req.user._id`, allowed panel roles | Passes to `next()` | 403 `PANEL_ROLE_FORBIDDEN` | `server/middleware/authorize.js:60` |
| 5 | Access Control | Secretary Capability Guard | Restricts defense minutes editing, score finalization, and matrix endorsement exclusively to the assigned Committee Secretary. | `capability`, `projectId`, `req.user._id` | Passes to `next()` | 403 `SECRETARY_CAPABILITY_FORBIDDEN` | `server/middleware/authorize.js:153` |
| 6 | Access Control | Course Instructor Committee Exclusion | Strictly blocks Course Instructors (`role: 'instructor'`) from being appointed as Adviser, Secretary, or Panelist. | Faculty user list query, committee payload | Combobox excludes instructors; API rejects instructor IDs | 400 `INSTRUCTOR_COMMITTEE_EXCLUSION` | `AGENTS.md:Section 1`, `server/modules/teams/team.service.js:assignCommittee` |
| 7 | User Management | Instructor-Driven User Provisioning | Allows Course Instructors to register, update, and manage accounts directly via API without public self-registration. | User creation payload (`email`, `role`, `password`, etc.) | 201 Created + User document | 409 `DUPLICATE_EMAIL`, 400 validation error | `server/modules/users/user.routes.js:64`, `user.controller.js:createUser` |
| 8 | Teams | Roster Locking | Locks team membership and student roles once team formation is finalized. Precondition for proposal submission. | `teamId`, `isLocked: true` | 200 OK + updated Team document | 400 `ROSTER_ALREADY_LOCKED`, 403 if not leader | `server/modules/teams/team.service.js:lockRoster`, `client/src/pages/teams/TeamsPage.jsx` |
| 9 | Proposals | Title Proposal Submission & Pre-Scan | Allows proponents to submit 1..10 candidate titles with SDG tags and disciplines, triggering live archive cosine pre-scan. | Title proposals array, SDG IDs, discipline | 201 Created + Similarity pre-scan score (< 20%) | 400 if title length < 10 or duplicate | `server/modules/proposals/proposal.service.js`, `client/src/pages/projects/CreateProjectPage.jsx` |
| 10 | Proposals | Defense Hearing & Title Approval | Course Instructor reviews title hearing evaluation and selects approved title proposal. | `proposalId`, `hearingScore`, `approvedTitleId` | `titleStatus = 'approved'`, Project initialized | 400 if proposal not submitted or hearing pending | `server/modules/projects/services/projectTitle.service.js`, `TitleApprovalPage.jsx` |
| 11 | Manuscripts | Chapter 1–3 Submission & Plagiarism Gate | Proponents submit chapter files; dual-engine plagiarism screening checks originality (< 25% similarity threshold). | Multipart file (`.docx`/`.pdf`), chapter number | Submission version record + Plagiarism score | 400 `SIMILARITY_THRESHOLD_EXCEEDED` (> 25%), 403 if late without justification | `server/modules/submissions/submission.service.js`, `SubmissionsPage.jsx` |
| 12 | Reviews | Unified Sophisticated Document Viewer | Canonical document inspection studio featuring OOXML rendering, zoom controls, revision diffing, and inline annotations. | Document URL / buffer, revision versions | Interactive document canvas + annotation sidebar | 404 if file missing, degraded PDF fallback | `client/src/components/documents/SophisticatedDocumentViewer.jsx` |
| 13 | Defenses | Defense Scheduling Center | Instructor calendar scheduler for oral defense hearings (Proposal, Midterm, Progress, Final) in 30-min fluid blocks. | `projectId`, `defenseType`, `date`, `timeSlot`, `venue` | Scheduled defense record + notification broadcast | 409 `SCHEDULE_CONFLICT`, 400 if requirements unmet | `server/modules/projects/services/projectDefense.service.js`, `DefenseSchedulingPage.jsx` |
| 14 | Defenses | Secretary Live Defense Minutes | Committee Secretary records defense panel remarks, recommendations, and verbal verdict during oral defense hearings. | `projectId`, `minutesText`, `verdict`, `remarks` | 201 Created Defense Minutes document | 403 if user not appointed secretary | `server/modules/submissions/defenseMinutes.service.js`, `SecretaryReviewPage.jsx` |
| 15 | Matrix | Action Done Matrix (ADM) Logging | Systematic logging of defense panel recommendations, proponent action taken, and chapter page references. | Recommendation text, action taken, page ref | ADM item added with `status: 'pending'` | 400 if required fields missing | `server/modules/projects/adm.routes.js`, `ActionDoneMatrixTab.jsx` |
| 16 | Matrix | Panel Member ADM Verification | Individual defense panelists inspect proponent revision evidence and mark ADM items verified. | `itemId`, `status: 'verified'` | ADM item updated to `verified` | 403 if user not committee panelist | `server/modules/projects/adm.routes.js`, `ActionDoneMatrixTab.jsx` |
| 17 | Matrix | Secretary Compliance Verification Gate | Secretary validates all ADM items are verified and digitally signs institutional compliance endorsement. | `projectId`, `notes`, `signatureDataUrl` | `project.admSignatures.secretary.endorsed = true` | 400 if unverified ADM items remain, 403 if not secretary | `server/modules/projects/project.controller.js:1656`, `ActionDoneMatrixTab.jsx:1140` |
| 18 | Signatures | Multi-Tier Digital ADM Sign-Off Board | Tier 1 (Adviser & Instructor), Tier 2 (Panelists), and Tier 3 (Chair) apply digital signatures; locked until secretary endorses. | `tier`, `role`, `signatoryName`, `signatureDataUrl` | Updated `admSignatures` record + row freezing on chair sign | 403 if secretary endorsement missing | `server/modules/projects/project.controller.js:1519`, `ActionDoneMatrixTab.jsx:1148` |
| 19 | Milestones | Interactive Gantt Milestone Tracking | Capstone 2 (Phase 3) spreadsheet-like milestone canvas with 4 development sections, progress percentages, and staging links. | Section progress %, GitHub repo URL, staging demo URL | Updated project prototype tracking record | 400 invalid URL, 403 if not proponent | `client/src/components/projects/InteractiveGanttChart.jsx`, `PrototypeShowcaseAndDemo.jsx` |
| 20 | Clearance | College Dean Institutional Degree Clearance | College Dean reviews final defense completion packet and signs completion clearance and approval sheet. | `projectId`, `deanSignatureDataUrl`, `signDate` | Dean signature bound to project and completion certificate | 403 if user not dean/admin | `scripts/generate_completion_certificate.py`, `ActionDoneMatrixTab.jsx` |
| 21 | Archival | Automated S3/MinIO Archival & Read-Only Lock | Atomic archival of completed capstone projects to MinIO/S3 object storage, locking the project record as read-only. | Automatic trigger on final ADM completion | `projectStatus = 'archived'`, `isArchived: true` | 500 S3 connection failure (retries queued) | `server/modules/projects/services/projectArchive.service.js`, `ArchiveSearchPage.jsx` |
| 22 | Certification | Sealed Completion Certificate with QR Verification | Generates official PDF certificate of capstone completion with BukSU College of Technologies seal and public QR verification URL. | `projectId` | Rendered PDF / Certificate UI with QR seal | 404 if project not archived or incomplete | `client/src/pages/projects/CertificatePage.jsx`, `scripts/generate_completion_certificate.py` |

---

## 3. Edge Cases & Boundary Behaviors

| # | Feature | Input / Condition | Observed / Documented Behavior |
|---|---|---|---|
| 1 | Committee Assignment | Attempt to assign Course Instructor (`role: 'instructor'`) as Adviser or Panelist | Backend `team.service.js:assignCommittee` rejects with 400 error. Client `useUsers({ role: 'faculty' })` filter removes instructors from dropdown. |
| 2 | Committee Assignment | Faculty assigned as both Adviser and Panelist on same team | Rejected by committee validation; a single faculty member cannot occupy dual committee appointments on the same project. |
| 3 | Committee Assignment | Fewer than 3 defense panelists assigned | Committee assignment fails validation; exactly 1 Chair and 2 Members are strictly required (none labeled optional). |
| 4 | ADM Endorsement | Secretary attempts to sign endorsement while 1 or more ADM rows are unverified (`status: 'pending'`) | Backend `endorseADMBySecretary` responds with HTTP 400: `Cannot endorse Action Done Matrix: X revision item(s) still require panel verification.` |
| 5 | ADM Tiered Signatures | Adviser or Chair attempts to sign ADM before Secretary endorsement is signed | Backend `signTieredADM` responds with HTTP 403: `The Action Done Matrix must be reviewed and endorsed by the Committee Secretary before panel digital signatures can be collected.` |
| 6 | Browser Automation | Test script invokes `page.waitForLoadState('networkidle')` | Hangs indefinitely until 120s watchdog kills process, because real-time notification poller (`/api/notifications?page=1&limit=1`) and WebSockets prevent network from idling. |
| 7 | Session Restoration | Browser test navigates directly to a protected page (`/teams` or `/submissions`) immediately after login | Component may re-render or redirect to `/login` if `sessionLoading: true` in Zustand store is not given time to detach (`text=Initializing session...`). |
| 8 | Chapter Submission | Student uploads manuscript with > 25% similarity score | Plagiarism engine flags submission as non-compliant; defense scheduling remains blocked until revision is submitted with < 25% score. |
| 9 | Registration Domain | Student attempts to self-register with `@gmail.com` or `@buksu.edu.ph` (non-student) | Backend `AuthService.register` throws 400 `INVALID_EMAIL_DOMAIN`: Student registration requires `@student.buksu.edu.ph`. |
| 10 | Archival Immutability | Proponent or faculty attempts to modify manuscript or upload chapter to an archived project | Rejected by `assertProjectWritable`: HTTP 403 `PROJECT_ARCHIVED_READ_ONLY`. |

---

## 4. Dedicated Seed Accounts Specification (Emails, Passwords & Initial States)

To achieve 100% realistic end-to-end multi-role browser verification without simulated finishes, the system requires **11 dedicated seed accounts**. All accounts share the universal development password `Password123!`.

### The 11 Canonical Dedicated Seed Accounts:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CANONICAL DEDICATED SEED ACCOUNTS                                │
├────┬─────────────────────────────┬───────────────────────────┬────────────┬──────────────────────┤
│ #  │ Email                       │ Name                      │ Role       │ Institutional Role   │
├────┼─────────────────────────────┼───────────────────────────┼────────────┼──────────────────────┤
│ 1  │ student@student.buksu.edu.ph│ Patrick Josh S. Añedez    │ student    │ Student Lead (Analyst│
│ 2  │ student2@student.buksu.edu.p│ Jane Doe                  │ student    │ Student Member 2 (UI)│
│ 3  │ student3@student.buksu.edu.p│ John Smith                │ student    │ Student Member 3 (DB)│
│ 4  │ student4@student.buksu.edu.p│ Alice Johnson             │ student    │ Student Member 4 (QA)│
│ 5  │ instructor@student.buksu.edu│ Dr. Sales G. Aribe Jr.    │ instructor │ Capstone Coordinator │
│ 6  │ adviser@student.buksu.edu.ph│ Prof. Leon Mentor         │ faculty    │ Capstone Adviser     │
│ 7  │ secretary@student.buksu.edu.│ Prof. Steven Joe Bautista │ faculty    │ Committee Secretary  │
│ 8  │ panelchair@student.buksu.edu│ Prof. Louie Jay Labastida │ faculty    │ Panel Chair (Lead)   │
│ 9  │ panelist2@student.buksu.edu.│ Prof. Raul Lecaros        │ faculty    │ Panel Member 2       │
│ 10 │ panelist3@student.buksu.edu.│ Prof. Joseph Abella       │ faculty    │ Panel Member 3       │
│ 11 │ dean@student.buksu.edu.ph   │ Dr. Eduardo T. Bagor Jr.  │ faculty    │ Dean, College of Tech│
└────┴─────────────────────────────┴───────────────────────────┴────────────┴──────────────────────┘
```

### Detailed Account Profiles:

1. **Student Lead (Proponent Lead & Systems Analyst)**:
   - **Email**: `student@student.buksu.edu.ph`
   - **Password**: `Password123!`
   - **Role**: `student` | **Student ID**: `2022-00101` | **Section**: `BSIT-4A`
   - **Capabilities**: Team creation, member invites, title proposal drafting, manuscript upload, Gantt chart updating, final compilation.
2. **Student Member 2 (Frontend & UI/UX Developer)**:
   - **Email**: `student2@student.buksu.edu.ph`
   - **Password**: `Password123!`
   - **Role**: `student` | **Student ID**: `2022-00102` | **Section**: `BSIT-4A`
   - **Capabilities**: Accepts team invites, views team workspace, reviews assigned tasks.
3. **Student Member 3 (Backend & Database Developer)**:
   - **Email**: `student3@student.buksu.edu.ph`
   - **Password**: `Password123!`
   - **Role**: `student` | **Student ID**: `2022-00103` | **Section**: `BSIT-4A`
   - **Capabilities**: Contributes repository links, logs progress.
4. **Student Member 4 (QA & Technical Documentor)**:
   - **Email**: `student4@student.buksu.edu.ph`
   - **Password**: `Password123!`
   - **Role**: `student` | **Student ID**: `2022-00104` | **Section**: `BSIT-4A`
   - **Capabilities**: Formats manuscript chapters, tracks ADM revision rows.
5. **Course Instructor (Capstone Coordinator)**:
   - **Email**: `instructor@student.buksu.edu.ph`
   - **Password**: `Password123!`
   - **Role**: `instructor` | **Title**: `Capstone Coordinator / Assistant Professor`
   - **Capabilities**: Defense scheduling, committee assignment, title proposal hearing approval, grade release, user management, audit review.
   - **Strict Restriction**: Cannot be assigned as Adviser, Secretary, or Panelist.
6. **Capstone Adviser**:
   - **Email**: `adviser@student.buksu.edu.ph`
   - **Password**: `Password123!`
   - **Role**: `faculty` | **facultyRole**: `adviser` | **Title**: `Faculty Capstone Adviser`
   - **Capabilities**: Chapter manuscript approval via `SophisticatedDocumentViewer`, inline annotation, defense clearance endorsement, Tier 1 ADM signing.
7. **Defense Committee Secretary**:
   - **Email**: `secretary@student.buksu.edu.ph`
   - **Password**: `Password123!`
   - **Role**: `faculty` | **Title**: `Defense Committee Secretary / Instructor`
   - **Capabilities**: Live defense minutes recording (`/secretary-review`), Action Done Matrix row logging, Secretary Compliance Verification Gate digital signing.
8. **Committee Chair (Panelist 1 Lead)**:
   - **Email**: `panelchair@student.buksu.edu.ph`
   - **Password**: `Password123!`
   - **Role**: `faculty` | **Title**: `REC Chair / Associate Professor`
   - **Capabilities**: Oral defense hearing rubric evaluation, verdict confirmation, ADM row verification, Tier 3 ADM digital signing (row freezing).
9. **Committee Panelist 2 (Member)**:
   - **Email**: `panelist2@student.buksu.edu.ph`
   - **Password**: `Password123!`
   - **Role**: `faculty` | **Title**: `Panel Member / Assistant Professor`
   - **Capabilities**: Oral defense rubric scoring, ADM row verification, Tier 2 ADM digital signing.
10. **Committee Panelist 3 (Member)**:
    - **Email**: `panelist3@student.buksu.edu.ph`
    - **Password**: `Password123!`
    - **Role**: `faculty` | **Title**: `Panel Member / Assistant Professor`
    - **Capabilities**: Oral defense rubric scoring, ADM row verification, Tier 2 ADM digital signing.
11. **College Dean (Institutional Degree Clearance)**:
    - **Email**: `dean@student.buksu.edu.ph`
    - **Password**: `Password123!`
    - **Role**: `faculty` (or `admin`) | **Title**: `Dean, College of Technologies`
    - **Capabilities**: Institutional degree clearance sign-off on completion certificates and final approval sheets.

### Safe Seeding Strategy Complying with Pile B Rules:
- **Rule Boundary**: AGENTS.md Pile B strictly prohibits unauthorized database seeding or direct raw MongoDB mutations.
- **Compliance Implementation**:
  1. **Seeder Script**: Create `server/seeders/seed-canonical-role-accounts.js` (or `scripts/seed-canonical-role-accounts.mjs` on the whitelisted `scripts/` path) using official Mongoose models with `User.findOrCreate` logic.
  2. **API Fallback**: Alternatively, an automated setup runner can log in as `instructor@student.buksu.edu.ph` and invoke `POST /api/users` for any missing account, completely operating within authorized application APIs.

---

## 5. E2E Browser Testing Harness Architecture & Execution Plan

### Architectural Design:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        E2E PLAYWRIGHT TESTING HARNESS ARCHITECTURE                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                         LEAD TEST ORCHESTRATOR                                 │   │
│   │     Ingests ISO 29119-3 Matrix • Enforces State Prereqs • Manages Lifecycles   │   │
│   └──────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                          │                                             │
│                 ┌────────────────────────┴────────────────────────┐                    │
│                 ▼                                                 ▼                    │
│   ┌───────────────────────────┐                     ┌───────────────────────────┐      │
│   │    BROWSER WORKER POOL    │                     │     SESSION REGISTRY      │      │
│   │  • Chromium Engine        │                     │  • Multi-Context Storage  │      │
│   │  • 1440x900 & 390x844     │                     │  • 11 Dedicated Personas  │      │
│   │  • Light / Dark Modes     │                     │  • Zero Cross-Session Poll│      │
│   └─────────────┬─────────────┘                     └─────────────┬─────────────┘      │
│                 │                                                 │                    │
│                 └────────────────────────┬────────────────────────┘                    │
│                                          ▼                                             │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                    DETERMINISTIC ACTION & ASSERTION ENGINE                     │   │
│   │  • waitUntil: 'domcontentloaded' (networkidle strictly BANNED)                 │   │
│   │  • Session Hydration Wait (waitForSelector 'text=Initializing session...')     │   │
│   │  • Semantic Locators (getByRole, getByTestId, getByLabel)                      │   │
│   │  • Concrete Form Interactions (page.fill, page.click, page.setInputFiles)     │   │
│   │  • Zero Simulated Finishes (Strict expected vs actual DOM validation)          │   │
│   └──────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                          │                                             │
│                                          ▼                                             │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                       EVIDENCE & REPORTING GATEWAY                             │   │
│   │  • Screenshot Evidence (scratch/qa-evidence/<role>_<step>.png)                 │   │
│   │  • ISO/IEC/IEEE 29119-3 Markdown Table Generator                               │   │
│   │  • Structured JSON Metrics & Diagnostic Failure Tracing                        │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Critical Anti-Simulation Runtime Invariants:

1. **Prohibition of Simulated Finishes**:
   - In previous scripts, `scripts/e2e-capstone-core-scenarios.js` lines 258–261 and `scripts/qa-test-runner.js` lines 406–414 merely set `status: 'Pass'` with a static summary string whenever the browser arrived on a page, without testing the interactions.
   - The new harness requires **Observable Evidence**: a test case is marked **Pass** ONLY when the live DOM displays the specific confirmation banner, badge change, updated row, or signature hash. If an alert or timeout occurs, it MUST fail.
2. **Mandatory `networkidle` Ban**:
   - `page.waitForLoadState('networkidle')` is strictly prohibited. CMS-V2's real-time notification poller (`/api/notifications?page=1&limit=1`) and WebSockets keep connections alive, causing `networkidle` to hang indefinitely.
   - All page navigation must use `{ waitUntil: 'domcontentloaded' }` combined with targeted state assertions (`await expect(page.getByRole('heading', ...)).toBeVisible()`).
3. **Session Hydration & Skeleton Settle Wait**:
   - Every login or route transition must invoke:
     ```javascript
     await page.waitForSelector('text=Initializing session...', { state: 'detached', timeout: 15000 }).catch(() => {});
     await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 8000 }).catch(() => {});
     ```
4. **Isolated Browser Contexts**:
   - Every role persona uses a fresh browser context:
     ```javascript
     const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
     ```
     This prevents dirty token/cookie leakage between Student, Instructor, Adviser, Secretary, and Panelists.
5. **Hard Watchdog Timeout & Process Teardown**:
   - A 110-second watchdog (`setTimeout(() => { process.exit(1); }, 110000)`) guarantees that no orphaned browser process hangs CI or background agent turns.
   - All runs use `try { ... } finally { clearTimeout(watchdog); if (browser) await browser.close(); }`.

---

## 6. Step-by-Step Role Scenario Execution Scripts & Validation Checkpoints

The execution plan comprises **14 chained, non-simulated scenarios** executed sequentially across the dedicated accounts:

### Scenario 1: Student Team Formation & Roster Locking (Phase 0)
- **Actor**: Student Lead (`student@student.buksu.edu.ph`)
- **Route**: `/teams`
- **Actions**:
  1. Authenticate as Student Lead.
  2. Navigate to `/teams`. Verify active team workspace loads.
  3. Inspect member roster and role badges (`Project Lead`, `Frontend Developer`, etc.).
  4. Click "Lock Team Roster" button. Confirm modal dialog.
- **Verification Checkpoint**:
  - `await expect(page.locator('text=Roster Locked')).toBeVisible();`
  - Member edit and invite controls become disabled.
  - Screenshot: `scratch/qa-evidence/01_phase0_team_roster_locked.png`.

### Scenario 2: Instructor Faculty Committee Appointment (Phase 0)
- **Actor**: Course Instructor (`instructor@student.buksu.edu.ph`)
- **Route**: `/committee-assignments`
- **Actions**:
  1. Authenticate as Instructor.
  2. Navigate to `/committee-assignments`. Select team.
  3. Open "Assign Committee" modal.
  4. Select Adviser: `Prof. Leon Mentor` (`adviser@student.buksu.edu.ph`).
  5. Select Secretary: `Prof. Steven Joe Bautista` (`secretary@student.buksu.edu.ph`).
  6. Select Panelist 1 (Chair): `Prof. Louie Jay Labastida` (`panelchair@student.buksu.edu.ph`).
  7. Select Panelist 2: `Prof. Raul Lecaros` (`panelist2@student.buksu.edu.ph`).
  8. Select Panelist 3: `Prof. Joseph Abella` (`panelist3@student.buksu.edu.ph`).
  9. Click "Save Committee Assignment".
- **Verification Checkpoint**:
  - `await expect(page.locator('text=Committee assigned successfully')).toBeVisible();`
  - Verify 5 distinct faculty cards render with no duplicates and zero conflict alerts.
  - Screenshot: `scratch/qa-evidence/02_phase0_committee_assigned.png`.

### Scenario 3: Student Title Proposal Submission & Pre-Scan (Phase 1)
- **Actor**: Student Lead (`student@student.buksu.edu.ph`)
- **Route**: `/project/create`
- **Actions**:
  1. Authenticate as Student Lead.
  2. Navigate to `/project/create`.
  3. Enter Proposal 1 Title: `"BukSU Smart Campus Energy Management System"`.
  4. Enter Problem Statement, Objectives, and Technical Stack.
  5. Select UN SDG 7 (Affordable Clean Energy) and IT Discipline (Software Engineering & IoT).
  6. Click "Run Archive Pre-Scan". Await similarity response.
  7. Click "Submit Title Proposals".
- **Verification Checkpoint**:
  - Pre-scan meter shows compliant similarity (< 20%).
  - `await expect(page.locator('text=Proposal submitted successfully')).toBeVisible();`
  - Redirected to `/project/approval` with status `Pending Defense Hearing`.
  - Screenshot: `scratch/qa-evidence/03_phase1_title_submitted.png`.

### Scenario 4: Instructor Proposal Hearing Scoring & Title Approval (Phase 1)
- **Actor**: Course Instructor (`instructor@student.buksu.edu.ph`)
- **Route**: `/scheduling-center` / `/projects`
- **Actions**:
  1. Authenticate as Instructor.
  2. Open team's Title Hearing evaluation dialog.
  3. Enter rubric scores (total >= 75%).
  4. Select Title 1 as "Approved Title".
  5. Click "Confirm Title Approval".
- **Verification Checkpoint**:
  - `await expect(page.locator('text=Title approved successfully')).toBeVisible();`
  - Project status transitions to `stage: 'proposal_approved'`.
  - Manuscript template widget unlocks on student dashboard.
  - Screenshot: `scratch/qa-evidence/04_phase1_title_approved.png`.

### Scenario 5: Student Manuscript Chapters 1–3 Upload (Phase 2)
- **Actor**: Student Lead (`student@student.buksu.edu.ph`)
- **Route**: `/submissions`
- **Actions**:
  1. Authenticate as Student Lead.
  2. Navigate to `/submissions`. Open Capstone 1 (Chapters 1–3) accordion.
  3. Upload Chapter 1 DOCX/PDF fixture.
  4. Upload Chapter 2 DOCX/PDF fixture.
  5. Upload Chapter 3 DOCX/PDF fixture.
  6. Await plagiarism screening worker completion.
- **Verification Checkpoint**:
  - All 3 chapters display `Uploaded` status badges with version numbers (`v1`).
  - Plagiarism compliance badge renders green `< 25% Similarity`.
  - Screenshot: `scratch/qa-evidence/05_phase2_chapters_uploaded.png`.

### Scenario 6: Adviser Chapter Review & Defense Endorsement (Phase 2)
- **Actor**: Capstone Adviser (`adviser@student.buksu.edu.ph`)
- **Route**: `/adviser/team-review`
- **Actions**:
  1. Authenticate as Adviser.
  2. Navigate to `/adviser/team-review`. Open team submission.
  3. Verify `SophisticatedDocumentViewer` mounts correctly with OOXML preview and zoom controls.
  4. Add review comment on Chapter 1.
  5. Click "Endorse Chapters for Proposal Defense".
- **Verification Checkpoint**:
  - `await expect(page.locator('text=Adviser Endorsement Verified')).toBeVisible();`
  - Project reflects `adviserEndorsed: true`.
  - Screenshot: `scratch/qa-evidence/06_phase2_adviser_endorsed.png`.

### Scenario 7: Instructor Defense Scheduling (Phase 2)
- **Actor**: Course Instructor (`instructor@student.buksu.edu.ph`)
- **Route**: `/scheduling-center`
- **Actions**:
  1. Authenticate as Instructor.
  2. Navigate to `/scheduling-center`.
  3. Locate team in defense-ready queue. Click "Schedule Defense".
  4. Select Date (upcoming weekday), Time Slot (e.g. 09:00 AM - 10:30 AM), Venue ("COT Room 302 / Zoom").
  5. Click "Confirm Defense Schedule".
- **Verification Checkpoint**:
  - `await expect(page.locator('text=Defense scheduled successfully')).toBeVisible();`
  - Calendar displays booked defense block.
  - Screenshot: `scratch/qa-evidence/07_phase2_defense_scheduled.png`.

### Scenario 8: Secretary Defense Minutes & ADM v1 Logging (Phase 2)
- **Actor**: Committee Secretary (`secretary@student.buksu.edu.ph`)
- **Route**: `/secretary-review`
- **Actions**:
  1. Authenticate as Secretary.
  2. Navigate to `/secretary-review?projectId=<id>`.
  3. Click "Defense Minutes" tab. Enter oral defense minutes summary.
  4. Click "Action Done Matrix" tab.
  5. Click "Add Recommendation Item". Enter:
     - Recommendation: `"Refine system architecture diagram in Chapter 3 to include Redis cache layer."`
     - Action Taken: `"Updated Figure 3.2 on Page 45 with Redis cache architecture."`
     - Page Ref: `"Page 45"`
  6. Click "Save ADM Item".
- **Verification Checkpoint**:
  - ADM v1 table displays row with status badge `Pending Verification`.
  - Screenshot: `scratch/qa-evidence/08_phase2_secretary_adm_logged.png`.

### Scenario 9: Panel Scoring & ADM Row Verification (Phase 2)
- **Actor**: Panel Chair (`panelchair@student.buksu.edu.ph`)
- **Route**: `/secretary-review` or `/projects/:id`
- **Actions**:
  1. Authenticate as Panel Chair.
  2. Navigate to evaluation rubrics tab. Enter rubric criteria scores (>= 75%).
  3. Switch to Action Done Matrix tab.
  4. Click "Verify Item" on pending ADM row.
- **Verification Checkpoint**:
  - Row status transitions to green `Verified` badge.
  - Rubric status indicates passing score.
  - Screenshot: `scratch/qa-evidence/09_phase2_panel_verified.png`.

### Scenario 10: Secretary Endorsement & Multi-Tier Digital ADM Sign-Off (Phase 2)
- **Actors**: Secretary, Adviser, Instructor, Panelists, Chair
- **Route**: `/projects/:id` (Action Done Matrix Tab)
- **Actions**:
  1. **Secretary** logs in: Clicks "Sign Secretary Endorsement", signs canvas, submits.
     - Checkpoint: `project.admSignatures.secretary.endorsed === true`. Gate banner turns green. Tier 1–3 cards unlock.
  2. **Adviser** logs in: Signs Tier 1 Adviser card.
     - Checkpoint: Adviser signature and timestamp displayed.
  3. **Instructor** logs in: Signs Tier 1 Instructor card.
  4. **Panelists** log in: Sign Tier 2 Panelist cards.
  5. **Chair** logs in: Signs Tier 3 Chair card.
- **Verification Checkpoint**:
  - All signature cards display verified digital signatures.
  - Instructor clicks "Release Grades". Project advances to Capstone 2 (Phase 3).
  - Screenshot: `scratch/qa-evidence/10_phase2_adm_signatories_board.png`.

### Scenario 11: Student Capstone 2 Prototype Demo & Gantt Tracking (Phase 3)
- **Actor**: Student Lead (`student@student.buksu.edu.ph`)
- **Route**: `/submissions?tab=capstone_3`
- **Actions**:
  1. Authenticate as Student Lead.
  2. Navigate to `/submissions?tab=capstone_3`.
  3. Fill Interactive Gantt Chart tasks (Sprint 1–4 completion).
  4. Input GitHub Repository URL: `https://github.com/buksu-cms/smart-campus`.
  5. Input Working Prototype Staging Demo URL: `https://smartcampus.buksu.edu.ph`.
  6. Upload Chapter 4 (Results & System Prototype).
- **Verification Checkpoint**:
  - Gantt overall completion reflects updated percentage.
  - Prototype showcase renders interactive staging link and media preview.
  - Screenshot: `scratch/qa-evidence/11_phase3_prototype_demo.png`.

### Scenario 12: Progress Defense Evaluation & ADM v2 Sign-Off (Phase 3)
- **Actors**: Instructor, Secretary, Panelists, Adviser
- **Actions**:
  1. Instructor schedules Progress Defense.
  2. Panelists evaluate prototype demo and score progress rubrics.
  3. Secretary logs progress recommendations into ADM v2.
  4. Panelists verify ADM v2 rows.
  5. Secretary signs ADM v2 endorsement.
  6. Adviser, Instructor, Panelists, Chair sign ADM v2.
- **Verification Checkpoint**:
  - ADM v2 signed and locked.
  - Project advances to Capstone 3 (Phase 4).
  - Screenshot: `scratch/qa-evidence/12_phase3_progress_adm_signed.png`.

### Scenario 13: Capstone 3 Final Defense, ADM v3 & Dean Institutional Clearance (Phase 4)
- **Actors**: Student Lead, Instructor, Secretary, Panelists, Adviser, Dean
- **Actions**:
  1. Student uploads compiled 5-Chapter manuscript + journal paper. Deep vector scan passes (< 25%).
  2. Instructor schedules Final Oral Defense hearing.
  3. Panelists score final defense rubrics (Passing).
  4. Secretary logs final ADM v3 rows; Panelists verify rows.
  5. Secretary signs Secretary Compliance Verification Endorsement.
  6. Adviser (Tier 1), Instructor (Tier 1), Panelists (Tier 2), and Chair (Tier 3) sign digital signatures.
  7. **College Dean** (`dean@student.buksu.edu.ph`) logs in: reviews completion packet and signs Institutional Degree Clearance.
- **Verification Checkpoint**:
  - Dean signature hash recorded.
  - Automatic S3/MinIO archival triggers: `projectStatus = 'archived'`.
  - Screenshot: `scratch/qa-evidence/13_phase4_dean_clearance_signed.png`.

### Scenario 14: Archival Verification, Read-Only Lock & QR Certificate (Phase 4)
- **Actor**: Any User / Public
- **Route**: `/archive`, `/projects/:projectId/certificate`
- **Actions**:
  1. Navigate to `/archive`. Search for `"BukSU Smart Campus Energy Management System"`.
  2. Verify project appears with green `Archived` institutional record badge.
  3. Open project detail: verify all forms/uploads are disabled (read-only lock).
  4. Navigate to `/projects/:projectId/certificate`.
- **Verification Checkpoint**:
  - Official BukSU Capstone Completion Certificate renders with College of Technologies seal, Dean signature, student proponent roster, and public QR code verification seal.
  - Screenshot: `scratch/qa-evidence/14_phase4_completion_certificate_qr.png`.

---

## 7. ISO/IEC/IEEE 29119-3 Execution Matrix

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|:---|:---|:---|:---|:---|:---|:---:|:---|
| **TC-E2E-001** | Phase 0: Student Team Formation & Roster Lock | 1. Login as Student Lead.<br>2. Open `/teams`.<br>3. Review members & roles.<br>4. Click Lock Roster. | User: `student@student.buksu.edu.ph`<br>Role: `student` | Roster status updates to locked; edits disabled. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-002** | Phase 0: Instructor Committee Assignment | 1. Login as Instructor.<br>2. Open `/committee-assignments`.<br>3. Select 5 distinct faculty.<br>4. Save assignment. | User: `instructor@student.buksu.edu.ph`<br>Faculty: Mentor, Bautista, Labastida, Lecaros, Abella | Committee assigned; no instructor or duplicate conflicts. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-003** | Phase 1: Title Proposal Submission & Pre-scan | 1. Login as Student Lead.<br>2. Open `/project/create`.<br>3. Fill title, SDGs, discipline.<br>4. Run pre-scan.<br>5. Submit. | Title: `Smart Campus EMS`<br>SDG: `7, 11`<br>Discipline: `Software Engineering` | Pre-scan shows < 20% similarity; proposal status submitted. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-004** | Phase 1: Title Hearing & Approval | 1. Login as Instructor.<br>2. Open Title Approval.<br>3. Score rubric.<br>4. Approve Title 1. | User: `instructor@student.buksu.edu.ph`<br>Score: `88%`<br>Status: `Approved` | `titleStatus = 'approved'`; manuscript template unlocked. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-005** | Phase 2: Chapters 1–3 Upload & Plagiarism Gate | 1. Login as Student Lead.<br>2. Open `/submissions`.<br>3. Upload Ch 1–3.<br>4. Await scan. | Files: Ch1.docx, Ch2.docx, Ch3.docx<br>Threshold: `< 25%` | All chapters show `Uploaded`; originality >= 75%. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-006** | Phase 2: Adviser Review & Endorsement | 1. Login as Adviser.<br>2. Open submission review.<br>3. Inspect via SophisticatedDocumentViewer.<br>4. Endorse defense. | User: `adviser@student.buksu.edu.ph`<br>Action: `Endorse` | Adviser endorsement badge rendered with timestamp. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-007** | Phase 2: Instructor Defense Scheduling | 1. Login as Instructor.<br>2. Open `/scheduling-center`.<br>3. Select team.<br>4. Schedule slot & room. | Slot: `09:00 AM - 10:30 AM`<br>Venue: `COT Room 302` | Defense calendar reflects booked session; status scheduled. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-008** | Phase 2: Secretary Minutes & ADM v1 Logging | 1. Login as Secretary.<br>2. Open `/secretary-review`.<br>3. Log defense minutes.<br>4. Add ADM v1 recommendation rows. | User: `secretary@student.buksu.edu.ph`<br>Milestone: `CAPSTONE_1` | Defense minutes saved; ADM rows logged as pending. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-009** | Phase 2: Panel Scoring & ADM Verification | 1. Login as Panel Chair.<br>2. Score rubric (>= 75%).<br>3. Verify ADM row. | User: `panelchair@student.buksu.edu.ph`<br>Status: `Verified` | Rubric passing score recorded; row status verified. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-010** | Phase 2: Secretary Endorsement & Multi-Tier ADM Sign-Off | 1. Secretary signs endorsement.<br>2. Adviser signs Tier 1.<br>3. Instructor signs Tier 1.<br>4. Panelists sign Tier 2.<br>5. Chair signs Tier 3. | Signatures: Secretary, Adviser, Instructor, Panelists, Chair | All signatures rendered; grades released; stage advances to Capstone 2. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-011** | Phase 3: Gantt Milestone Tracking & Prototype Demo | 1. Login as Student Lead.<br>2. Open Capstone 3 tab.<br>3. Update Gantt chart.<br>4. Link GitHub repo & demo URL.<br>5. Upload Ch 4. | Repo: `github.com/...`<br>Demo: `smartcampus...`<br>File: Ch4.docx | Gantt progress updated; prototype showcase live; Ch 4 uploaded. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-012** | Phase 3: Progress Defense & ADM v2 Sign-off | 1. Schedule progress defense.<br>2. Panel scores rubrics.<br>3. Secretary logs & endorses ADM v2.<br>4. Committee signs ADM v2. | Milestone: `CAPSTONE_2` | ADM v2 fully signed; project advances to Capstone 3 (Phase 4). | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-013** | Phase 4: Final Defense, ADM v3 & Dean Degree Clearance | 1. Upload Ch 1–5 compilation.<br>2. Vector scan passes (< 25%).<br>3. Final defense hearing & rubric.<br>4. ADM v3 verified & endorsed.<br>5. Committee & Dean sign. | Milestone: `CAPSTONE_3`<br>Signatories: Committee + Dean Bagor | Dean clearance recorded; atomic S3 archival triggered. | `[Pending Execution]` | Live Playwright DOM assertion |
| **TC-E2E-014** | Phase 4: Archival Ingestion & QR Certificate Verification | 1. Open `/archive`.<br>2. Verify read-only locked status.<br>3. Open `/projects/:id/certificate`. | Project: `Smart Campus EMS`<br>Status: `archived` | Archived project read-only; completion certificate with QR seal rendered. | `[Pending Execution]` | Live Playwright DOM assertion |

---

## 8. Recommendations for Implementation Phase

1. **Dedicated Seeder Script**:
   - Provide an updated seeder `server/seeders/seed-canonical-role-accounts.js` that creates all 11 canonical accounts with standard naming, valid BukSU domains, and accurate institutional role appointments.
2. **Refactor E2E Test Runner**:
   - Replace the simulated finishes in `scripts/e2e-capstone-core-scenarios.js` and `scripts/qa-test-runner.js` with the 14-scenario architecture defined above.
   - Remove any instance of `waitForLoadState('networkidle')`.
   - Incorporate `waitForSessionAndContent` to prevent premature interaction during session loading.
3. **Execution Script**:
   - Expose an npm script `npm run test:browser:roles` or `node scripts/test-all-roles-browser.mjs` that runs headless Playwright across all 11 accounts and outputs the filled ISO 29119-3 execution evidence to `scratch/qa-reports/`.
