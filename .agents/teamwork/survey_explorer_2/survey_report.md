# Exhaustive Technical Survey: Capstone Lifecycle & Role Workflow Integrity (R2)

**Author:** `survey_explorer_2` (`teamwork_explorer`)  
**Scope:** Requirement R2 (Full Functional Enhancement & Workflow Integrity) & R4 (Seed Account Testing)  
**Date:** 2026-11-13  
**Target Repository:** BukSU Capstone Management System V2 (CMS-V2)  
**Compliance Standard:** ASDLC v2.0, AGENTS.md, GEMINI.md  

---

## 1. Executive Summary & Architectural Overview

The BukSU Capstone Management System V2 (CMS-V2) enforces a rigorous, institutional 5-phase academic lifecycle (Phase 0 through Phase 4) across three academic semesters (Capstone 1, Capstone 2, and Capstone 3). The system coordinates multiple institutional roles—divided strictly into **Primary Account Roles** (`student`, `instructor`, `faculty`) and **Faculty Committee Appointments** (`adviser`, `secretary`, `panelist`, `chair`).

### Core Architecture & Invariant Rules
1. **Curriculum & Workflow Alignment**:
   - **Phase 0**: Pre-Capstone Team Formation, Roster Locking, Profile Validation, Committee Appointment.
   - **Phase 1**: Capstone 1 Title Pitch & Candidate Proposals (1..10), Cosine Similarity Pre-Scan, Title Hearing, Instructor Approval Gate.
   - **Phase 2 (Capstone 1 · 3rd Year, 1st Semester)**: Chapters 1–3 Manuscript Development, Sequential Adviser Approval, Proposal Compilation, Plagiarism Clearance, Adviser Endorsement, Scheduled Proposal Defense, Secretary Minutes & ADM v1 Auto-Population, Panel Evaluation, Instructor Grade Release Gate, and Multi-Tier ADM v1 Sign-off.
   - **Phase 3 (Capstone 2 · 3rd Year, 2nd Semester)**: System Development, Interactive Gantt Schedule & Adviser Approval, Weekly Progress Check-ins, Late Justification Interceptor, GitHub & Prototype Media Evidence, Adviser Prototype Clearance Gate, Prototype Defense, Secretary Minutes & ADM v2, and Multi-Tier Sign-off.
   - **Phase 4 (Capstone 3 · 4th Year, 1st Semester)**: Chapters 4–5 Development, Sequential Adviser Review, Full Academic Manuscript & Condensed Academic Journal Paper (IEEE/FRINS6 format), Neural Vector Plagiarism Clearance, Scheduled Final Defense, Secretary Minutes & ADM v3, **Secretary Compliance Verification Gate** (`project.admSignatures.secretary.endorsed === true`), Multi-Tier ADM Sign-off, Automated Approval Sheet Generation, Cold Storage S3/MinIO Archival, PaddleOCR Layout Ingestion, and Sealed Completion Certificate Issuance.

2. **Institutional Role Separation & Boundaries**:
   - **Primary User Role Consolidation**: Visible primary roles in user management (`/users`) are strictly: `student` (Student), `instructor` (Instructor), and `faculty` (Faculty) (`PRIMARY_ROLES` in `@cms/shared`).
   - **Course Instructor Committee Exclusion**: Course Instructors (`role: 'instructor'`) are **strictly prohibited** from serving as Adviser, Secretary, or Defense Panelists on capstone committees (`team.service.js:assignCommittee`, `projectCommittee.service.js`).
   - **Committee Appointments & Composition**: Defense committees consist of exactly 1 Adviser, 1 Secretary, and 3 Defense Panelists (Panelist 1 Lead/Chair, Panelist 2 Member, Panel Member 3).
   - **Mutual Exclusion Invariants**: A faculty member cannot serve as both Adviser and Secretary on the same team; an Adviser cannot serve as a Panelist; a Secretary cannot serve as a Panelist; Panelists cannot duplicate each other.
   - **Secretary Compliance Verification Gate**: In Phase 4, `project.admSignatures.secretary.endorsed === true` is an immutable prerequisite before Tier 1 (Adviser), Tier 2 (Panelists/Chair), and Tier 3 (Dean) digital signatures can unlock.

