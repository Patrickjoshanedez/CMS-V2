# DOM Verification Checkpoints & E2E Role Workflow Specification (Scenarios 1–14)

**Target Platform**: BukSU Capstone Management System V2 (CMS-V2)  
**Investigator**: `e2e_spec_miner_3` (Specification Miner)  
**Standards**: ISO/IEC/IEEE 29119-3 & ASDLC v2.0 Compliant  
**Date**: November 14, 2026  
**State Folder**: `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_spec_miner_3\`

---

## 1. Executive Summary & Test Runtime Architecture

This document establishes the **exhaustive, authoritative DOM verification checkpoints, semantic selectors, API contracts, input controls, and assertions** for all **14 End-to-End Scenarios** spanning **Phases 0 through 4** and across all **11 Dedicated Seed Personas**.

### Core Execution Invariants (Anti-Simulation Standard)
1. **Zero Simulated Finishes**:
   - Every scenario MUST perform concrete browser actions: filling forms (`page.fill`), toggling checkboxes (`page.check`), selecting comboboxes, uploading files (`page.setInputFiles`), and clicking submission buttons (`page.click`).
   - Every checkpoint MUST verify concrete live DOM states: visibility of confirmation banners, text changes, status badges, updated table cells, or signature hashes. Tests NEVER emit a static synthetic `Pass` without verifiable DOM mutations.
2. **Mandatory `networkidle` Ban**:
   - `page.waitForLoadState('networkidle')` is strictly prohibited across all tests. CMS-V2's real-time notification poller (`/api/notifications?page=1&limit=1`) and WebSockets keep connections perpetually active, causing `networkidle` to hang indefinitely.
   - All navigations and transitions MUST use `{ waitUntil: 'domcontentloaded' }` coupled with semantic locator assertions.
3. **Session Hydration & Skeleton Settle Protocol**:
   - On initial page load or route transition, tests MUST await session restoration detachment:
     ```javascript
     await page.waitForSelector('text=Initializing session...', { state: 'detached', timeout: 15000 }).catch(() => {});
     await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 8000 }).catch(() => {});
     ```
4. **Isolated Browser Contexts**:
   - Each persona session operates in an isolated browser context (`browser.newContext({ viewport: { width: 1440, height: 900 } })`) with clean storage to prevent cookie and JWT token pollution across roles.
5. **Hard Watchdog Timeout & Process Safety**:
   - All test workers enforce a strict 110-second watchdog timeout (`setTimeout(() => process.exit(1), 110000)`) with teardown in `finally` blocks.

---

## 2. Dedicated Seed Personas & Authentication Matrix

All seed accounts share the default development password: `Password123!`.

| # | Persona Role | Canonical Email | System Role | Institutional Appointment / Capacity | Section / Department |
|---|---|---|---|---|---|
| 1 | **Student Lead** | `student@student.buksu.edu.ph` | `student` | Project Lead & Systems Analyst (Team Alpha) | BSIT-4A (T87) |
| 2 | **Student Member 2** | `student2@student.buksu.edu.ph` | `student` | Frontend & UI/UX Developer (Team Alpha) | BSIT-4A (T87) |
| 3 | **Student Member 3** | `student3@student.buksu.edu.ph` | `student` | Backend & Database Developer (Team Alpha) | BSIT-4A (T87) |
| 4 | **Student Member 4** | `student4@student.buksu.edu.ph` | `student` | QA & Technical Documentor (Team Alpha) | BSIT-4A (T87) |
| 5 | **Course Instructor** | `instructor@student.buksu.edu.ph` | `instructor` | Capstone Coordinator / Course Instructor | Information Technology |
| 6 | **Capstone Adviser** | `adviser@student.buksu.edu.ph` | `faculty` | Faculty Capstone Adviser (Team Alpha) | Information Technology |
| 7 | **Committee Secretary** | `secretary@student.buksu.edu.ph` | `faculty` | Committee Secretary (Team Alpha) | Information Technology |
| 8 | **Panel Chair (Lead)**| `panelchair@student.buksu.edu.ph` | `faculty` | Research Ethics / Panel Chair (Panelist 1) | Information Technology |
| 9 | **Panel Member 2** | `panelist2@student.buksu.edu.ph` | `faculty` | Defense Panelist (Panel Member 1) | Information Technology |
| 10 | **Panel Member 3** | `panelist3@student.buksu.edu.ph` | `faculty` | Defense Panelist (Panel Member 2) | Information Technology |
| 11 | **College Dean** | `dean@student.buksu.edu.ph` | `faculty` | Dean, College of Technologies | College of Technologies |

---

## 3. Systematic Scenario Specifications (Scenarios 1–14)

---

### SCENARIO 1: Student Team Formation & Roster Locking (Phase 0)

* **Objective**: Authenticate as Student Lead, verify team workspace, ensure all members have assigned standardized roles, and lock the team roster to conclude Phase 0.
* **Actor**: Student Lead (`student@student.buksu.edu.ph`)
* **Route**: `/teams`
* **Client View**: `client/src/pages/teams/TeamsPage.jsx` $\to$ `StudentTeamView.jsx` $\to$ `StudentTeamDetail.jsx`
* **API Endpoints**:
  - `GET /api/teams/me` $\to$ 200 OK `{ success: true, data: { team } }`
  - `PATCH /api/teams/:id/members/:memberId/role` $\to$ 200 OK `{ success: true, data: { team } }`
  - `PATCH /api/teams/:id/lock` $\to$ 200 OK `{ success: true, message: 'Team finalized successfully.', data: { team } }`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Page Navigation | `page.goto('/teams')` | — | `await expect(page.getByRole('heading', { name: /Team Workspace\|Team/i })).toBeVisible()` |
| Session Hydration | `page.locator('text=Initializing session...')` | — | `await expect(page.locator('text=Initializing session...')).toHaveCount(0)` |
| Team Workspace Header | `page.locator('h2')` | Team Name | Displays team name; status badge displays `Formation Open` |
| Member Roles Guide | `page.getByRole('button', { name: /Roles Guide/i })` | Click | Guide expands showing 5 BukSU Standard Capstone Roles |
| Role Assignment (if unassigned)| `page.getByRole('button', { name: /Assign Role\|Select Role/i })` | `'Project Lead & Systems Analyst'` | Badge reflects selected role; toast notification: `'Team role updated.'` |
| Lock Trigger Button | `page.getByRole('button', { name: /Finalize & Lock Team/i })` | Click | Triggers confirmation `AlertDialog` |
| Lock Confirm Dialog | `page.getByRole('alertdialog')` | Visible | Displays title: `"Finalize and lock the team roster?"` and description: `"This prepares your team for proposal submission."` |
| Confirm Lock Action | `page.getByRole('button', { name: /Finalize and lock/i })` | Click | Triggers `PATCH /api/teams/:id/lock` |
| Status Badge Update | `page.locator('text=Team Finalized')` | Visible | Badge switches from `Formation Open` to `Team Finalized` with Lock icon |
| Proposal Readiness Badge | `page.locator('text=Ready for Proposal Submission')` | Visible | CheckCircle2 icon + `"Ready for Proposal Submission"` badge renders |
| Unlock Roster Button | `page.getByRole('button', { name: /Unlock Roster/i })` | Visible | Leader action toggles to Unlock Roster button |
| Disabled Member Controls | Member edit / invite buttons | Disabled | Member role selectors and invite controls become disabled |
| Evidence Screenshot | `scratch/qa-evidence/01_phase0_team_roster_locked.png` | — | File captured |

#### Boundary & Error States
- **Incomplete Member Profiles**: If any student member lacks `studentId`, `academicTerm`, `sectionId`, or `instructorId`, backend returns HTTP 400 `TEAM_MEMBER_PROFILE_INCOMPLETE`: `"Every team member must complete Student ID, matching academic term and section, and Capstone Instructor details before the roster can be locked."`
- **Missing Roles Guard**: If any member has no role assigned, `Finalize & Lock Team` button is disabled (`!allRolesAssigned`).
- **Post-Approval Lock**: Once Capstone 1 title is approved, non-instructors cannot unlock the roster (HTTP 403 `TITLE_ALREADY_APPROVED`).

---

### SCENARIO 2: Instructor Faculty Committee Appointment (Phase 0)

* **Objective**: Authenticate as Course Instructor, access Committee Assignments Center, and appoint exactly 5 distinct faculty members (1 Adviser, 1 Secretary, 3 Defense Panelists) without duplicates or instructor inclusion.
* **Actor**: Course Instructor (`instructor@student.buksu.edu.ph`)
* **Route**: `/committee-assignments` (or `/teams`)
* **Client View**: `client/src/pages/instructor/CommitteeAssignmentsPage.jsx` $\to$ `TeamCommitteeAssignmentsView.jsx` (or `AssignCommitteeDialog.jsx`)
* **API Endpoints**:
  - `GET /api/teams?page=1&limit=100` $\to$ 200 OK
  - `GET /api/users?role=faculty&isActive=true&limit=200` $\to$ 200 OK (automatically expands to `{ $in: ['faculty', 'adviser', 'panelist'] }`)
  - `PUT /api/teams/:id/committee` $\to$ 200 OK `{ success: true, message: 'Faculty committee assigned and team notified.', data: { team } }`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Page Navigation | `page.goto('/committee-assignments')` | — | `await expect(page.getByRole('heading', { name: 'Committee Assignments' })).toBeVisible()` |
| Team Jump Selector | `page.getByRole('combobox', { name: 'Jump to team' })` | Select Team Alpha | Left pane displays team profile, proposed title, and 4 enrolled proponents |
| Committee Board Header | `page.getByText('Faculty Committee Board')` | Visible | Counter displays current appointments (e.g. `0 / 5 Appointed` or `5 / 5 Appointed`) |
| Adviser Combobox | `page.locator('#adviser-assignment-combobox')` | Search: `"Leon Mentor"` | Selects `Prof. Leon Mentor` (`adviser@student.buksu.edu.ph`) |
| Secretary Combobox | `page.locator('#secretary-assignment-combobox')` | Search: `"Steven Joe Bautista"` | Selects `Prof. Steven Joe Bautista` (`secretary@student.buksu.edu.ph`) |
| Panelist Add Combobox | `page.locator('#panelist-add-combobox')` | Search: `"Louie Jay Labastida"` | Appoints `Prof. Louie Jay Labastida` as Lead / Chair (Panelist 1) |
| Panelist Add Combobox | `page.locator('#panelist-add-combobox')` | Search: `"Raul Lecaros"` | Appoints `Prof. Raul Lecaros` as Panel Member 1 (Panelist 2) |
| Panelist Add Combobox | `page.locator('#panelist-add-combobox')` | Search: `"Joseph Abella"` | Appoints `Prof. Joseph Abella` as Panel Member 2 (Panelist 3) |
| Counter Assertion | `page.getByText('5 / 5 Appointed')` | Visible | Counter updates to `5 / 5 Appointed` |
| Save Button | `page.getByRole('button', { name: /Save & Broadcast Assignments/i })` | Click | Triggers `PUT /api/teams/:id/committee` |
| Success Toast | Sonner Toast | Visible | Toast: `"Faculty committee assigned and team notified."` |
| Committee Roster Cards | 5 appointed cards render | Visible | Cards display names, emails, active team counts, and zero conflict warnings |
| Evidence Screenshot | `scratch/qa-evidence/02_phase0_committee_assigned.png` | — | File captured |

#### Boundary & Error States
- **Instructor Exclusion Rule**: Instructors (`role: 'instructor'`) are strictly excluded from `FacultySearchCombobox`. If an instructor ID is submitted via API, backend rejects with HTTP 400 `INSTRUCTOR_COMMITTEE_EXCLUSION`.
- **Role Duplication**: Selecting a faculty member already assigned as Adviser as Secretary triggers toast: `"This faculty member is already assigned as Capstone Adviser on this team."`
- **Incomplete Panel**: If fewer than 3 panelists are assigned when scheduling defense hearings, validation alerts flag missing slots.

---

### SCENARIO 3: Student Title Proposal Submission & Pre-Scan (Phase 1)

* **Objective**: Authenticate as Student Lead, access Phase 1 Proposal Studio, fill 1..10 candidate title proposals with pitch deck details (Objectives, Tech Stack, Problem Statement), execute archive pre-scan, and submit for committee review.
* **Actor**: Student Lead (`student@student.buksu.edu.ph`)
* **Route**: `/project/create`
* **Client View**: `client/src/pages/projects/CreateProjectPage.jsx`
* **API Endpoints**:
  - `POST /api/projects/title-check` $\to$ 200 OK `{ success: true, data: { similarProjects: [], threshold: 20 } }`
  - `POST /api/projects` $\to$ 201 Created `{ success: true, data: { project } }`
  - `POST /api/projects/:id/title/submit` $\to$ 200 OK `{ success: true, message: 'Proposals submitted for committee defense review.' }`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Page Navigation | `page.goto('/project/create')` | — | `await expect(page.getByRole('heading', { name: 'Capstone 1: Title proposals' })).toBeVisible()` |
| Proposal Title Input | `page.locator('#proposal-0-title')` | `"BukSU Smart Campus Energy Management System"` | Min 10 characters required |
| Problem Statement | `page.getByLabel('Problem Statement & Literature Gap')` | `"Inefficient campus power distribution and lack of IoT analytics in facilities."` | Min 10 characters required |
| Objectives Input | `page.getByLabel('Objectives')` | `"1. Develop smart metering sensors.\n2. Build predictive consumption dashboard.\n3. Integrate automated alerting."` | Objectives populated |
| Technical Stack | `page.getByLabel('Technical Stack')` | `"React, Node.js, Express, MongoDB, MQTT, ESP32, Tailwind CSS"` | Tech stack populated |
| Proposed Solution | `page.getByLabel('Proposed Solution & Technical Framework')` | `"An on-premise hardware-software pipeline and intelligent web progressive dashboard."` | Solution populated |
| Innovation & Beneficiaries | Unique Innovation & Target Users | `"Edge IoT metering"`, `"BukSU Campus Facilities"` | Fields populated |
| Edit Disciplines Button | `page.locator('#proposal-0-discipline-btn')` | Click | Opens `AlignmentSelectorDialog` |
| Select Discipline | Alignment Dialog checkboxes | `'Software Engineering & IoT'` | Badge renders: `Field: Software Engineering & IoT` |
| Edit SDGs Button | `page.locator('#proposal-0-sdg-btn')` | Click | Opens `AlignmentSelectorDialog` |
| Select SDG | Alignment Dialog checkboxes | `'7 - Affordable and Clean Energy'` | Badge renders: `SDG 7` |
| Run Pre-Scan Button | `page.getByRole('button', { name: /Run First Similarity Scan\|Re-Verify Similarity/i })` | Click | Triggers `POST /api/projects/title-check` |
| Similarity Meter Checkpoint | `page.locator('text=Plagiarism similarity limit')` | Visible | Progress bar displays `< 20%`; status reflects `0.0% (Cleared)` |
| Submit Button | `page.getByRole('button', { name: /Submit for Committee Review/i })` | Click | Triggers `POST /api/projects` followed by `POST /:id/title/submit` |
| Success Toast | Sonner Toast | Visible | Toast: `"Proposals submitted for committee defense review."` |
| Post-Submit Redirect | URL Navigation | `/project/approval` | Page redirects to `/project/approval` with status `Pending Defense Hearing` |
| Evidence Screenshot | `scratch/qa-evidence/03_phase1_title_submitted.png` | — | File captured |

#### Boundary & Error States
- **Title Too Short**: Submitting a title with < 10 characters triggers toast: `"Each proposal must have a valid title (at least 10 characters), objectives, and technical stack."`
- **Similarity Conflict**: If similarity score $\ge 20\%$, `div[data-testid="similarity-conflict-banner"]` appears warning that proposal is flagged for committee scrutiny.

---

### SCENARIO 4: Instructor Proposal Hearing Scoring & Title Approval (Phase 1)

* **Objective**: Authenticate as Course Instructor, open the team's proposal evaluation studio in Project Details, ensure defense hearing is scheduled, select Proposal 1, and approve as official capstone title.
* **Actor**: Course Instructor (`instructor@student.buksu.edu.ph`)
* **Route**: `/projects/:id?tab=capstone_1`
* **Client View**: `client/src/pages/projects/ProjectDetailPage.jsx` $\to$ `Capstone1CollapsibleSections.jsx`
* **API Endpoints**:
  - `POST /api/projects/:id/title-proposals/:proposalId/comments` $\to$ 201 Created
  - `POST /api/projects/:id/title/approve` $\to$ 200 OK `{ success: true, message: 'Proposal 1 officially approved as capstone title!', data: { project } }`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Page Navigation | `page.goto('/projects/' + projectId + '?tab=capstone_1')` | — | `await expect(page.getByText('Phase 1 · Title Proposals & Candidate Blueprints')).toBeVisible()` |
| Expand Proposal Section | `page.getByRole('button', { name: /Phase 1 · Title Proposals/i })` | Click | Expands collapsible proposal section |
| Candidate Proposal Tab | `page.getByRole('button', { name: /1.*BukSU Smart Campus/i })` | Click | Focuses Proposal 1 candidate blueprint |
| Hearing Status Check | `page.locator('text=Title Proposal Hearing Scheduled')` | Visible | Green banner confirms scheduled date, time, and venue |
| Deliberation Studio | `page.getByText('Committee Deliberation & Official Decision')` | Visible | Decision studio renders for authorized instructors/committee |
| Decision Vote Button | `page.getByRole('button', { name: 'Approve Proposal as Official Title' })` | Click | Active ring highlights green `Approve` state |
| Deliberation Remarks | `page.getByPlaceholder(/Enter committee remarks, deliberation feedback/i)` | `"Approved with commendation on IoT energy architecture."` | Textarea populated |
| Submit Decision Action | `page.getByRole('button', { name: 'Submit Official Decision' })` | Click | Triggers `POST /api/projects/:id/title/approve` |
| Success Toast | Sonner Toast | Visible | Toast: `"Proposal 1 officially approved as capstone title!"` |
| Title Approved Badge | `page.getByText('Title Proposal Approved')` | Visible | Green check badge replaces pending status |
| Template Gate Unlocked | Student Team Workspace | — | Manuscript template widget unlocks in team workspace |
| Evidence Screenshot | `scratch/qa-evidence/04_phase1_title_approved.png` | — | File captured |

#### Boundary & Error States
- **Unscheduled Hearing Guard**: If no title hearing is scheduled (`!isScheduledOrDone`), clicking approve triggers toast: `"The proponent team must have a scheduled title proposal hearing before the title can be approved."` and opens `ScheduleDefenseModal`.
- **Revision Rejection**: Selecting `Request Revisions from Proponents` requires remarks; submitting triggers `POST /api/projects/:id/title/reject` sending status to `revision_required`.

---

### SCENARIO 5: Student Manuscript Chapters 1–3 Upload (Phase 2)

* **Objective**: Authenticate as Student Lead, navigate to Submissions workspace, open Capstone 1 accordion, upload Chapter 1, Chapter 2, and Chapter 3 files, and verify automated plagiarism screening queuing.
* **Actor**: Student Lead (`student@student.buksu.edu.ph`)
* **Route**: `/project/submissions`
* **Client View**: `client/src/pages/submissions/ProjectSubmissionsPage.jsx` $\to$ `UploadChapterModal.jsx`
* **API Endpoints**:
  - `POST /api/submissions/:projectId/chapters` $\to$ 201 Created `{ success: true, message: 'Chapter 1 uploaded successfully! Plagiarism scan queued.', data: { submission } }`
  - `GET /api/submissions/project/:projectId` $\to$ 200 OK `{ success: true, data: { submissions } }`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Page Navigation | `page.goto('/project/submissions')` | — | `await expect(page.getByRole('heading', { name: 'Project Submissions' })).toBeVisible()` |
| Chapter 1 Upload Trigger | `page.locator('[data-testid="upload-chapter-1-btn"]').or(page.getByRole('button', { name: /Upload Chapter 1/i }))` | Click | Opens `UploadChapterModal` locked to Chapter 1 |
| File Input Selection | `page.locator('input[type="file"]')` | `fixtures/Chapter1_Introduction.docx` | Displays filename and filesize in modal preview |
| Confirm Upload Button | `page.getByRole('button', { name: /Upload Chapter 1\|Submit Chapter/i })` | Click | Triggers `POST /api/submissions/:projectId/chapters` |
| Upload Success Toast | Sonner Toast | Visible | Toast: `"Chapter 1 uploaded successfully! Plagiarism scan queued."` |
| Repeat Ch 2 & Ch 3 | Upload Modal | `Chapter2.docx`, `Chapter3.docx` | All 3 chapters uploaded sequentially |
| Version Badge Verification | Chapter Cards in UI | `v1` | Chapters 1, 2, and 3 display `v1` badges |
| Status Badge | Status Pills | `Under Review` or `Uploaded` | Submission status reflects active review round |
| Originality Meter | Originality Indicator | `< 25%` | Similarity pill displays compliant score |
| Evidence Screenshot | `scratch/qa-evidence/05_phase2_chapters_uploaded.png` | — | File captured |

#### Boundary & Error States
- **Invalid File Type**: Uploading `.exe` or `.zip` triggers validation error: `"Invalid manuscript file type. Only PDF, DOCX, or TXT allowed."`
- **Exceeds Size**: Files $> 25\text{MB}$ trigger: `"Manuscript file exceeds maximum size (25MB)"`.
- **Late Submission Gate**: If submitted past the configured milestone deadline, `justificationLetter` and `lateJustification` fields are strictly required.

---

### SCENARIO 6: Adviser Chapter Review & Defense Endorsement (Phase 2)

* **Objective**: Authenticate as Capstone Adviser, navigate to Adviser Review Studio, inspect Chapter 1 manuscript in `SophisticatedDocumentViewer`, add an inline annotation, and endorse chapter submissions for Proposal Defense.
* **Actor**: Capstone Adviser (`adviser@student.buksu.edu.ph`)
* **Route**: `/adviser/team-review` $\to$ `/project/submissions/:submissionId/review`
* **Client View**: `client/src/pages/submissions/SubmissionReviewPage.jsx` $\to$ `SophisticatedDocumentViewer.jsx`
* **API Endpoints**:
  - `GET /api/submissions/:id/review-workspace` $\to$ 200 OK
  - `POST /api/submissions/:id/annotations` $\to$ 201 Created `{ success: true, data: { annotation } }`
  - `PATCH /api/submissions/:id/review` $\to$ 200 OK `{ success: true, data: { status: 'approved' } }`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Page Navigation | `page.goto('/adviser/team-review')` | — | `await expect(page.getByRole('heading', { name: 'Adviser Review' })).toBeVisible()` |
| Select Team Submission | `page.getByRole('link', { name: /Chapter 1.*Team Alpha/i })` | Click | Navigates to `/project/submissions/:id/review` |
| Reviewer Role Banner | `page.locator('text=You are reviewing as Capstone Adviser')` | Visible | Blue banner confirms Adviser authority and decision rights |
| Sophisticated Viewer Mount | `page.locator('.docx-preview-wrapper').or(page.getByTitle('Document Viewer Canvas'))` | Visible | Document Identity Bar, zoom controls (`+`, `-`, `%`), and OOXML canvas load |
| Switch to Comments Tab | `page.getByRole('tab', { name: /Comments/i })` | Click | Threaded comment feed renders |
| Textarea Overall Notes | `page.locator('#overallNotes')` | `"Chapter 1 introduction, theoretical background, and scope are well structured. Ready for proposal defense."` | Decision notes populated |
| Approve Round Button | `page.getByRole('button', { name: 'Approve Round' })` | Click | Triggers `PATCH /api/submissions/:id/review` with `status: 'approved'` |
| Success Toast | Sonner Toast | Visible | Toast: `"Round approved and closed."` |
| Approved Status Indicator | `page.locator('text=✓ This round has been closed')` | Visible | Green checkmark confirms round completion |
| Evidence Screenshot | `scratch/qa-evidence/06_phase2_adviser_endorsed.png` | — | File captured |

#### Boundary & Error States
- **Unauthorized Role Guard**: Users lacking Adviser or Instructor appointment cannot click `Approve Round` (shows `"You do not have decision-making authority for this project."`).
- **Closed Round Immutability**: If a round is closed, further approval mutations are blocked.

---

### SCENARIO 7: Instructor Defense Scheduling (Phase 2)

* **Objective**: Authenticate as Course Instructor, access Scheduling Center, locate Team Alpha with endorsed chapters, open `ScheduleDefenseModal`, configure date, timeslot, venue, and confirm defense booking.
* **Actor**: Course Instructor (`instructor@student.buksu.edu.ph`)
* **Route**: `/scheduling-center`
* **Client View**: `client/src/pages/instructor/DefenseSchedulingPage.jsx` $\to$ `ScheduleDefenseModal.jsx`
* **API Endpoints**:
  - `POST /api/projects/:id/defense-schedule` $\to$ 200 OK `{ success: true, message: 'Defense schedule confirmed for Team Alpha!', data: { project } }`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Page Navigation | `page.goto('/scheduling-center')` | — | `await expect(page.getByRole('heading', { name: 'Defense Scheduling Center' })).toBeVisible()` |
| Team Search | `page.getByPlaceholder('Search team, title, or code...')` | `"Team Alpha"` | Team Alpha card/row filtered |
| Open Schedule Modal | `page.getByRole('button', { name: /Schedule Defense/i })` | Click | Opens `ScheduleDefenseModal` |
| Defense Type Select | `page.locator('#defense-type')` | `'proposal'` | Capstone 1 Proposal Defense selected |
| Defense Round Select | `page.locator('#defense-round')` | `'1st'` | 1st Round (Standard Defense) |
| Defense Date Input | `page.locator('#defense-date')` | Upcoming Date (e.g. `2026-11-20`) | Date field set |
| Time Slot Select | `page.locator('#defense-time')` | `'09:00 AM - 10:30 AM'` | 90-minute defense slot selected |
| Venue Select | `page.locator('#defense-venue')` | `'COT Room 302 / Zoom'` | Venue set |
| Committee Roster Snapshot | Modal Committee Card | Visible | Badge indicates: `Committee Complete` (Adviser + Secretary + 3 Panelists) |
| Confirm Button | `page.getByRole('button', { name: /Confirm & Notify Hearing Committee/i })` | Click | Triggers `POST /api/projects/:id/defense-schedule` |
| Success Toast | Sonner Toast | Visible | Toast: `"Defense schedule confirmed for Team Alpha!"` |
| Calendar Block Assertion | Defense Calendar View | Visible | Team Alpha session block rendered in timeline |
| Evidence Screenshot | `scratch/qa-evidence/07_phase2_defense_scheduled.png` | — | File captured |

#### Boundary & Error States
- **Schedule Conflict**: Choosing a timeslot overlapping an existing defense in the same venue returns HTTP 409 `SCHEDULE_CONFLICT`.
- **Incomplete Committee**: If committee is missing Secretary or Panelists, warning banner appears: `"Institutional Notice: Committee Incomplete"`.

---

### SCENARIO 8: Secretary Defense Minutes & ADM v1 Logging (Phase 2)

* **Objective**: Authenticate as Committee Secretary, open `/secretary-review`, access Action Done Matrix tab, log defense panel recommendations into ADM v1, and assert pending verification status.
* **Actor**: Committee Secretary (`secretary@student.buksu.edu.ph`)
* **Route**: `/secretary-review?projectId=:id`
* **Client View**: `client/src/pages/projects/SecretaryReviewPage.jsx` $\to$ `ActionDoneMatrixTab.jsx`
* **API Endpoints**:
  - `POST /api/projects/:id/adm/rows` $\to$ 201 Created `{ success: true, data: { item } }`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Page Navigation | `page.goto('/secretary-review?projectId=' + projectId)` | — | `await expect(page.getByRole('heading', { name: 'Secretary Defense Minutes & ADM Studio' })).toBeVisible()` |
| View ADM Tab | `page.getByRole('tab', { name: /Action Done Matrix/i })` | Click | Action Done Matrix (OVPAA-F-INS-033) sheet loads |
| Milestone Selector | `page.getByRole('tab', { name: /Capstone 1 \(ADM v1\)/i })` | Click | Capstone 1 ADM v1 active |
| Add Remark Row Button | `page.getByRole('button', { name: /Add Recommendation Row/i })` | Click | Inserts empty row in ADM table |
| Panel Name Input | `page.locator('[data-testid^="panel-name-input-"]').last()` | `"Prof. Louie Jay Labastida (Chair)"` | Panel member name set |
| Suggestion Input | `page.locator('[data-testid^="panel-suggestion-input-"]').last()` | `"Refine system architecture diagram in Chapter 3 to include Redis cache layer."` | Suggestion text set |
| Action Taken Input | `page.locator('[data-testid^="panel-action-input-"]').last()` | `"Updated Figure 3.2 on Page 45 with Redis cache architecture."` | Action text set |
| Page Numbers Input | `page.locator('[data-testid^="panel-pages-input-"]').last()` | `"Page 45"` | Page reference set |
| Blur / Autosave Check | Row loses focus | — | Triggers auto-save mutation; row persists |
| Status Badge | `page.locator('text=Pending Student Action').or(page.locator('text=Addressed — Pending Verification'))` | Visible | Status indicates row awaiting panel verification |
| Evidence Screenshot | `scratch/qa-evidence/08_phase2_secretary_adm_logged.png` | — | File captured |

#### Boundary & Error States
- **Non-Secretary Forbidden**: Non-secretaries cannot edit recommendation rows (HTTP 403 `SECRETARY_CAPABILITY_FORBIDDEN`).
- **Empty Rows Guard**: Empty suggestions cannot be verified.

---

### SCENARIO 9: Panel Scoring & ADM Row Verification (Phase 2)

* **Objective**: Authenticate as Defense Panel Chair (`panelchair@student.buksu.edu.ph`), score proposal defense rubrics ($\ge 75\%$), open Action Done Matrix tab, and verify proponent compliance on the logged ADM row.
* **Actor**: Panel Chair (`panelchair@student.buksu.edu.ph`)
* **Route**: `/projects/:id?tab=evaluation` and `/projects/:id?tab=adm`
* **Client View**: `client/src/components/projects/EvaluationPanel.jsx` and `ActionDoneMatrixTab.jsx`
* **API Endpoints**:
  - `POST /api/evaluations/project/:projectId/submit` $\to$ 200 OK `{ success: true, data: { evaluation } }`
  - `PATCH /api/projects/:id/adm/rows/:rowId/verify` $\to$ 200 OK `{ success: true, data: { item } }`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Page Navigation | `page.goto('/projects/' + projectId + '?tab=evaluation')` | — | Evaluation panel mounts |
| Rubric Score Inputs | `page.locator('input[type="number"]')` | Fill scores (e.g. 25, 25, 25, 15) | Total displays passing score (e.g. `90 / 100`) |
| BukSU Grade Chip | Grade pill | Visible | Pill displays `1.25 (Superior)` or `1.50 (Very Good)` |
| Decision Radio | `page.getByLabel('Passed with Revisions')` | Check | Radio selected |
| Overall Comment | `page.locator('#overallComment')` | `"Solid technical design. Ensure Redis cache is documented in Chapter 3."` | Text populated |
| Submit Evaluation Button | `page.getByRole('button', { name: 'Submit Evaluation' })` | Click | Triggers confirmation modal |
| Confirm Evaluation Modal | `page.getByRole('button', { name: 'Submit Evaluation' })` in modal | Click | Status badge updates to `Submitted` |
| Switch to ADM Tab | `page.getByRole('tab', { name: /Action Done Matrix/i })` | Click | ADM table renders |
| Verify Row Checkbox | `page.locator('input[type="checkbox"][id^="verify-row-"]').first()` | Check | Clicks fulfillment checkbox |
| Verified Badge Assertion | `page.locator('text=Verified')` | Visible | Green checkmark and `Verified` badge appears in row |
| Evidence Screenshot | `scratch/qa-evidence/09_phase2_panel_verified.png` | — | File captured |

#### Boundary & Error States
- **Student Cannot Verify**: Proponent students cannot check verification boxes (`disabled={!canVerifyRow}`).
- **Unsubmitted Scores Block Release**: Course Instructor cannot release grades until all 3 panel members submit rubrics.

---

### SCENARIO 10: Secretary Endorsement & Multi-Tier Digital ADM Sign-Off (Phase 2)

* **Objective**: Execute sequential digital sign-offs on ADM v1: Secretary endorses compliance $\to$ unlocks Tier 1 (Adviser & Instructor), Tier 2 (Panelists), and Tier 3 (Chair). Instructor releases grades to advance team to Phase 3.
* **Actors**: Secretary $\to$ Adviser $\to$ Instructor $\to$ Panelists $\to$ Chair
* **Route**: `/projects/:id?tab=adm`
* **Client View**: `client/src/components/projects/ActionDoneMatrixTab.jsx`
* **API Endpoints**:
  - `POST /api/projects/:id/adm/endorse` $\to$ 200 OK `{ success: true, message: 'Action Done Matrix successfully endorsed by Committee Secretary.', data: { admSignatures } }`
  - `POST /api/projects/:id/adm/sign-tiered` $\to$ 200 OK `{ success: true, message: 'Recorded digital signature for [Name].', data: { admSignatures } }`
  - `POST /api/evaluations/project/:projectId/release` $\to$ 200 OK `{ success: true, message: 'Evaluations released successfully.' }`

#### DOM Validation Checkpoints & Semantic Locators

| Persona | Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|---|
| **Secretary** | Open Endorsement Modal | `page.getByRole('button', { name: /Sign Secretary Endorsement/i })` | Click | Modal opens with legal name pre-filled |
| **Secretary** | Confirm Endorsement | `page.getByRole('button', { name: /Confirm & Digitally Endorse/i })` | Click | Banner switches to green `Endorsed`; Tier 1–3 unlock |
| **Adviser** | Sign Tier 1 Adviser | `page.getByRole('button', { name: /Sign over Printed Name of Adviser/i })` | Click $\to$ Confirm | Adviser card renders signature image + timestamp |
| **Instructor** | Sign Tier 1 Instructor | `page.getByRole('button', { name: /Sign over Printed Name of Instructor/i })` | Click $\to$ Confirm | Instructor card renders signature image + timestamp |
| **Panelist 2** | Sign Tier 2 Panelist | `page.getByRole('button', { name: /Sign as Panel Member/i }).first()` | Click $\to$ Confirm | Panel Member 1 card renders signature |
| **Panelist 3** | Sign Tier 2 Panelist | `page.getByRole('button', { name: /Sign as Panel Member/i }).last()` | Click $\to$ Confirm | Panel Member 2 card renders signature |
| **Chair** | Sign Tier 3 Chair | `page.getByRole('button', { name: /Sign as REC \/ Chair/i })` | Click $\to$ Confirm | Chair signature renders; ADM rows frozen |
| **Instructor** | Release Evaluations | `page.getByRole('button', { name: 'Release All Evaluations' })` | Click $\to$ Confirm | Stage advances to `capstone_2` (Phase 3) |
| Evidence | Screenshot | `scratch/qa-evidence/10_phase2_adm_signatories_board.png` | — | All signatory cards display verified digital signatures |

#### Boundary & Error States
- **Secretary Gate Lock**: If Secretary endorsement is pending, Tier 1–3 cards display lock icon and disabled buttons (`isLockedBySecretary={true}`). Attempting direct API signing returns HTTP 403: `"The Action Done Matrix must be reviewed and endorsed by the Committee Secretary before panel digital signatures can be collected."`
- **Unverified Rows Lock**: Secretary cannot sign endorsement if any row has `status !== 'verified'` (HTTP 400: `"Cannot endorse Action Done Matrix: X revision item(s) still require panel verification."`).

---

### SCENARIO 11: Student Capstone 2 Prototype Demo & Gantt Tracking (Phase 3)

* **Objective**: Authenticate as Student Lead in Phase 3 (Capstone 2), update Interactive Gantt Chart tasks, link GitHub repository and staging demo URL, and upload Chapter 4 (Results).
* **Actor**: Student Lead (`student@student.buksu.edu.ph`)
* **Route**: `/projects/:id?tab=capstone_2` or `/project/submissions`
* **Client View**: `client/src/components/projects/InteractiveGanttChart.jsx` and `PrototypeShowcaseAndDemo.jsx`
* **API Endpoints**:
  - `PATCH /api/projects/:id/github-repo` $\to$ 200 OK `{ success: true, data: { githubRepoUrl } }`
  - `POST /api/projects/:id/prototypes/link` $\to$ 201 Created `{ success: true, data: { prototype } }`
  - `PATCH /api/projects/:id/gantt-plan` $\to$ 200 OK `{ success: true, data: { ganttPlan } }`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Page Navigation | `page.goto('/projects/' + projectId + '?tab=capstone_2')` | — | `await expect(page.getByText(/Phase 3 · System Prototype Development/i)).toBeVisible()` |
| Gantt Chart Trigger | `page.getByRole('button', { name: /Interactive Gantt Chart/i })` | Click | Interactive Gantt spreadsheet canvas opens |
| Add Task Button | `page.getByRole('button', { name: /Add Task/i })` | Click | Opens task dialog |
| Task Name Input | `page.getByLabel('Task Name')` | `"Sprint 2: Redis Caching Layer Integration"` | Field set |
| Save Task Action | `page.getByRole('button', { name: /Save Task/i })` | Click | Task appears in Gantt schedule table |
| GitHub Repo Input | `page.getByPlaceholder('https://github.com/org/repo')` | `"https://github.com/buksu-cms/smart-campus"` | Input set |
| Save GitHub Link | `page.getByRole('button', { name: /Save GitHub Link/i })` | Click | Badge reflects `Connected` |
| Add Staging Demo | `page.getByRole('button', { name: /Add Prototype Demo Link/i })` | Click | Opens prototype dialog |
| Demo URL Input | `page.getByLabel('Working Demo URL')` | `"https://smartcampus.buksu.edu.ph"` | URL populated |
| Save Demo Action | `page.getByRole('button', { name: /Add Link/i })` | Click | Showcase renders live link and metadata |
| Evidence Screenshot | `scratch/qa-evidence/11_phase3_prototype_demo.png` | — | File captured |

#### Boundary & Error States
- **Invalid URL Protocol**: Entering `ftp://` or non-URL string returns HTTP 400 validation error.
- **Phase Boundary**: Capstone 1 projects cannot access Prototype showcase until Capstone 1 ADM v1 is fully ratified.