---

## 2. Comprehensive Inventory of Workflow Steps by Phase & Role

### 2.1 Phase 0: Registration, Team Scaffolding, Roster Locking, & Committee Appointment

#### 2.1.1 Student Workflow
1. **Registration & Profile Setup**:
   - **Path**: `client/src/pages/auth/RegisterPage.jsx`, `client/src/pages/profile/ProfilePage.jsx`
   - **Backend**: `server/modules/auth/auth.service.js`, `server/modules/users/user.service.js`
   - **Requirements**: Student must complete `studentId` (or institutional school ID), select an academic `sectionId`, academic term (`academicTerm`: "1st Semester" | "2nd Semester"), and assigned `instructorId`.
   - **Validation Gate**: Student cannot join or create a team if `sectionId` or `instructorId` is missing (`team.service.js:217-223`).
2. **Team Creation & Member Invites**:
   - **Path**: `client/src/pages/teams/TeamsPage.jsx`, `client/src/pages/teams/components/CreateTeamForm.jsx`, `InviteMemberForm.jsx`
   - **Backend**: `server/modules/teams/team.service.js:createTeam`, `createInvite`
   - **Rules**: Student creating the team becomes `leaderId`. Team inherits `sectionId`, `academicYear`, and `academicTerm` from the leader.
   - **Team Size**: Enforces 1–4 students (`MIN_TEAM_MEMBERS = 1`, `MAX_TEAM_MEMBERS = 4`). Term uniqueness prevents a student from being part of multiple active teams in the same academic term.
3. **Standardized Role Assignment**:
   - **Path**: `client/src/pages/teams/components/TeamRosterCard.jsx`
   - **Backend**: `server/modules/teams/team.service.js:assignMemberRole`
   - **Standard Roles (5)**:
     1. `Project Lead & Systems Analyst`
     2. `Frontend & UI/UX Developer`
     3. `Backend & Database Developer`
     4. `Full-Stack Developer`
     5. `QA & Technical Documentor`
4. **Roster Locking Gate**:
   - **Path**: `client/src/pages/teams/components/StudentTeamDetail.jsx:124-157`
   - **Backend**: `server/modules/teams/team.service.js:lockTeam` (`PATCH /api/teams/:id/lock`)
   - **Guards**:
     - Requesting user must be `leaderId`.
     - Team size must be between 1 and 4 members.
     - Every member must have an assigned standardized role.
     - Every member's profile must have complete Student ID, matching `academicTerm`, matching `sectionId`, and assigned `instructorId`.
     - Upon locking, all pending team invites are marked `expired`, `team.isLocked = true`, and a notification (`team_formation_pending_committee`) is dispatched to the assigned instructor.

#### 2.1.2 Course Instructor Workflow
1. **Committee Assignment & Workload Optimization**:
   - **Path**: `client/src/pages/instructor/CommitteeAssignmentsPage.jsx`, `client/src/components/users/TeamCommitteeAssignmentsView.jsx`
   - **Backend**: `server/modules/teams/team.service.js:assignCommittee` (`PUT /api/teams/:id/committee`)
   - **Rules**:
     - Instructor chooses 1 Adviser, 1 Secretary, and up to 3 Panelists (Panelist index 0 designated as Chair).
     - Instructor exclusion: `instructor.role === ROLES.INSTRUCTOR` rejected with `INVALID_COMMITTEE_ROLE`.
     - Mutual exclusion enforced: Adviser !== Secretary, Adviser not in Panelists, Secretary not in Panelists.
     - Automatically synchronizes to linked `Project` document if project already created.

---

### 2.2 Phase 1: Topic Proposals (1..10), Cosine Similarity Pre-scan, Hearing Rubrics, & Instructor Approval

#### 2.2.1 Student (Proponent) Workflow
1. **Dynamic Proposal Submission (1..10)**:
   - **Path**: `client/src/pages/projects/CreateProjectPage.jsx`
   - **Backend**: `server/modules/projects/services/projectTitle.service.js`, `server/modules/projects/project.service.js:createProject`
   - **Features**:
     - Dynamic "Add More" / "Done" UI allowing 1 to 10 candidate proposals.
     - Categorization by "IT Field of Discipline" (1..10) and UN SDGs (1..17).
     - Proposal Pitch Deck: 16:9 widescreen presentation canvas preview (`ProposalSlideCanvas.jsx`) and PPTX export (`exportPptx.js`).