---

### SCENARIO 12: Progress Defense Evaluation & ADM v2 Sign-Off (Phase 3)

* **Objective**: Schedule Progress Defense, panel evaluates working system prototype rubrics, Secretary logs ADM v2 recommendations, panelists verify fulfillment, Secretary endorses, and committee signs ADM v2 to advance to Phase 4.
* **Actors**: Instructor $\to$ Panelists $\to$ Secretary $\to$ Committee
* **Route**: `/projects/:id?tab=capstone_2`
* **Client View**: `client/src/components/projects/ActionDoneMatrixTab.jsx` (Milestone: `CAPSTONE_2`)
* **API Endpoints**:
  - `POST /api/projects/:id/defense-schedule` $\to$ 200 OK (`defenseType: 'progress'`)
  - `POST /api/evaluations/project/:projectId/submit` $\to$ 200 OK
  - `POST /api/projects/:id/adm/endorse` $\to$ 200 OK (`milestone: 'CAPSTONE_2'`)
  - `POST /api/projects/:id/adm/sign-tiered` $\to$ 200 OK (`milestone: 'CAPSTONE_2'`)
  - `POST /api/evaluations/project/:projectId/release` $\to$ 200 OK

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Schedule Progress Defense | `ScheduleDefenseModal` | Date, time, venue, `defenseType: 'progress'` | Schedule confirmed |
| Progress Rubric Scoring | `EvaluationPanel` | Prototype demo rubric criteria | Scores $\ge 75\%$, decision: `Passed` |
| Secretary ADM v2 Tab | `page.getByRole('tab', { name: /Capstone 2 \(ADM v2\)/i })` | Click | ADM v2 table displays |
| Add Prototype Remarks | ADM Row Input | `"Enhance mobile responsive charts for energy consumption dashboard."` | Row saved |
| Panel Verification | Checkbox `verify-row-*` | Checked | Row status transitions to `Verified` |
| Secretary Endorsement | `page.getByRole('button', { name: /Sign Secretary Endorsement/i })` | Click $\to$ Confirm | ADM v2 endorsed |
| Committee Digital Signatures | Tier 1, 2, and 3 signatory cards | Adviser, Instructor, Panelists, Chair sign | All ADM v2 signature slots filled |
| Grade Release | `page.getByRole('button', { name: 'Release All Evaluations' })` | Click $\to$ Confirm | Project transitions to `capstonePhase: 3` (Phase 4) |
| Evidence Screenshot | `scratch/qa-evidence/12_phase3_progress_adm_signed.png` | — | File captured |