2. **Dual-Engine Similarity Pre-Scan**:
   - **Backend**: `server/modules/projects/services/projectTitle.service.js:checkTitleSimilarity`, `server/utils/titleSimilarity.js`
   - **Algorithms**: MongoDB `$text` search index narrowing + Levenshtein / Token-overlap scoring + PyTorch MiniLM dense embeddings comparison against archive.
   - **Threshold**: Dynamically cascaded from `SystemSettings` (`maxSimilarityThreshold`, fallback 0.70). High similarity triggers warning flag for hearing evaluation.
3. **Proposal Status Tracking**:
   - **Path**: `client/src/pages/projects/TitleApprovalPage.jsx`
   - **Behavior**: Students whose projects are in Phase 1 before title approval track candidate proposals, similarity scores, scheduled defense hearing countdown, and committee panel.

#### 2.2.2 Instructor & Committee Workflow
1. **Proposal Hearing & Remarks**:
   - **Path**: `client/src/pages/projects/ProjectDetailPage.jsx` via `Capstone1CollapsibleSections.jsx`
   - **Backend**: `server/modules/projects/services/projectTitle.service.js:addTitleComment`
   - **Actions**: Faculty committee enters feedback per candidate proposal.
2. **Title Approval Gate**:
   - **Backend**: `server/modules/projects/services/projectTitle.service.js:approveTitle` (`POST /api/projects/:id/title/approve`)
   - **Transitions**:
     - **Approved**: Selected proposal marked approved, `project.titleStatus = 'approved'`, `project.stage = 'capstone_1'`, `project.workflowPhase = 2` (Capstone 1), unlocking Chapter 1–3 uploads.
     - **Approved with Revision**: `project.titleStatus = 'approved_with_revision'`, stays at `workflowPhase = 1` until revised title is accepted.
     - **Revision Required / Rejected**: `project.titleStatus = 'revision_required'`, proponents edit and resubmit (`reviseAndResubmit`).

---

### 2.3 Phase 2: Capstone 1 (Chapters 1–3, Plagiarism Clearance, Adviser Endorsement, Scheduled Defense, Secretary Minutes, ADM v1, Panel Evaluation, Instructor Grade Release)

#### 2.3.1 Student Workflow
1. **Sequential Chapter Uploads (Chapters 1–3)**:
   - **Path**: `client/src/pages/submissions/ChapterUploadPage.jsx`
   - **Backend**: `server/modules/submissions/submission.service.js:uploadChapter`
   - **Sequential Gating**:
     - Chapter 1: Requires assigned defense panel.
     - Chapter 2: Requires Chapter 1 to be approved/accepted/locked by the Adviser.
     - Chapter 3: Requires Chapter 2 to be approved/accepted/locked by the Adviser.
2. **Document Viewer & Revision Feedback**:
   - **Component**: `client/src/components/documents/SophisticatedDocumentViewer.jsx`
   - **Capabilities**: Document Identity Bar, Word/Sentence/Line revision diffing, inline Google Docs-style annotations, OOXML `docx-preview` rendering, iframe PDF viewing.
3. **Proposal Compilation (Chapters 1–3 Manuscript)**:
   - **Path**: `client/src/pages/submissions/ProposalCompilationPage.jsx`
   - **Backend**: `server/modules/submissions/submission.service.js:compileProposal`
   - **Validation**: Requires Chapters 1, 2, and 3 to be approved, exactly 3 panelists assigned, and triggers neural plagiarism check.

#### 2.3.2 Adviser Workflow
1. **Sequential Chapter Review & Annotations**:
   - **Path**: `client/src/pages/submissions/SubmissionReviewPage.jsx`, `client/src/pages/adviser/TeamReviewWorkflowPage.jsx`
   - **Backend**: `server/modules/submissions/services/submissionAnnotation.service.js`, `submissionReviewWorkspace.service.js`
   - **Actions**: Adviser places inline annotations with coordinates, replies to student notes, approves round (`approveAndClose`), or requests revisions (`requestRevisionRound`).
2. **Adviser Defense Endorsement Gate**:
   - **Backend**: `server/modules/submissions/submission.service.js:2925-2980`
   - **Trigger**: When the Adviser approves the compiled Chapter 1–3 proposal manuscript, project status advances to `approved_for_defense`. Automated notifications dispatch to Course Instructor, Committee Secretary, Panelists, and Student team.

#### 2.3.3 Instructor & Defense Hearing Workflow
1. **Defense Scheduling Center**:
   - **Path**: `client/src/pages/instructor/DefenseSchedulingPage.jsx`
   - **Backend**: `server/modules/projects/services/projectDefense.service.js:scheduleDefense`
   - **Details**: Date, time, venue, defense round, panel composition.
2. **Secretary Defense Minutes & ADM v1 Auto-Population**:
   - **Path**: `client/src/pages/projects/SecretaryReviewPage.jsx`, `LiveDefenseMinutesModal.jsx`
   - **Backend**: `server/modules/submissions/defenseMinutes.service.js:publishDefenseMinutesToMatrix`
   - **Behavior**: Secretary records live hearing minutes and client remarks. When published, items auto-populate into `project.actionDoneMatrix` (ADM v1) with `project.admStatus = 'pending_developer_action'`.
3. **Panel Evaluation Rubrics**:
   - **Component**: `client/src/components/projects/EvaluationPanel.jsx`
   - **Backend**: `server/modules/evaluations/evaluation.service.js`
   - **Scoring**: Panel members score institutional criteria. Verdicts: `passed`, `passed_with_revisions`, `re_defense_required`, `failed`.
4. **Instructor Grade Release Gate**:
   - **Backend**: `server/modules/evaluations/evaluation.service.js:releaseEvaluations` (`POST /api/evaluations/:projectId/:defenseType/release`)
   - **Security Invariant**: Defense scores and BukSU grades (1.00–5.00) remain strictly hidden from students until released by the Instructor.
5. **ADM v1 Compliance & Multi-Tier Sign-off**:
   - **Component**: `client/src/components/projects/ActionDoneMatrixTab.jsx`
   - **Backend**: `server/modules/projects/project.controller.js:signActionDoneMatrix`
   - **Sequence**: Proponents log implementation details (`actionsTaken`, `pageNumbers`). Secretary reviews compliance and executes Secretary Endorsement. Committee signs Tier 1 (Adviser) and Tier 2 (Panelists/Chair), followed by Instructor verification. Once complete, auto-advances project to Phase 3 (Capstone 2).

---

### 2.4 Phase 3: Capstone 2 (Interactive Gantt Schedule, Weekly Progress, Late Justification Gating, GitHub/Media Evidence, Prototype Clearance, Progress Defense, ADM v2)

#### 2.4.1 Student Workflow
1. **Interactive Gantt Plan Creation**:
   - **Component**: `client/src/components/projects/InteractiveGanttChart.jsx`, `AcademicExcelGanttChart.jsx`
   - **Backend**: `server/modules/projects/services/projectCore.service.js:updateGanttPlan`
   - **Structure**: 4 standard milestone sections (Planning & Research, Architecture & Design, System Dev & Infrastructure, Testing & Optimization).
2. **Weekly Progress Check-Ins & Late Justifications**:
   - **Component**: `client/src/components/projects/WeeklyProgressCheckIns.jsx`
   - **Backend**: `server/modules/projects/services/projectCore.service.js:submitWeeklyCheckIn`
   - **Gating**: Check-ins require approved Gantt schedule. Overdue submissions require late justification letter.
3. **System Prototype Evidence Submission**:
   - **Component**: `client/src/components/projects/PrototypeShowcaseAndDemo.jsx`, `PrototypeGalleryModal.jsx`
   - **Backend**: `server/modules/projects/project.service.js:addPrototype`, `updateGithubRepoUrl`, `updateDemoVideoUrl`
   - **Deliverables**: Working GitHub repository link and prototype media gallery.