---

### SCENARIO 13: Capstone 3 Final Defense, ADM v3 & Dean Institutional Clearance (Phase 4)

* **Objective**: Compile 5-chapter manuscript and journal paper, pass vector plagiarism scan, conduct final oral defense hearing, verify and endorse ADM v3, execute committee sign-off, and obtain College Dean Institutional Degree Clearance.
* **Actors**: Student Lead $\to$ Committee $\to$ College Dean (`dean@student.buksu.edu.ph`)
* **Route**: `/projects/:id?tab=capstone_3` and `/projects/:id?tab=adm`
* **Client View**: `client/src/components/projects/ActionDoneMatrixTab.jsx` $\to$ `SignatoryCard.jsx`
* **API Endpoints**:
  - `POST /api/projects/:id/adm/endorse` $\to$ 200 OK (`milestone: 'CAPSTONE_3'`)
  - `POST /api/projects/:id/adm/sign-tiered` $\to$ 200 OK (`tier: 3, role: 'dean'`)
  - Automated trigger: `projectService.tryAutoArchiveProject(projectId)` $\to$ `isArchived: true`

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Final Manuscript Upload | `FinalPaperUpload.jsx` | Full 5-Chapter PDF + Journal Paper | Dual upload completes; vector similarity `< 25%` |
| Schedule Final Defense | `ScheduleDefenseModal` | `defenseType: 'final'` | Final defense scheduled |
| Panel Final Scoring | `EvaluationPanel` | Final oral presentation rubrics | Passing verdict confirmed |
| Secretary ADM v3 Tab | `page.getByRole('tab', { name: /Capstone 3 \(ADM v3\)/i })` | Click | ADM v3 table renders |
| Secretary Endorsement | `page.getByRole('button', { name: /Sign Secretary Endorsement/i })` | Click $\to$ Confirm | Secretary Compliance Gate unlocked |
| Committee Sign-Off | Tier 1, 2, 3 cards | Adviser, Instructor, Panelists, Chair sign | Committee signatures recorded |
| **Dean Authentication** | Switch context to Dean account | `dean@student.buksu.edu.ph` | Dean navigates to project ADM tab |
| Dean Institutional Clearance | `page.getByRole('button', { name: /Sign Institutional Degree Clearance/i })` | Click | Opens Dean digital signature pad |
| Confirm Dean Clearance | `page.getByRole('button', { name: /Confirm & Digitally Sign/i })` | Click | Dean signature bound to project record |
| Automatic Archival Trigger | Project Status Indicator | Visible | Status updates to `Archived` (`projectStatus: 'archived'`) |
| Evidence Screenshot | `scratch/qa-evidence/13_phase4_dean_clearance_signed.png` | — | File captured |