#### 2.4.2 Adviser & Committee Workflow
1. **Adviser Gantt Approval Gate**:
   - **Backend**: `server/modules/projects/services/projectCore.service.js:approveGanttSchedule`
   - **Security**: Computes `ganttScheduleHash(ganttPlan)` and generates weekly check-in date anchors. Daily progress logging is locked until approved.
2. **Adviser Prototype Clearance Gate**:
   - **Backend**: `server/modules/projects/services/projectCore.service.js:updateSystemDefenseApproval`
   - **Validation**: Requires approved Gantt schedule AND verified system evidence (GitHub link or media) before clearance is granted.
3. **System Defense Hearing & ADM v2 Sign-off**:
   - **Defense Type**: `DEFENSE_TYPES.PROGRESS` (System/Prototype Defense).
   - **Rubrics**: Focus on system functionality, architecture, and prototype completeness.
   - **Secretary Minutes & ADM v2**: Feedback logged, student revisions tracked, Secretary endorses, committee signs, advancing project to Phase 4 (Capstone 3).

---

### 2.5 Phase 4: Capstone 3 (Chapters 4–5 Compilation, Deep Vector Plagiarism, Final Defense, Secretary Compliance Verification Gate, Multi-Tier ADM v3 Sign-off, Approval Sheet Generation, Archival Indexing, Certificate Issuance)

#### 2.5.1 Student Workflow
1. **Sequential Chapter 4 & 5 Review**:
   - **Backend**: `server/modules/submissions/submission.service.js:uploadChapter`
   - **Preconditions**: Capstone 2 completed (`workflowPhase = 4`). Chapter 4 requires Chapter 3 approved; Chapter 5 requires Chapter 4 approved.
2. **Compilation of Dual Deliverables**:
   - **Deliverable 1**: Full Academic Manuscript (Chapters 1–5 compilation).
   - **Deliverable 2**: Condensed Academic Journal Paper (IEEE/FRINS6 format).
3. **Deep Vector Plagiarism Clearance**:
   - **Backend**: `server/modules/plagiarism/plagiarismClearance.js:assertPlagiarismScanCanClear`
   - **Standard**: Non-degraded neural vector embeddings (`BAAI/bge-m3` 1024-dim dense + sparse core). Syntactic fallback mode is strictly rejected. Originality score must meet threshold.

#### 2.5.2 Defense, Secretary Compliance Gate, & Archival Workflow
1. **Final Oral Defense Hearing**:
   - **Defense Type**: `DEFENSE_TYPES.FINAL`.
   - **Panel Rubrics**: Defense panel scores final oral defense.
   - **Secretary Minutes**: Recorded and published into ADM v3.
2. **Secretary Compliance Verification Gate (Critical Invariant)**:
   - **Component**: `client/src/components/projects/ActionDoneMatrixTab.jsx:1776-1780`
   - **Backend**: `server/modules/projects/project.controller.js:1539-1545`
   - **Enforcement**: In Phase 4 ADM v3, `project.admSignatures.secretary.endorsed === true` is an immutable prerequisite. If endorsement is pending, committee digital signature buttons display `Awaiting Secretary Endorsement` and API returns HTTP 403.
3. **Multi-Tier Digital Sign-off**:
   - Tier 1: Adviser signature.
   - Tier 2: Panelists & Panel Chair signatures.
   - Tier 3: College Dean signature.
   - Course Instructor verification.
4. **Automated Approval Sheet PDF Generation**:
   - **Backend**: `server/modules/projects/services/projectArchive.service.js:_generateFinalApprovalSheet`
   - **Engine**: Client/server `pdf-lib` rendering institutional BukSU approval sheet with embedded signature vector images and timestamps.
5. **Auto-Archival & OCR Ingestion**:
   - **Backend**: `server/modules/projects/services/projectArchive.service.js:archiveProject`
   - **Storage**: S3/MinIO archival (`projectStatus = 'archived'`).
   - **OCR Microservice**: `PaddleOCR-VL (0.9B)` BullMQ extraction queue (`cms-ocr-engine:8000`) with fallback to `pdf-parse`.
6. **Completion Certificate Issuance**:
   - **Path**: `client/src/pages/projects/CertificatePage.jsx`
   - **Backend**: `server/modules/projects/services/projectArchive.service.js:verifyCertificate`
   - **Verification**: Generates sealed BukSU Completion Certificate with SHA-256 verification hash, QR code, and timing-safe verification.

---

## 3. Role Matrix & Institutional Governance

| Phase | Student Proponent | Course Instructor | Faculty Adviser | Committee Secretary | Defense Panelists (Members) | Panel Chair (Panelist 1) |
|---|---|---|---|---|---|---|
| **Phase 0** | Profile setup, form team (1–4), assign 5 roles, lock roster | Monitor cohorts, assign committee (1 Adv, 1 Sec, 3 Pan), workload balancer | Awaits appointment notification | Awaits appointment notification | Await appointment notifications | Lead designated on appointment |
| **Phase 1** | Submit 1..10 proposals, IT discipline, SDG tags, similarity scan | Review proposals, hear defense, approve/reject title gate | Advise topic selection, review candidate titles | Attend hearing | Review proposal pitches, question proponents | Lead proposal hearing |
| **Phase 2** | Upload Ch 1-3, view annotations, compile proposal, ADM v1 action items | Schedule proposal defense, release defense grades | Sequential review Ch 1->2->3, inline annotations, endorse for defense | Record hearing minutes, publish to ADM v1, endorse ADM v1 | Score proposal rubrics, enter remarks, sign Tier 2 ADM | Score rubrics, collate panel, sign Chair ADM |
| **Phase 3** | Build Gantt, weekly check-ins, late justification, GitHub/media evidence | Schedule system defense, release defense grades | Approve Gantt plan, verify progress, clear prototype | Record prototype defense minutes, publish ADM v2, endorse ADM v2 | Evaluate working prototype, score progress rubrics, sign Tier 2 ADM | Lead prototype demo, sign Chair ADM v2 |
| **Phase 4** | Upload Ch 4-5, compile manuscript & journal, deep plagiarism, ADM v3 | Schedule final defense, release final grades, archival oversight | Sequential review Ch 4->5, verify final paper, sign Tier 1 ADM | Record final minutes, publish ADM v3, execute Compliance Gate Endorsement | Score final defense rubrics, sign Tier 2 ADM | Lead final hearing, sign Chair ADM v3 |

---

## 4. Systematic Gap Analysis & Defect Inventory

### 4.1 GAP 1: Incomplete Canonical Seed Accounts for Real End-to-End Scenario Testing (R4 Deficit)
- **Severity**: High (Blocks Requirement R4 Real-Scenario Browser Verification)
- **File Location**: `server/seeders/seed-canonical-role-accounts.js` (lines 14–82) and `server/seeders/index.js` (lines 225–254)
- **Observation**:
  `seed-canonical-role-accounts.js` seeds only:
  - 1 Instructor (`instructor@student.buksu.edu.ph`)
  - 1 Adviser (`adviser@student.buksu.edu.ph`)
  - 1 Panel Chair (`panelchair@student.buksu.edu.ph`)
  - 3 Students (`student@student.buksu.edu.ph`, `student2...`, `student3...`)
  It **completely lacks**:
  1. A dedicated Committee Secretary account (e.g. `secretary@student.buksu.edu.ph`).
  2. Panelist 2 (e.g. `panelist2@student.buksu.edu.ph`).
  3. Panelist 3 (e.g. `panelist3@student.buksu.edu.ph`).
- **Logic Chain**:
  1. Committee assignment rules in `team.service.js:2081-2086` require exactly 1 Adviser, 1 Secretary, and 3 distinct Panelists (total 5 distinct faculty accounts).
  2. The database currently contains only 2 faculty accounts (`adviser` and `panelchair`).
  3. Without a Secretary account, browser-driven testing cannot log in as the Secretary to record defense minutes, publish ADM rows, or execute the Secretary Compliance Verification Gate.
  4. Without Panelists 2 and 3, defense evaluations cannot collect all 3 required panelist evaluations, and grade release or ADM signatures cannot complete under realistic conditions.