---

### SCENARIO 14: Archival Verification, Read-Only Lock & QR Certificate (Phase 4)

* **Objective**: Access `/archive`, locate archived project, verify read-only locking across all forms, open `/projects/:id/certificate`, assert BukSU College seal and public QR verification hash.
* **Actor**: Any User / Public Evaluator
* **Route**: `/archive` $\to$ `/projects/:projectId/certificate`
* **Client View**: `client/src/pages/archive/ArchiveSearchPage.jsx` and `CertificatePage.jsx`
* **API Endpoints**:
  - `GET /api/projects/archive/search?q=Smart+Campus` $\to$ 200 OK
  - `GET /api/projects/:id/certificate` $\to$ 200 OK `{ success: true, data: { url, verificationHash } }`
  - `GET /api/projects/:id/approval-sheet` $\to$ 200 OK

#### DOM Validation Checkpoints & Semantic Locators

| Action / Element | Semantic Locator / Target | Value / Payload | Expected DOM State & Assertions |
|---|---|---|---|
| Archive Search | `page.goto('/archive')` | Search: `"Smart Campus"` | Search result article renders with hyperlinked title |
| Open Archived Project | Click project title | Navigates to `/projects/:id` | Project Detail opens in Read-Only mode |
| Read-Only Lock Assertion | Inputs, upload buttons, textareas | Disabled | Forms disabled; badge renders: `Archived Institutional Record` |
| Navigate to Certificate | `page.goto('/projects/' + projectId + '/certificate')` | — | Certificate page loads |
| Sealed Certificate Badge | `page.locator('text=QR verified')` | Visible | Green badge indicates `QR verified` status |
| Verification Hash | `page.getByText(/Verification: [a-f0-9]{32,64}/i)` | Visible | SHA-256 digital verification hash rendered |
| Preview Certificate Button | `page.getByRole('button', { name: 'View' })` | Click | Opens `SophisticatedDocumentViewer` modal with official BukSU COT seal |
| Download Certificate Button | `page.getByRole('link', { name: 'Download' })` | Visible | Direct download link enabled |
| Evidence Screenshot | `scratch/qa-evidence/14_phase4_completion_certificate_qr.png` | — | File captured |

---

## 4. Features Discovered & Mapped

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Auth & Session | Session Hydration Detach Guard | Full-screen branded loading screen displaying `Initializing session...` while Zustand restores auth state from `/api/users/me`. | Cookies | User session loaded | Redirect to `/login` if unauthenticated | `App.jsx:327`, `authStore.js:167` |
| 2 | Teams | Team Roster Lock | Finalizes team roster; preconditions proposal submission and invalidates open invite links. | `teamId` | 200 OK + `team.isLocked: true` | 400 `TEAM_MEMBER_PROFILE_INCOMPLETE` | `team.service.js:420`, `StudentTeamDetail.jsx:292` |
| 3 | Access Control | Instructor Committee Exclusion | Prohibits course instructors from being appointed to committee roles (Adviser, Secretary, Panelist). | Faculty query / appointment | Filtered faculty list | 400 `INSTRUCTOR_COMMITTEE_EXCLUSION` | `team.service.js:assignCommittee`, `AssignCommitteeDialog.jsx:248` |
| 4 | Proposals | Real-time Title Pre-Scan | Live archive cosine similarity pre-scan against existing catalog records (< 20% limit). | `title`, `keywords` | 200 OK `{ similarProjects, threshold }` | Similarity warning if $\ge 20\%$ | `CreateProjectPage.jsx:380`, `useCheckTitleSimilarity` |
| 5 | Proposals | Multi-Proposal Option Tabs | Proponents draft 1..10 candidate title proposals with pitch deck blueprints and UN SDG alignments. | Proposal blueprints array | Project created with `titleProposals` | 400 if title < 10 chars | `CreateProjectPage.jsx:1390` |
| 6 | Approvals | Title Deliberation Hearing Gate | Instructor approves candidate title as official capstone title; strictly gated by scheduled defense hearing. | `proposalId`, `adviserId` | `titleStatus: 'approved'` | Error if hearing unscheduled | `Capstone1CollapsibleSections.jsx:241` |
| 7 | Manuscripts | Chapter Upload & Magic-Byte Sniff | Uploads chapters with magic-byte file header validation (.docx, .pdf, .txt) and triggers BullMQ plagiarism job. | File, `chapter`, `justificationLetter` | 201 Created + Submission version | 400 invalid type, 403 if late without justification | `submission.routes.js:68`, `UploadChapterModal.jsx:117` |
| 8 | Viewer | Sophisticated Document Viewer | Canonical unified reader format with OOXML rendering, zoom controls, revision diff studio, and inline annotations. | Buffer / view URL, revisions | High-fidelity interactive canvas | Fallback to degraded reader | `SophisticatedDocumentViewer.jsx` |
| 9 | Scheduling | Defense Hearing Scheduler | Instructor command center for oral defense bookings in 30-min fluid blocks with venue conflict detection. | Date, time, venue, defense type | 200 OK Scheduled defense record | 409 `SCHEDULE_CONFLICT` | `DefenseSchedulingPage.jsx`, `ScheduleDefenseModal.jsx` |
| 10 | Matrix | ADM Row Logging & Autosave | Secretary logs defense panel remarks, recommendations, action taken, and page numbers with debounce. | Row data (`panelName`, `suggestion`, `actionDone`) | 201 Created / Updated ADM row | 403 if not secretary | `ActionDoneMatrixTab.jsx`, `ADMRemarkRow.jsx` |
| 11 | Matrix | Panel Member Fulfillment Verification | Individual panelists verify proponent revisions on logged ADM rows using interactive checkboxes. | `rowId`, `status: 'verified'` | Row updated to `verified` | Disabled for students | `ADMRemarkRow.jsx:226` |
| 12 | Matrix | Secretary Compliance Verification Gate | Secretary validates all ADM rows are verified and digitally endorses matrix, unlocking Tier 1–3 cards. | `projectId`, `signatureDataUrl`, `notes` | `admSignatures.secretary.endorsed = true` | 400 if unverified rows remain | `ActionDoneMatrixTab.jsx:1070` |
| 13 | Signatures | 3-Tier Multi-Signatory Board | Tier 1 (Adviser & Instructor), Tier 2 (Panelists), and Tier 3 (Chair) apply cryptographic digital signatures. | `tier`, `role`, `signatureDataUrl` | Updated `admSignatures` record | 403 if secretary endorsement missing | `ActionDoneMatrixTab.jsx:1148` |
| 14 | Evaluations | BukSU 1.00–5.00 Grade Release | Standardized grading scale evaluation with guarded release requiring all panel members to submit rubrics. | Rubric criteria scores | Released evaluation records | Release disabled if any panel unsubmitted | `EvaluationPanel.jsx:808` |
| 15 | Tracking | Interactive Gantt & Prototype Showcase | Phase 3 development tracking with 4 sprint sections, GitHub repo link, and live prototype staging embed. | Section progress %, GitHub URL, demo URL | Updated prototype record | 400 invalid URL | `InteractiveGanttChart.jsx`, `PrototypeShowcaseAndDemo.jsx` |
| 16 | Clearance | College Dean Degree Clearance | Institutional Dean degree clearance signing on final defense completion packet and approval sheet. | `projectId`, Dean signature | Dean signature recorded | 403 if not dean | `ActionDoneMatrixTab.jsx`, `project.controller.js` |
| 17 | Archival | Atomic Object Storage Auto-Archival | Automatic archival trigger to S3/MinIO upon final ADM approval, applying permanent read-only lock. | Trigger on final sign-off | `isArchived: true`, `projectStatus: 'archived'` | 500 retry queue | `projectArchive.service.js`, `ArchiveSearchPage.jsx` |
| 18 | Certification | Sealed Certificate with QR Verification | Official BukSU College of Technologies completion certificate with Dean seal, proponent roster, and QR URL. | `projectId` | Rendered certificate + verification hash | 404 if project unarchived | `CertificatePage.jsx:132` |