- **Actionable Remediation**:
  Update `seed-canonical-role-accounts.js` and `server/seeders/index.js` to add:
  ```javascript
  {
    email: 'secretary@student.buksu.edu.ph',
    firstName: 'Maria',
    middleName: 'C.',
    lastName: 'Santos',
    role: 'faculty',
    facultyRole: 'panelist',
    title: 'Committee Secretary',
  },
  {
    email: 'panelist2@student.buksu.edu.ph',
    firstName: 'Eduardo',
    middleName: 'D.',
    lastName: 'Reyes',
    role: 'faculty',
    facultyRole: 'panelist',
    title: 'Defense Panelist (Member)',
  },
  {
    email: 'panelist3@student.buksu.edu.ph',
    firstName: 'Grace',
    middleName: 'L.',
    lastName: 'Tan',
    role: 'faculty',
    facultyRole: 'panelist',
    title: 'Defense Panelist (Member)',
  }
  ```
  And automatically bind this full 5-member committee (Adviser, Secretary, Chair, Panelist 2, Panelist 3) to Team Alpha / Project Alpha in the seeder.

---

### 4.2 GAP 2: Unit Test Failure in `CreateProjectPage.test.jsx`
- **Severity**: Medium (Unit test failure on client suite)
- **File Location**: `client/src/pages/projects/CreateProjectPage.test.jsx:1106`
- **Verbatim Error**:
  ```
  FAIL  src/pages/projects/CreateProjectPage.test.jsx > CreateProjectPage > populates existing proposals and updates via useUpdateTitle in edit mode
  AssertionError: expected "vi.fn()" to be called with arguments: [ ObjectContaining{…} ]
  Number of calls: 0
  at src/pages/projects/CreateProjectPage.test.jsx:1106:29
  ```
- **Observation**:
  In `CreateProjectPage.jsx:1163-1176`, `handleSubmit` requires:
  - `proposal.title.trim().length >= 10`
  - `proposal.pitchDeck?.objectives?.trim()`
  - `proposal.pitchDeck?.technicalStack?.trim()`
  The test setup at line 1071 only provides `titleProposalMetadata` with `title`, `description`, `capstoneType`, and `sdgTags`, with NO `pitchDeck` fields. Furthermore, `fillRequiredProposalDetails` dispatches only an `input` event on textareas rather than triggering React 18's synthetic `onChange` handler (`handlePitchDeckFieldChange`), causing the form validation check to fail silently and abort submission.
- **Actionable Remediation**:
  In `CreateProjectPage.test.jsx`, populate `pitchDeck: { objectives: 'Valid objectives', technicalStack: 'React and Node' }` directly in the mock project state, and ensure `fillRequiredProposalDetails` dispatches `new Event('change', { bubbles: true })` in addition to `input`.

---

### 4.3 GAP 3: Route Permission Divergence on `/project/approval`
- **Severity**: Low (Informational / Routing Consistency)
- **File Location**: `client/src/App.jsx:168`
- **Observation**:
  `{ path: '/project/approval', Component: TitleApprovalPage, allowedRoles: [ROLES.STUDENT] }`
  Instructors reviewing title proposals perform reviews via `/projects/:id` (rendering `Capstone1CollapsibleSections.jsx`). If an instructor clicks an internal link or notification pointing to `/project/approval`, they are blocked by `RoleRoute` with a 403 redirect to `/forbidden`.
- **Actionable Remediation**:
  Either allow `ROLES.INSTRUCTOR` on `/project/approval` and render an instructor review banner/redirect, or ensure all instructor links explicitly route to `/projects/:projectId`.

---

### 4.4 GAP 4: Print Stylesheet Consistency Across Academic Deliverables (R3 Verification)
- **Severity**: Medium (Requirement R3 Deliverables & Printing)
- **File Location**: `client/src/index.css` (lines 951–1030), `client/src/components/projects/ActionDoneMatrixTab.jsx`, `client/src/components/secretary/SecretaryMinutesDocumentSheet.jsx`
- **Observation**:
  `index.css` contains extensive `@media print` rules, but:
  - Multi-page ADM forms require `@page { size: portrait; margin: 15mm; }` to prevent header clipping on physical printers.
  - Interactive controls like signature canvas buttons, zoom sliders, and navigation tabs must consistently carry `.no-print` or `data-no-print="true"`.
  - The fallback manuscript generator (`projectArchive.service.js:_generateFallbackManuscriptPdf`) and Approval Sheet generator (`_generateFinalApprovalSheet`) generate valid PDFs, but client-side printing from browser viewports must preserve high-contrast table borders (`border-collapse: collapse; border: 1px solid black !important;`).