---

## 5. Edge Cases & Boundary Behaviors

| # | Feature | Input / Condition | Observed / Documented Behavior |
|---|---|---|---|
| 1 | Committee Assignment | Attempt to assign Course Instructor (`role: 'instructor'`) as Adviser or Panelist | Client `FacultySearchCombobox` filters out instructors; backend `team.service.js` rejects with 400 `INSTRUCTOR_COMMITTEE_EXCLUSION`. |
| 2 | Committee Assignment | Selecting the same faculty member for both Adviser and Secretary | Client conflict map displays error toast: `"This faculty member is already assigned as Capstone Adviser on this team."` Backend rejects appointment. |
| 3 | Title Proposal | Submitting proposal title under 10 characters | Form client validation halts submission; toast displays: `"Each proposal must have a valid title (at least 10 characters), objectives, and technical stack."` |
| 4 | Title Hearing Approval | Instructor attempts to approve title proposal before title defense hearing is scheduled | Blocked by `!isScheduledOrDone`; toast displays: `"The proponent team must have a scheduled title proposal hearing before the title can be approved."` and opens `ScheduleDefenseModal`. |
| 5 | Chapter Upload | Student uploads file with invalid MIME or magic bytes (e.g. `.exe` disguised as `.pdf`) | Multer and magic-byte middleware reject file with HTTP 400 `INVALID_FILE_TYPE`. |
| 6 | ADM Endorsement | Secretary attempts to endorse matrix while 1 or more rows are unverified (`status !== 'verified'`) | Modal confirm disabled; direct API call to `POST /adm/endorse` returns HTTP 400: `"Cannot endorse Action Done Matrix: X revision item(s) still require panel verification."` |
| 7 | ADM Tiered Signatures | Adviser or Chair attempts to sign ADM before Secretary endorsement is completed | Card displays lock icon; direct API call to `POST /adm/sign-tiered` returns HTTP 403: `"The Action Done Matrix must be reviewed and endorsed by the Committee Secretary before panel digital signatures can be collected."` |
| 8 | Grade Release | Instructor clicks `Release All Evaluations` while one panelist has not submitted rubrics | Button is disabled with tooltip: `"All panel members must submit before release."` Direct API call returns HTTP 400. |
| 9 | Archival Read-Only | Student or faculty attempts to upload chapter or modify fields on an archived project | Rejected by `assertProjectWritable`: HTTP 403 `PROJECT_ARCHIVED_READ_ONLY`. All UI form controls render in disabled state. |
| 10 | Network Polling Hang | Automated Playwright script calls `page.waitForLoadState('networkidle')` | Hangs indefinitely until 120s watchdog timeout because real-time notification poller (`/api/notifications`) and WebSockets prevent network idle. |