- **Actionable Remediation**:
  Review and enforce print media styles across all paper deliverables to ensure 0 clipped borders and 100% visible institutional signatures during browser print sweeps.

---

### 4.5 GAP 5: Multi-Milestone ADM Data Collision Resilience
- **Severity**: Low / Preventative
- **File Location**: `server/modules/projects/project.controller.js` (lines 1613–1620) and `server/modules/projects/services/admCompletion.js`
- **Observation**:
  In legacy databases, `project.admSignatures` stored a single unversioned signature set. In CMS-V2, `project.admSignaturesByMilestone` partitions signatures into `CAPSTONE_1`, `CAPSTONE_2`, and `CAPSTONE_3`.
  `admCompletion.js` line 23 includes a fallback:
  ```javascript
  if (milestone === 'CAPSTONE_1') candidates.push(project?.admSignatures);
  ```
  This is correct and prevents stale signatures from polluting Capstone 2 or 3. Ensure that frontend mutations always pass the explicit `milestone` parameter (`'CAPSTONE_1'` | `'CAPSTONE_2'` | `'CAPSTONE_3'`) so that backend endpoints never default to the legacy slot for higher milestones.

---

## 5. Actionable Implementation & Remediation Plan

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 REMEDIATION & VERIFICATION ROADMAP                                     │
├────────────────────┬───────────────────────────────────────┬───────────────────────────────────────────┤
│ Target Area        │ Action Items                          │ Target Files                              │
├────────────────────┼───────────────────────────────────────┼───────────────────────────────────────────┤
│ 1. Seed Accounts   │ Seed Secretary, Panelist 2, Panelist  │ • server/seeders/seed-canonical-role-     │
│    (R4 Gating)     │ 3 accounts. Bind complete 5-member    │   accounts.js                             │
│                    │ committee to Team Alpha.              │ • server/seeders/index.js                 │
├────────────────────┼───────────────────────────────────────┼───────────────────────────────────────────┤
│ 2. Unit Test Fix   │ Correct test mock in                  │ • client/src/pages/projects/              │
│                    │ CreateProjectPage.test.jsx for edit   │   CreateProjectPage.test.jsx              │
│                    │ mode proposals.                       │                                           │
├────────────────────┼───────────────────────────────────────┼───────────────────────────────────────────┤
│ 3. Print Polish    │ Audit ADM Sheet, Minutes Sheet, and   │ • client/src/index.css                    │
│    (R3 Format)     │ Approval Sheet print stylesheets for  │ • client/src/components/projects/         │
│                    │ zero-bleed printing.                  │   ActionDoneMatrixTab.jsx                 │
├────────────────────┼───────────────────────────────────────┼───────────────────────────────────────────┤
│ 4. Verification    │ Run 7-point quality battery and       │ • check:endpoints, validate:agentic,      │
│    Sweeps          │ browser scenario verification.        │   validate:governance, targeted tests     │
└────────────────────┴───────────────────────────────────────┴───────────────────────────────────────────┘
```

---

## 6. Conclusion

The BukSU CMS-V2 codebase exhibits an exceptionally well-engineered, institutional-grade implementation of the canonical 5-phase capstone lifecycle. The state machine transitions, sequential chapter approvals, Google Docs-style annotations, Interactive Gantt hash locking, Secretary Compliance Verification Gate, and multi-tier ADM digital signatures operate with architectural fidelity.

The primary defect blocking full real-scenario verification (R4) is the lack of dedicated seed accounts for Committee Secretary and Panelists 2 & 3 in the seeder scripts. Remediating this gap alongside the localized unit test adjustment in `CreateProjectPage.test.jsx` will enable 100% deterministic, browser-verified execution across every role from Phase 0 to Phase 4.
