# BukSU Capstone Management System V2 (CMS-V2)
# Comprehensive 4-Tier Test Suite Specification
**Compliance Standard:** ISO/IEC/IEEE 29119-3:2013 (Software and Systems Engineering — Software Testing — Part 3: Test Documentation)  
**Governing Standard:** BukSU ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  
**Document Identifier:** BUKSU-CMS-V2-TEST-SPEC-2026-V1  
**Target Environment:** Localhost / Docker Monorepo (`client`: React 18 / Vite; `server`: Express 5 / Mongo 9; `plagiarism_engine`: FastAPI)  
**Integrity Mode:** Development & Acceptance Verification  

---

## 1. Executive Summary & Test Strategy

### 1.1 Purpose
This specification establishes the authoritative, opaque-box, requirement-driven test case hierarchy for the BukSU Capstone Management System V2 (CMS-V2). It defines the test suite required to verify the complete UI redesign, component scaling and ergonomic layout, paper deliverables and printing formats, multi-role capstone workflows, institutional role exclusions, and real-world seed account execution across all academic phases (Phase 0 through Phase 4).

### 1.2 Standards Compliance & Traceability
Every test case in this specification complies strictly with the **ISO/IEC/IEEE 29119-3:2013** test documentation standard and maps directly to requirements from `ORIGINAL_REQUEST.md` and feature milestones in `PROJECT.md`:
* **R1: UI Redesign & Sizing Optimization** $\longrightarrow$ Features 7, 8, 9, 10, 11 (Tier 1 & Tier 2)
* **R2: Full Functional Enhancement & Workflow Integrity** $\longrightarrow$ Features 12, 13, 14 (Tier 1, Tier 2, Tier 3, Tier 4)
* **R3: Paper Deliverables & Printing Format** $\longrightarrow$ Features 1, 2, 3, 4, 5, 6 (Tier 1 & Tier 2)
* **R4: Seed Account Testing & Real-Scenario Browser Verification** $\longrightarrow$ Features 15, 16, 17–23 (Tier 3 & Tier 4)

### 1.3 4-Tier Test Architecture Overview
```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 4: REAL-WORLD SCENARIOS                    │
│   Full-Lifecycle Scenarios • Phase 0 to Phase 4 • All 11 Seed Personas  │
│                   (5 Comprehensive End-to-End Scenarios)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│                    TIER 3: CROSS-FEATURE COMBINATIONS                  │
│ Pairwise Feature Interactions • Gating Precedents • Asynchronous State │
│                      (5 Pairwise Integration Cases)                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│                  TIER 2: BOUNDARY & CORNER TEST CASES                  │
│ Empty Inputs • Maximum Limits • Route Security • Role Exclusions • Gate Locks│
│                       (25 Strict Boundary Cases)                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│                      TIER 1: FEATURE COVERAGE SUITE                    │
│ UI Sizing & Ergonomics • Paper Deliverables & Print • Core Role Tasks  │
│                       (17 Core Feature Cases)                          │
└────────────────────────────────────────────────────────────────────────┘
```

Total Test Cases in Suite: **52 Meticulously Specified Test Cases**.

---

## 2. Institutional Seed Account & Actor Matrix

The test suite exercises 11 dedicated canonical accounts seeded via `server/seeders/seed-canonical-role-accounts.js`:

| # | Persona / Actor | Institutional Role | Committee Function | Email Address | Default Password | Verification Status |
|---|-----------------|--------------------|--------------------|---------------|------------------|---------------------|
| 1 | Student Lead | `student` | Team Alpha Project Lead | `student@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |
| 2 | Student Member 2 | `student` | Team Alpha UI/UX Specialist | `student2@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |
| 3 | Student Member 3 | `student` | Team Alpha Backend Developer | `student3@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |
| 4 | Student Member 4 | `student` | Team Alpha QA & Documentor | `student4@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |
| 5 | Course Instructor | `instructor` | Course Coordinator (Excluded from Committee) | `instructor@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |
| 6 | Faculty Adviser | `faculty` | Capstone Adviser (Team Alpha) | `adviser@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |
| 7 | Committee Secretary | `faculty` | Defense Secretary (Team Alpha) | `secretary@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |
| 8 | Defense Panel Chair | `faculty` | Panelist 1 / Lead Chair (Team Alpha) | `panelchair@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |
| 9 | Defense Panelist 2 | `faculty` | Panel Member 2 (Team Alpha) | `panelist2@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |
| 10| Defense Panelist 3 | `faculty` | Panel Member 3 (Team Alpha) | `panelist3@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |
| 11| College Dean | `faculty` / `dean` | Academic Unit Executive Signatory | `dean@student.buksu.edu.ph` | `Password123!` | Verified (`isVerified: true`) |

---

## 3. Anti-Simulation & Verification Quality Contract

To prevent synthetic or "hollow" test passes, all test automation and manual evaluation must satisfy the **Zero-Tolerance Anti-Simulation Contract**:
1. **Physical DOM Interaction**: Every test step requires explicit physical browser interactions (actual keyboard typing events, mouse clicks on verified interactive targets, and native change events). No direct JavaScript state modification (`window.store.setState(...)`) is permitted.
2. **Deterministic DOM Assertions**: Expected outcomes must assert tangible, visible changes painted onto the DOM:
   - Specific user-facing text strings, green/red status pills, and toast notification alerts.
   - Exact route URL transitions (e.g. `/login` $\to$ `/dashboard`).
   - Modal visibility transitions (`role="dialog"` entering or exiting the DOM tree).
3. **No Synthetic `Pass` Injection**: Test runners must never push `{ status: 'Pass' }` into results tables without executing the prerequisite step sequence and validating the DOM assertion.
4. **Network & Timing Invariants**:
   - Strict ban on `{ waitUntil: 'networkidle' }` to prevent hanging caused by continuous notification polling (`/api/notifications?page=1&limit=1`) and WebSockets.
   - Automation scripts must use `{ waitUntil: 'domcontentloaded' }` and explicit state-based locator waits (`await page.waitForSelector(...)`).
   - Hard watchdog timeout of 110 seconds per execution script to eliminate runaway processes.

---

## 4. Tier 1: Feature Coverage Test Suite (ISO/IEC/IEEE 29119-3)

Tier 1 validates primary functionality ("happy path") across three major categories: UI Redesign & Sizing Optimization, Paper Deliverables & Printing Support, and Core Role Workflows.

### Category 1A: UI Redesign & Component Sizing Optimization

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-T1-UI-001** | Verify mobile touch target floor normalization ($\ge$ 44x44px) across compact viewports | 1. Open mobile browser viewport (390 x 844).<br>2. Log in as Student Lead.<br>3. Navigate to active project submissions page (`/project/submissions`).<br>4. Inspect touch targets of primary action buttons, Action Done Matrix tab buttons, and prototype modal triggers. | Viewport: 390x844<br>User: `student@student.buksu.edu.ph`<br>Pass: `Password123!` | 1. All interactive buttons exhibit rendered height $\ge$ 44px (`min-h-[44px]`).<br>2. Spacing between adjacent buttons prevents accidental mis-taps.<br>3. No horizontal page clipping occurs. | `[Pending Execution]` | `[Pending Execution]` | Anti-simulation: Assert `getBoundingClientRect().height >= 44` on mobile breakpoint. |
| **TC-T1-UI-002** | Verify shell max-width continuity (`max-w-7xl`) across canonical dashboard layout | 1. Open desktop browser viewport (1440 x 900).<br>2. Log in as Course Instructor.<br>3. Navigate to Projects Catalog (`/projects`) and Canonical Document Viewer (`/documents/manuscripts`).<br>4. Inspect outer container width. | Viewport: 1440x900<br>User: `instructor@student.buksu.edu.ph`<br>Pass: `Password123!` | 1. Main content container adheres to `max-w-7xl` (1280px max constraint).<br>2. Document reader expands naturally to match dashboard width without artificial `max-w-5xl` clipping.<br>3. Header, breadcrumbs, and content align cleanly to identical grid margins. | `[Pending Execution]` | `[Pending Execution]` | Eliminates layout stutter between catalog and reader views. |
| **TC-T1-UI-003** | Verify semantic heading hierarchy correction across document reader | 1. Log in as Faculty Adviser.<br>2. Navigate to `/projects/:id` and open Document Reader.<br>3. Inspect page heading tags in DOM tree. | User: `adviser@student.buksu.edu.ph`<br>Pass: `Password123!` | 1. Exactly one primary `<h1>` element exists on the page (Project / Document Title).<br>2. Sub-sections, revision diff headers, and metadata drawers use semantic `<h2>` and `<h3>` tags.<br>3. Screen readers announce clear, unbroken document outline structure. | `[Pending Execution]` | `[Pending Execution]` | Verifies fix for duplicate `<h1>` demotion in viewer component. |
| **TC-T1-UI-004** | Verify Cowan 4-chunking form organization with semantic `<fieldset>` and `<legend>` | 1. Log in as Course Instructor.<br>2. Navigate to User Management (`/users`) and click **Add New User**.<br>3. Navigate to Schedule Defense (`/defense-scheduling`) and open scheduling dialog. | User: `instructor@student.buksu.edu.ph`<br>Pass: `Password123!` | 1. Dense forms (>5 inputs) are visually and semantically divided into distinct `<fieldset>` sections.<br>2. Each group has a visible, styled `<legend>` (e.g., "Account Identity", "Institutional Classification", "Security Credentials").<br>3. Maximum of 4–5 related controls appear per visual chunk. | `[Pending Execution]` | `[Pending Execution]` | Cowan (2001) cognitive load compliance verification. |
| **TC-T1-UI-005** | Verify responsive table horizontal overflow protection in evaluation and diff panels | 1. Log in as Defense Panel Chair.<br>2. Navigate to project defense evaluation view (`/evaluations` or `/projects/:id`).<br>3. Open Rubric Scoring Table and Revision Compare Diff Table on a 1024x768 viewport. | Viewport: 1024x768<br>User: `panelchair@student.buksu.edu.ph`<br>Pass: `Password123!` | 1. Multi-column scoring and diff tables are wrapped in `overflow-x-auto` containers.<br>2. Table columns remain readable without squishing or truncating text.<br>3. Horizontal scrollbar appears cleanly inside the table card without causing whole-page body scrolling. | `[Pending Execution]` | `[Pending Execution]` | Validates responsive table wrapper integration. |

---

### Category 1B: Paper Deliverables & Printing Support

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-T1-PRN-001** | Verify Final Approval Sheet view, generation, and printable layout | 1. Log in as Course Instructor.<br>2. Open an approved Phase 4 project details page (`/projects/:id`).<br>3. Click the **View Final Approval Sheet** action button.<br>4. Trigger browser Print Preview (or emulate `@media print`). | User: `instructor@student.buksu.edu.ph`<br>Project: Approved Final Capstone | 1. Approval Sheet renders with institutional BukSU header, project title, proponent roster, and faculty committee appointments.<br>2. Digital signature timestamps and verified status badges appear under respective signatory names.<br>3. Print preview shows unrolled one-page portrait layout without clipped borders or missing names. | `[Pending Execution]` | `[Pending Execution]` | Validates endpoint `GET /api/projects/:id/approval-sheet` and print stylesheet. |
| **TC-T1-PRN-002** | Verify Canonical Document Viewer print button and overflow scroll unrolling | 1. Log in as Student Lead.<br>2. Open Chapter 1 manuscript in `SophisticatedDocumentViewer`.<br>3. Click the **Print Document** toolbar button (`print` icon).<br>4. Inspect print stylesheet output. | User: `student@student.buksu.edu.ph`<br>Document: Chapter 1 (DOCX / PDF) | 1. Document reader outer container removes scrollbars (`overflow: visible; height: auto`).<br>2. Toolbar buttons, zoom controls, and navigation drawer are masked out (`print:hidden`).<br>3. Entire manuscript pages unroll smoothly across paper page breaks without text truncation. | `[Pending Execution]` | `[Pending Execution]` | Asserts `.docx-outer-container` and reader unrolling in `index.css`. |
| **TC-T1-PRN-003** | Verify Plagiarism Report printable format with interactive chrome hidden | 1. Log in as Course Instructor.<br>2. Navigate to submission plagiarism report (`/submissions/:id/plagiarism-report`).<br>3. Emulate `@media print`. | User: `instructor@student.buksu.edu.ph`<br>Report: Valid Plagiarism Report | 1. Plagiarism similarity percentage gauge, document metadata, and matched source excerpts render with clean black-on-white text.<br>2. Interactive filter tabs, similarity sliders, and re-scan buttons are hidden (`print:hidden`).<br>3. Source comparison side-by-side view expands to fit printable page width. | `[Pending Execution]` | `[Pending Execution]` | Validates Feature 3 print support. |
| **TC-T1-PRN-004** | Verify Radix dialog and Live Defense Minutes modal print unrolling | 1. Log in as Committee Secretary.<br>2. Open `LiveDefenseMinutesModal` during active defense hearing.<br>3. Trigger print stylesheet emulation. | User: `secretary@student.buksu.edu.ph`<br>Modal: Live Defense Minutes | 1. Dark semi-transparent modal backdrop bleed is completely eliminated (`background: transparent`).<br>2. Modal dialog unrolls from fixed `90vh` viewport clamping to static document flow (`position: static; max-height: none`).<br>3. Defense remarks, panel questions, and student responses print with clean paper margins. | `[Pending Execution]` | `[Pending Execution]` | Validates global Radix modal print unrolling in `index.css`. |
| **TC-T1-PRN-005** | Verify defense panel evaluation rubric scoresheet printable format | 1. Log in as Defense Panelist.<br>2. Navigate to project defense evaluation scoresheet (`/evaluations`).<br>3. Click **Print Evaluation Scoresheet**.<br>4. Inspect print preview layout. | User: `panelchair@student.buksu.edu.ph`<br>Form: Panel Evaluation Rubric | 1. Printable rubric scoresheet displays individual criterion scores (1-5 scale), weighted percentages, and panelist written feedback.<br>2. Overall computed score and passing recommendation (Pass / Re-Defense / Fail) are prominently rendered.<br>3. Clean signature block with printed panelist name and date line appears at bottom. | `[Pending Execution]` | `[Pending Execution]` | Validates Feature 5 printable scoresheet. |
| **TC-T1-PRN-006** | Verify global print stylesheet high contrast and institutional 1-inch paper margins | 1. Log in as any authenticated user.<br>2. Trigger print preview across any printable academic deliverable page.<br>3. Inspect `@page` rule and typography colors. | Deliverable: Official Certificate / Matrix | 1. Print stylesheet enforces `@page { margin: 1in; size: letter portrait; }`.<br>2. Dark mode CSS variable tokens automatically reset to high-contrast black ink (`#000000`) on white paper (`#ffffff`).<br>3. Zero colorful background washes consume unnecessary printer toner. | `[Pending Execution]` | `[Pending Execution]` | Validates Feature 6 global print polish. |

---

### Category 1C: Role Workflows & Functional Operations

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-T1-ROL-001** | Verify Student Lead title proposal drafting, SDG selection, and submission | 1. Log in as Student Lead.<br>2. Navigate to `/project/create`.<br>3. Fill Title Proposal Tab 1 with Title, Problem Statement, Objectives, Technical Stack.<br>4. Select UN SDG tags (SDG 9, SDG 11) and IT Discipline (Data Analytics).<br>5. Click **Submit Proposal for Review**. | User: `student@student.buksu.edu.ph`<br>Title: "AgriPulse: IoT Crop Monitoring System"<br>SDGs: 9, 11<br>Discipline: Data Analytics | 1. Pre-scan similarity indicator executes and displays similarity percentage.<br>2. Green toast notification confirms "Title proposal submitted successfully".<br>3. Project status reflects "Under Review - Pending Instructor Approval". | `[Pending Execution]` | `[Pending Execution]` | Validates Phase 1 Student Title Proposal workflow. |
| **TC-T1-ROL-002** | Verify Course Instructor proposal review and committee appointment | 1. Log in as Course Instructor.<br>2. Navigate to `/projects` and open pending proposal for Team Alpha.<br>3. Click **Approve Title**.<br>4. Navigate to `/committee-assignments`.<br>5. Assign Adviser, Secretary, Panel Chair, Panelist 2, and Panelist 3.<br>6. Click **Confirm Committee Appointment**. | User: `instructor@student.buksu.edu.ph`<br>Adviser: `adviser@student.buksu.edu.ph`<br>Secretary: `secretary@student.buksu.edu.ph`<br>Panelists: `panelchair`, `panelist2`, `panelist3` | 1. Title status transitions to green "Approved" pill.<br>2. Committee dropdowns display only faculty users (`role: faculty`).<br>3. Confirmation dialog closes and committee assignment card updates with assigned faculty names. | `[Pending Execution]` | `[Pending Execution]` | Validates Phase 1 Instructor Committee Assignment workflow. |
| **TC-T1-ROL-003** | Verify Faculty Adviser chapter manuscript review and formal defense endorsement | 1. Log in as Faculty Adviser.<br>2. Navigate to `/adviser/team-review` and select Team Alpha.<br>3. Open Chapter 1–3 compiled manuscript.<br>4. Verify plagiarism compliance indicator (< 25%).<br>5. Click **Endorse for Proposal Defense**. | User: `adviser@student.buksu.edu.ph`<br>Team: Team Alpha<br>Endorsement Note: "Approved for defense hearing." | 1. Endorsement modal opens displaying manuscript metadata and originality score.<br>2. Green notification confirms "Project endorsed for proposal defense".<br>3. Project defense eligibility flag updates to `eligibleForDefense = true`. | `[Pending Execution]` | `[Pending Execution]` | Validates Phase 2 Adviser Endorsement workflow. |
| **TC-T1-ROL-004** | Verify Defense Panel Chair and Panelists rubric evaluation and grade calculation | 1. Log in as Defense Panel Chair.<br>2. Navigate to active defense hearing in `/evaluations`.<br>3. Complete rubric evaluation form across all weighted criteria (1–5 scale).<br>4. Input panel remarks and click **Submit Evaluation**. | User: `panelchair@student.buksu.edu.ph`<br>Scores: 4, 4, 5, 4, 5 (Total > 75%)<br>Remarks: "Solid architecture; address API rate limits." | 1. Live total percentage score recalculates automatically on input.<br>2. Status updates to "Evaluation Submitted" with green checkmark.<br>3. Panel Chair evaluation card displays overall grade and passing verdict. | `[Pending Execution]` | `[Pending Execution]` | Validates Phase 2/4 Defense Panel scoring workflow. |
| **TC-T1-ROL-005** | Verify Committee Secretary live defense minutes publishing and ADM endorsement | 1. Log in as Committee Secretary.<br>2. Navigate to `/secretary-review` and select Team Alpha defense hearing.<br>3. Type defense proceedings, panel questions, and student responses.<br>4. Click **Publish Defense Minutes**.<br>5. Open Action Done Matrix (ADM) tab and check **Secretary Compliance Endorsement**. | User: `secretary@student.buksu.edu.ph`<br>Minutes: Comprehensive defense notes<br>Checkbox: Secretary Compliance Endorsement | 1. Defense minutes document status displays "Published".<br>2. Action Done Matrix generates compliance tracking rows based on panel remarks.<br>3. Secretary Verification Gate banner updates to green "Verified & Endorsed". | `[Pending Execution]` | `[Pending Execution]` | Validates Phase 2/4 Secretary Workflow & ADM compliance gate. |
| **TC-T1-ROL-006** | Verify College Dean multi-tier ADM digital signature and completion certificate issuance | 1. Log in as College Dean.<br>2. Navigate to approved final project details (`/projects/:id`).<br>3. Open Action Done Matrix tab.<br>4. Verify Tier 1 (Adviser) and Tier 2 (Panelists/Chair) signatures are present.<br>5. Click **Apply Tier 3 Dean Digital Signature**.<br>6. Click **Generate Completion Certificate**. | User: `dean@student.buksu.edu.ph`<br>Pass: `Password123!` | 1. Tier 3 digital signature stamp appears with Dean name and timestamp.<br>2. Project status automatically transitions to "Archived" (`projectStatus = 'archived'`).<br>3. Official BukSU Completion Certificate modal opens displaying verification QR code and download PDF action. | `[Pending Execution]` | `[Pending Execution]` | Validates Phase 4 Dean Sign-off & Archival workflow. |

---

## 5. Tier 2: Boundary & Corner Cases Suite (ISO/IEC/IEEE 29119-3)

Tier 2 exercises strict boundary limits, edge conditions, invalid inputs, security controls, and workflow gate locks.

### Category 2A: Empty Inputs & Form Validations

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-T2-VAL-001** | Verify validation error on empty title proposal submission | 1. Log in as Student Lead.<br>2. Navigate to `/project/create`.<br>3. Leave Title and Problem Statement fields completely blank.<br>4. Click **Submit Proposal for Review**. | Title: `""`<br>Problem Statement: `""` | 1. Form submission is blocked.<br>2. Red validation error messages appear below mandatory fields reading "Title is required" and "Problem Statement is required".<br>3. No API request is dispatched to server. | `[Pending Execution]` | `[Pending Execution]` | Boundary test for required field enforcement. |
| **TC-T2-VAL-002** | Verify incomplete defense rubric scorecard submission block | 1. Log in as Defense Panelist.<br>2. Open defense evaluation scorecard for scheduled defense.<br>3. Score 3 out of 5 criteria, leaving remaining criteria unrated.<br>4. Click **Submit Evaluation**. | Rated: 3 criteria<br>Unrated: 2 criteria | 1. Submission is rejected.<br>2. Alert banner displays "Please complete all evaluation criteria before submitting score".<br>3. Unscored criterion rows are highlighted with red warning borders. | `[Pending Execution]` | `[Pending Execution]` | Prevents corrupted partial rubric grading. |
| **TC-T2-VAL-003** | Verify blank late justification form submission prevention | 1. Log in as Student Lead with an overdue milestone.<br>2. Click **Submit Late Justification** button.<br>3. Leave explanation text box completely empty.<br>4. Click **Submit Justification**. | Justification Text: `""`<br>Evidence: None | 1. Dialog remains open.<br>2. Red warning message appears: "Please provide a valid explanation for delayed submission".<br>3. Submit button remains disabled or returns validation alert. | `[Pending Execution]` | `[Pending Execution]` | Gating rule for overdue milestone justification. |
| **TC-T2-VAL-004** | Verify mandatory UN SDG and IT Discipline tag selection requirement | 1. Log in as Student Lead.<br>2. Navigate to `/project/create`.<br>3. Provide valid title and problem statement, but deselect all UN SDG and Discipline tags.<br>4. Click **Submit Proposal for Review**. | Title: "Valid Title"<br>SDGs: None<br>Discipline: None | 1. Submission is blocked.<br>2. Warning message appears: "At least one UN SDG tag and one IT Discipline category must be selected".<br>3. Tags section is highlighted in red. | `[Pending Execution]` | `[Pending Execution]` | Institutional taxonomy tagging validation. |
| **TC-T2-VAL-005** | Verify blank Secretary defense minutes publishing prevention | 1. Log in as Committee Secretary.<br>2. Open Live Defense Minutes interface.<br>3. Clear all notes and action items, leaving notes editor completely empty.<br>4. Click **Publish Defense Minutes**. | Minutes Text: `""`<br>Action Items: 0 | 1. Publication is blocked.<br>2. Error toast notification warns "Defense minutes cannot be empty. Please record hearing proceedings".<br>3. Minutes status remains "Draft". | `[Pending Execution]` | `[Pending Execution]` | Institutional compliance audit guard. |

---

### Category 2B: System Bounds, Capacity & Thresholds

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-T2-CAP-001** | Verify maximum 10 candidate title proposals ceiling enforcement | 1. Log in as Student Lead.<br>2. Navigate to Title Proposal Studio (`/project/create`).<br>3. Add 10 candidate title proposal tabs.<br>4. Attempt to click **+ Add Candidate Proposal** button. | Tabs: 10 candidate proposals | 1. The "+ Add Candidate Proposal" button becomes disabled.<br>2. Helper tooltip or message reads "Maximum of 10 title proposals allowed per capstone team".<br>3. Keyboard shortcuts or programmatic tab creation cannot exceed 10 tabs. | `[Pending Execution]` | `[Pending Execution]` | Institutional limit (1..10 candidate titles). |
| **TC-T2-CAP-002** | Verify capstone team roster size bounds (minimum 1, maximum 4 students) | 1. Log in as Student Lead.<br>2. Navigate to Team Formation (`/teams`).<br>3. Attempt to invite 4 additional members (exceeding 4 total members). | Existing Members: 1 Lead + 3 Members<br>Attempt: Invite 5th member | 1. Invite button is disabled or modal displays "Team has reached maximum capacity of 4 members".<br>2. System prevents submitting invite request.<br>3. Team member counter firmly displays "4 / 4 Members". | `[Pending Execution]` | `[Pending Execution]` | Institutional team size boundary rule (1–4 members). |
| **TC-T2-CAP-003** | Verify problem statement character limit boundary stress (5,000 characters) | 1. Log in as Student Lead in Proposal Studio.<br>2. Paste exactly 5,000 characters into Problem Statement.<br>3. Verify counter shows 5,000 / 5,000.<br>4. Attempt to type additional text. | Text: 5,000 chars + 50 overflow chars | 1. Input strictly caps at 5,000 characters without crashing or truncation errors.<br>2. Remaining character indicator displays 0.<br>3. Excess typed characters are discarded. | `[Pending Execution]` | `[Pending Execution]` | Cognitive and database schema boundary test. |
| **TC-T2-CAP-004** | Verify file upload boundary and invalid MIME-type rejection (>50MB, `.exe`) | 1. Log in as Student Lead on Chapter Upload page.<br>2. Attempt to upload a 60MB file.<br>3. Attempt to upload an executable file (`test.exe`). | File 1: 60MB PDF<br>File 2: `payload.exe` | 1. Both file uploads are immediately rejected by client dropzone before network transfer.<br>2. Clear error alerts appear: "File size exceeds 50MB limit" and "Only .docx and .pdf files are supported".<br>3. Upload dropzone resets to empty state. | `[Pending Execution]` | `[Pending Execution]` | Storage and security boundary enforcement. |
| **TC-T2-CAP-005** | Verify plagiarism threshold cutoff boundary rejection ($\ge$ 25% similarity) | 1. Upload manuscript draft engineered to match archived texts.<br>2. Trigger plagiarism scan returning exactly 25.1% similarity.<br>3. Check Adviser endorsement action. | Plagiarism Similarity: 25.1% (Originality: 74.9%) | 1. Plagiarism badge renders in red warning status: "Non-Compliant (25.1% Similarity)".<br>2. Adviser endorsement button is disabled with tooltip "Plagiarism similarity must be strictly below 25.0%".<br>3. Student is notified to revise manuscript. | `[Pending Execution]` | `[Pending Execution]` | Strict plagiarism gate threshold test. |

---

### Category 2C: Unauthorized Routes & Security Access Controls

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-T2-SEC-001** | Verify Student role route rejection from Instructor `/users` management page | 1. Log in as Student Lead (`student@student.buksu.edu.ph`).<br>2. Manually enter URL `http://localhost:43211/users` in browser address bar.<br>3. Press Enter. | Route: `/users`<br>Actor: Student Lead | 1. Browser redirects away from `/users` to `/forbidden` or `/dashboard`.<br>2. User list, account credentials, and admin management table are never rendered.<br>3. No unauthorized API network requests leak user records. | `[Pending Execution]` | `[Pending Execution]` | Role-based route guard enforcement. |
| **TC-T2-SEC-002** | Verify Student role route rejection from Defense Scheduling Center (`/defense-schedule`) | 1. Log in as Student Member 2 (`student2@student.buksu.edu.ph`).<br>2. Manually enter URL `http://localhost:43211/defense-scheduling`.<br>3. Press Enter. | Route: `/defense-scheduling`<br>Actor: Student Member | 1. Browser redirects to `/forbidden` or `/dashboard`.<br>2. Scheduling calendar, panelist assignment tools, and date picker controls are inaccessible.<br>3. Error toast reads "Access Denied: Instructor role required". | `[Pending Execution]` | `[Pending Execution]` | Route guard validation for coordinator tools. |
| **TC-T2-SEC-003** | Verify Faculty Panelist access block to non-assigned project defense evaluation | 1. Log in as Faculty Panelist 2 (`panelist2@student.buksu.edu.ph`).<br>2. Attempt to open evaluation scorecard for an unassigned team project via direct URL. | Target: Unassigned Project ID<br>Actor: Panelist 2 | 1. Access is blocked.<br>2. Error card renders: "You are not an appointed defense panelist for this project".<br>3. Rubric evaluation scoring controls remain hidden and disabled. | `[Pending Execution]` | `[Pending Execution]` | Committee evaluation authorization boundary. |
| **TC-T2-SEC-004** | Verify Student attempted direct Action Done Matrix digital signature block | 1. Log in as Student Lead.<br>2. Navigate to project Action Done Matrix tab.<br>3. Inspect Tier 1, Tier 2, and Tier 3 digital signature controls. | Actor: Student Lead<br>Target: ADM Digital Signatures | 1. Signature checkboxes and "Apply Signature" buttons are completely absent or rendered as non-interactive read-only status pills.<br>2. Attempting to click signature elements produces zero effect.<br>3. Direct API call attempts return HTTP 403 Forbidden. | `[Pending Execution]` | `[Pending Execution]` | Multi-signatory role boundary protection. |
| **TC-T2-SEC-005** | Verify unauthenticated guest route protection and session expiry redirection | 1. Open new private browser window.<br>2. Attempt to navigate directly to `http://localhost:43211/dashboard` or `/projects`.<br>3. Press Enter. | State: Unauthenticated (No JWT/Cookie) | 1. Browser instantly redirects to `http://localhost:43211/login`.<br>2. Protected dashboard shell and student data are never rendered.<br>3. Notification banner reads "Please sign in to access this page". | `[Pending Execution]` | `[Pending Execution]` | Authenticated session boundary verification. |

---

### Category 2D: Committee Role Exclusions & Conflicts of Interest

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-T2-EXC-001** | Verify Course Instructor exclusion from Adviser appointment combobox and API | 1. Log in as Course Instructor.<br>2. Navigate to Committee Assignment (`/committee-assignments`).<br>3. Open the **Capstone Adviser** selection dropdown.<br>4. Search for Course Instructor name or email (`instructor@student.buksu.edu.ph`). | Dropdown: Capstone Adviser<br>Search: "Patrick Josh Añedez" | 1. Course Instructor name does NOT appear in dropdown results.<br>2. Dropdown lists only faculty users with `role: faculty`.<br>3. Submitting instructor ID via backend API returns HTTP 400 Bad Request error. | `[Pending Execution]` | `[Pending Execution]` | Institutional exclusion: Instructors cannot advise capstones. |
| **TC-T2-EXC-002** | Verify Course Instructor exclusion from Committee Secretary appointment | 1. In Committee Assignment view, open the **Committee Secretary** selection dropdown.<br>2. Search for Course Instructor credentials. | Dropdown: Committee Secretary<br>Search: `instructor@student.buksu.edu.ph` | 1. Course Instructor is excluded from Secretary dropdown options.<br>2. Only qualified faculty members are selectable.<br>3. System prevents appointing instructor as defense secretary. | `[Pending Execution]` | `[Pending Execution]` | Conflict of interest protection. |
| **TC-T2-EXC-003** | Verify Course Instructor exclusion from Panelist and Panel Chair appointments | 1. In Committee Assignment view, open **Panel Chair**, **Panelist 2**, and **Panelist 3** dropdowns.<br>2. Attempt to locate Course Instructor in panelist candidate list. | Dropdown: Panelist 1–3<br>Candidate: Course Instructor | 1. Course Instructor name is completely absent from all panelist dropdown lists.<br>2. Only independent faculty members are available for selection.<br>3. Backend validation strictly enforces instructor committee exclusion. | `[Pending Execution]` | `[Pending Execution]` | Defense panelist independence rule. |
| **TC-T2-EXC-004** | Verify mutual role exclusion (Faculty Adviser cannot serve as Panelist on same team) | 1. In Committee Assignment view, select Dr. Leon Mentor as Capstone Adviser.<br>2. Open Panelist 2 dropdown.<br>3. Attempt to select Dr. Leon Mentor as Panelist 2 for the same project team. | Adviser: Dr. Leon Mentor<br>Panelist 2: Dr. Leon Mentor | 1. Dr. Leon Mentor is filtered out of Panelist dropdowns (or selection is rejected with alert).<br>2. Alert banner warns "A faculty member cannot serve as both Adviser and Panelist on the same team".<br>3. Save action is prevented until distinct panelist is chosen. | `[Pending Execution]` | `[Pending Execution]` | Prevents dual-role bias in defense evaluation. |
| **TC-T2-EXC-005** | Verify duplicate panelist appointment prevention (Panelists 1, 2, 3 must be distinct) | 1. Select Dr. Steven Joe Bautista as Panel Chair (Panelist 1).<br>2. Open Panelist 2 dropdown.<br>3. Attempt to select Dr. Steven Joe Bautista again as Panelist 2. | Panelist 1: Dr. Steven Joe Bautista<br>Panelist 2: Dr. Steven Joe Bautista | 1. Panelist 1 selection automatically disables or removes that faculty member from Panelist 2 and 3 dropdowns.<br>2. Warning message appears: "Duplicate panelist appointments are not permitted".<br>3. Committee assignment requires 3 distinct faculty panelists. | `[Pending Execution]` | `[Pending Execution]` | Committee composition completeness invariant. |

---

### Category 2E: Workflow Dependency & Sign-off State Gating

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-T2-GAT-001** | Verify Action Done Matrix Tier 1–3 signatures locked when Secretary endorsement is pending | 1. Log in as Faculty Adviser on Phase 4 project.<br>2. Open Action Done Matrix tab before Secretary endorses compliance.<br>3. Inspect Tier 1 (Adviser), Tier 2 (Panelists), and Tier 3 (Dean) signature sections. | State: `project.admSignatures.secretary.endorsed === false` | 1. Prominent warning banner appears: "Secretary Compliance Verification Gate Pending — Signatures Locked".<br>2. All signature checkboxes and signing buttons in Tiers 1, 2, and 3 are disabled.<br>3. Tooltip explains "Committee Secretary must endorse minutes before digital signatures unlock". | `[Pending Execution]` | `[Pending Execution]` | Core institutional Secretary Gate verification. |
| **TC-T2-GAT-002** | Verify Capstone 2 Chapter submissions locked prior to Phase 1 Title approval | 1. Log in as Student Lead on team with title proposal in "Under Review" status.<br>2. Navigate to Chapter Submissions (`/project/submissions`).<br>3. Inspect Chapter 1 upload dropzone. | State: `titleStatus !== 'approved'` | 1. Chapter upload dropzone is locked with padlock icon.<br>2. Banner indicates "Chapter submissions unlock upon official Capstone Title Approval by Course Instructor".<br>3. File drop and browse actions are disabled. | `[Pending Execution]` | `[Pending Execution]` | Phase progression dependency gate. |
| **TC-T2-GAT-003** | Verify proposal defense scheduling locked prior to Faculty Adviser endorsement | 1. Log in as Course Instructor.<br>2. Navigate to Defense Scheduling (`/defense-scheduling`).<br>3. Select Team Alpha where Adviser has not yet endorsed Chapters 1–3 manuscript.<br>4. Attempt to schedule defense date. | State: `adviserEndorsement === false` | 1. Team Alpha shows badge "Pending Adviser Endorsement".<br>2. Schedule Defense button for this team is disabled.<br>3. Tooltip confirms "Manuscript must be officially endorsed by Capstone Adviser prior to defense scheduling". | `[Pending Execution]` | `[Pending Execution]` | Proposal defense readiness gate. |
| **TC-T2-GAT-004** | Verify prototype defense locked when milestone is overdue without approved late justification | 1. Log in as Student Lead in Phase 3 where Gantt milestone deadline passed.<br>2. Attempt to request Prototype Defense without submitted late justification. | State: `isLate === true`, `justificationApproved === false` | 1. Defense request button is locked.<br>2. Modal prompts team: "Milestone is overdue. You must submit a Late Justification with GitHub repository evidence".<br>3. Prototype defense remains locked until Adviser reviews and approves explanation. | `[Pending Execution]` | `[Pending Execution]` | Late justification gating verification. |
| **TC-T2-GAT-005** | Verify final project archival locked prior to complete 3-Tier ADM sign-off | 1. Log in as College Dean.<br>2. Open Phase 4 project where Tier 1 (Adviser) has signed, but Tier 2 (Panelists) has not finished signing.<br>3. Attempt to archive project or issue completion certificate. | State: Tier 2 signatures incomplete | 1. Archival button and Certificate Issuance button remain disabled.<br>2. Status indicator displays "Pending Tier 2 Panelist Signatures (2/3 complete)".<br>3. Automatic archival is gated until 100% of required digital signatures are secured. | `[Pending Execution]` | `[Pending Execution]` | Archival integrity gate verification. |

---

## 6. Tier 3: Cross-Feature Combinations Suite (ISO/IEC/IEEE 29119-3)

Tier 3 exercises multi-step pairwise interactions connecting distinct functional subsystems, proving that operations in one module seamlessly cascade to downstream modules.

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-T3-INT-001** | Pairwise: Student Title Proposal Submission $\to$ Pre-Scan $\to$ Instructor Approval $\to$ Committee Assignment | 1. Log in as Student Lead and submit 3 candidate proposals in `/project/create`.<br>2. Verify cosine similarity pre-scan completes.<br>3. Log out and log in as Course Instructor.<br>4. Review proposals in `/projects` and approve Candidate #1.<br>5. Navigate to `/committee-assignments` and assign committee members (excluding instructor).<br>6. Confirm assignment. | Proponents: Team Alpha<br>Title: "BukSU Campus Navigator"<br>Committee: Adviser, Secretary, 3 Panelists | 1. Student receives real-time notification of title approval.<br>2. Project title reflects approved name.<br>3. Committee assignment card updates with faculty appointments.<br>4. Chapter 1 upload dropzone automatically transitions from locked to unlocked state. | `[Pending Execution]` | `[Pending Execution]` | Cascading milestone transition (Phase 0/1 $\to$ Phase 2). |
| **TC-T3-INT-002** | Pairwise: Chapter Manuscript Upload $\to$ Plagiarism Scan Engine $\to$ Adviser Endorsement $\to$ Defense Scheduling | 1. Log in as Student Lead and upload Chapter 1–3 compiled DOCX (`/project/submissions`).<br>2. System initiates BullMQ plagiarism scan.<br>3. Plagiarism engine returns 14.2% similarity (< 25%).<br>4. Log in as Faculty Adviser and open `/adviser/team-review`.<br>5. Review manuscript in viewer, inspect green originality badge, and sign endorsement.<br>6. Log in as Course Instructor and schedule defense hearing in `/defense-scheduling`. | Document: Chapters 1-3 Compilation<br>Plagiarism: 14.2% Similarity<br>Adviser: Endorsed | 1. Document originality badge updates to green "Compliant (85.8% Original)".<br>2. Adviser endorsement generates verified timestamp.<br>3. Team appears in Instructor Scheduling Center under "Ready for Scheduling".<br>4. Defense hearing date, room, and panelist invites are successfully published. | `[Pending Execution]` | `[Pending Execution]` | Cascading review and scheduling integration. |
| **TC-T3-INT-003** | Pairwise: Defense Hearing $\to$ Panelist Rubric Scoring $\to$ Secretary Minutes $\to$ ADM v1 Formation $\to$ Grade Release | 1. Log in as Panel Chair and score defense rubric (average 88.5%).<br>2. Log in as Panelists 2 and 3 and submit corroborating scores.<br>3. Log in as Committee Secretary in `/secretary-review`, record live defense remarks, and publish minutes.<br>4. Verify Action Done Matrix (ADM v1) automatically populates rows from panel remarks.<br>5. Log in as Course Instructor and release defense grade. | Rubric Scores: 88%, 85%, 90% (Pass)<br>Remarks: "Revise Chapter 2 literature matrix"<br>Grade: Released | 1. All panel evaluations reflect submitted status.<br>2. ADM v1 displays action item rows with "Pending Student Action".<br>3. Instructor grade release transitions project status to "Proposal Defense Passed".<br>4. Student team dashboard displays grade and unlocked ADM action items. | `[Pending Execution]` | `[Pending Execution]` | Defense evaluation to matrix formulation cascade. |
| **TC-T3-INT-004** | Pairwise: Gantt Schedule Approval $\to$ Late Milestone Delay Trigger $\to$ Late Justification $\to$ Prototype Defense & ADM v2 | 1. Log in as Faculty Adviser and approve Phase 3 Interactive Gantt schedule.<br>2. Fast-forward or trigger overdue milestone date (`isLate: true`).<br>3. Log in as Student Lead, observe locked prototype submission, and submit Late Justification with GitHub commit URL.<br>4. Log in as Adviser, review justification reason and repository evidence, and click **Approve Justification**.<br>5. Team conducts Prototype Defense; Secretary logs ADM v2. | Justification: "Delay in sensor procurement"<br>Evidence: `github.com/buksu-capstone/repo`<br>Status: Approved | 1. Prototype submission dropzone re-opens with amber "Late Submission Approved" pill.<br>2. Prototype defense hearing is scheduled and evaluated.<br>3. ADM v2 records hardware demonstration sign-off.<br>4. Proponents advance to Capstone 4 (Chapters 4–5 Final Compilation). | `[Pending Execution]` | `[Pending Execution]` | Schedule slippage and exception handling cascade. |
| **TC-T3-INT-005** | Pairwise: 5-Chapter Compilation $\to$ Archive Plagiarism Scan $\to$ Secretary Gate $\to$ Multi-Tier Sign-off $\to$ Archival & Certificate | 1. Log in as Student Lead and upload full 5-chapter manuscript and journal paper.<br>2. Deep vector plagiarism scan clears (< 20%).<br>3. Final defense hearing concludes.<br>4. Log in as Secretary, publish final minutes, and check **Secretary Compliance Endorsement**.<br>5. Log in as Adviser (Tier 1) and apply digital signature.<br>6. Log in as Panel Chair (Tier 2) and apply panel signature.<br>7. Log in as College Dean (Tier 3) and sign final approval.<br>8. Dean clicks **Generate Certificate**. | Signatories: Secretary $\to$ Tier 1 $\to$ Tier 2 $\to$ Tier 3<br>Final Status: Archived | 1. Secretary verification gate unlocks Tiers 1–3 sequentially.<br>2. Each signature renders with tamper-evident timestamp and role badge.<br>3. System executes automatic archival to MinIO/S3 and sets `projectStatus = 'archived'`.<br>4. Final Approval Sheet and Completion Certificate with QR verification seal are generated and printable. | `[Pending Execution]` | `[Pending Execution]` | Full final defense governance and archival cascade. |

---

## 7. Tier 4: Real-World Application Scenarios Suite (ISO/IEC/IEEE 29119-3)

Tier 4 defines 5 end-to-end, multi-actor, full-lifecycle scenarios simulating genuine academic term progressions across all 11 seed accounts.

### Scenario TC-T4-SCN-001: The Canonical Full-Lifecycle Graduation Journey (Team Alpha)
* **Actors Involved**: Student Lead (`student`), Student Members 2–4 (`student2`, `student3`, `student4`), Course Instructor (`instructor`), Faculty Adviser (`adviser`), Committee Secretary (`secretary`), Defense Panel Chair (`panelchair`), Panelists 2 & 3 (`panelist2`, `panelist3`), College Dean (`dean`).
* **Capstone Phases Traversed**: Phase 0 (Team Formation) $\to$ Phase 1 (Title Defense) $\to$ Phase 2 (Proposal Defense & ADM v1) $\to$ Phase 3 (System Development & ADM v2) $\to$ Phase 4 (Final Defense, Multi-Tier ADM Sign-off, Archival & QR Certificate).
* **Preconditions**: Fresh database seed baseline via `node server/seeders/seed-canonical-role-accounts.js`.

| Step # | Actor / Persona | Step Description | Test Data / Input | Expected Observable DOM Assertion |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Student Lead | Log in, verify Team Alpha roster (4 students), and click **Lock Roster**. | Email: `student@student.buksu.edu.ph` | Team status badge turns green "Roster Locked (4/4 Members)". Invite controls disappear. |
| 2 | Student Lead | Navigate to Title Proposal Studio, enter 3 candidate titles with UN SDGs (SDG 9, 11) and IT Discipline (Data Science), and submit. | Title 1: "AgriPulse: Smart Agriculture Monitoring" | Proposal studio shows "Submitted — Under Review". Pre-scan similarity meter displays 11.4%. |
| 3 | Course Instructor | Log in, inspect Team Alpha proposals, approve Title 1, and assign Committee (Adviser: Leon Mentor; Secretary: Committee Secretary; Panelists: Steven Joe Bautista, Panelist 2, Panelist 3). | Approval Note: "Excellent scope." Committee assigned. | Title status displays green "Approved". Committee card displays assigned faculty names. |
| 4 | Student Lead | Log in, open Chapter Submissions, verify template handoff widget is unlocked, and upload Chapter 1–3 compiled manuscript. | File: `TeamAlpha_Chap1-3_Final.docx` | Dropzone shows uploaded document. BullMQ plagiarism scan begins. Originality meter shows 88.2% Original. |
| 5 | Faculty Adviser | Log in, open `/adviser/team-review`, review manuscript in Sophisticated Document Viewer, verify originality score, and click **Endorse for Defense**. | Endorsement Note: "Chapters 1–3 verified." | Endorsement badge turns green. Eligibility indicator shows "Eligible for Proposal Defense". |
| 6 | Course Instructor | Log in, navigate to `/defense-scheduling`, select Team Alpha, set hearing date/time, assign venue, and click **Schedule Defense**. | Room: IT Lab 3; Date: Next Friday 10:00 AM | Defense hearing event appears on master calendar. Status updates to "Proposal Defense Scheduled". |
| 7 | Panel Chair & Panelists | Log in sequentially, attend proposal defense, score criteria (average 86.4%), and enter panel recommendations. | Scores: 4, 4, 5, 4, 5; Verdict: Pass with minor revisions | Evaluation panel displays all 3 evaluations submitted. Grade summary calculates 86.4%. |
| 8 | Committee Secretary | Log in, open Live Defense Minutes, record oral defense questions and responses, publish minutes, and formulate Action Done Matrix (ADM v1). | Minutes: Detailed defense log | Minutes status shows "Published". ADM v1 table displays action items with revision instructions. |
| 9 | Student Lead | Log in to Capstone 2, review ADM v1 remarks, upload revised chapters, and submit Interactive Gantt schedule for Capstone 3. | Revisions uploaded; Gantt: 4 phases | ADM action items show "Addressed by Proponents". Gantt chart displays interactive timeline. |
| 10| Faculty Adviser | Log in, review ADM v1 student responses, verify revisions in Revision Diff Studio, and approve Gantt schedule. | Action: Approve ADM v1 & Gantt | ADM v1 status shows "Compliant & Closed". Gantt baseline is approved. |
| 11| Student Lead | Execute Phase 3 system development, log progress entries, link GitHub repository (`github.com/buksu/agripulse`), and upload demo video. | Staging URL & GitHub Link | Progress tracker shows 100% milestone completion. Prototype gallery renders demo media. |
| 12| Committee Secretary & Panelists | Convene Progress Defense, evaluate working prototype, log minutes, and complete ADM v2 sign-off. | Verdict: Prototype Approved | ADM v2 rows show panel sign-off. Phase 3 marked completed. |
| 13| Student Lead | Compile full 5-chapter manuscript and journal paper, upload to Capstone 4 portal, and await deep vector plagiarism scan. | Document: Full 5-Chapter Compilation | Archive vector scan returns 13.8% similarity (< 25%). System marks project "Eligible for Final Oral Defense". |
| 14| Committee Secretary | Attend final oral defense, log proceedings, publish minutes, and click **Secretary Compliance Endorsement** on ADM tab. | Checkbox: Secretary Endorsed | Secretary Verification Gate banner turns green: "Secretary Endorsed — Committee Signatures Unlocked". |
| 15| Faculty Adviser | Open ADM tab, verify Tier 1 signature is unlocked, and click **Apply Tier 1 Adviser Signature**. | Pin / Confirm Signature | Tier 1 signature card stamps digital signature with Dr. Leon Mentor's name and timestamp. |
| 16| Panel Chair & Panelists | Open ADM tab, verify Tier 2 signatures are unlocked, and apply digital signatures. | Action: Apply Tier 2 Signatures | Tier 2 panelist signature stamps reflect 3/3 verified committee signatures. |
| 17| College Dean | Log in, open approved project ADM tab, verify Tiers 1 and 2 are complete, and click **Apply Tier 3 Dean Digital Signature**. | Action: Apply Tier 3 Signature | Tier 3 signature card stamps Dean signature. Project status automatically updates to "Archived". |
| 18| College Dean | Click **Generate Final Approval Sheet** and **Issue Completion Certificate**. | Action: Generate Documents | Official Final Approval Sheet and Completion Certificate with QR verification seal render cleanly and print without errors. |

* **Scenario Outcome**: 100% of academic capstone milestones completed, all 11 seed accounts actively participate, zero simulated bypasses, and all paper deliverables print successfully.

---

### Scenario TC-T4-SCN-002: Title Defense Adversity, Pre-Scan High Similarity & Proposal Revision (Team Beta)
* **Actors Involved**: Student Lead (`student2@student.buksu.edu.ph`), Course Instructor (`instructor@student.buksu.edu.ph`), Committee Secretary (`secretary@student.buksu.edu.ph`), Panelists.
* **Capstone Phases Traversed**: Phase 1 (Title Proposal Studio, Similarity Screening, Rejection, Revision, Re-Review & Approval).
* **Preconditions**: Team Beta assembled in Section B.

| Step # | Actor / Persona | Step Description | Test Data / Input | Expected Observable DOM Assertion |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Student Lead (Beta) | Log in, navigate to `/project/create`, and submit Candidate Title 1 with content closely matching an existing archived capstone ("BukSU Attendance Management System"). | Title: "Automated RFID Student Attendance Tracking" | Pre-scan similarity meter returns red warning: "High Similarity Detected (42.6% similarity to 2024 Capstone Archive)". |
| 2 | Student Lead (Beta) | Despite warning, submit proposal for Instructor review. | Action: Submit Proposal | Proposal submitted with amber flag "Similarity Warning: 42.6%". |
| 3 | Course Instructor | Log in, inspect Team Beta's proposal in `/projects`, review matching excerpts in archive comparison viewer, and click **Reject Proposal with Revision Request**. | Remarks: "Title #1 has high conceptual overlap with 2024 archive. Revise problem statement to focus on offline edge devices." | Project status updates to red pill: "Revision Required". Proponents receive notification with instructor remarks. |
| 4 | Student Lead (Beta) | Log in, open Proposal Studio, view instructor revision remarks, switch to Candidate Title 2, refine title to "Edge-AI Offline Attendance & Anomaly Logging", and update technical stack and problem statement. | Updated Title & Refined Problem Scope | Similarity pre-scan drops to 12.1% (green compliant). Click **Resubmit Revised Proposal**. |
| 5 | Course Instructor | Log in, inspect revised proposal, review updated problem statement and lowered similarity score, and click **Approve Title**. | Action: Approve Title | Status transitions to green "Approved". Committee assignment is enabled. |

* **Scenario Outcome**: Proves that proposal similarity pre-scan, rejection mechanisms, instructor-student feedback loops, and multi-title revision workflows function reliably without system deadlock.

---

### Scenario TC-T4-SCN-003: Manuscript Review Adversity, Sophisticated Document Viewer Revision Diff & Plagiarism Remediation
* **Actors Involved**: Student Lead (`student@student.buksu.edu.ph`), Faculty Adviser (`adviser@student.buksu.edu.ph`).
* **Capstone Phases Traversed**: Phase 2 (Chapter 1–3 Manuscript Upload, High Plagiarism Rejection, In-Viewer Revision Diff, Draft Resubmission & Clearance).

| Step # | Actor / Persona | Step Description | Test Data / Input | Expected Observable DOM Assertion |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Student Lead | Upload initial draft of Chapter 1 containing copied literature passages (`draft_v1.docx`). | File: `Chapter1_Draft_v1.docx` | Dropzone shows uploaded file. Plagiarism engine processes document and flags 34.8% similarity (exceeds 25% threshold). |
| 2 | Faculty Adviser | Log in, navigate to `/adviser/team-review`, open manuscript in `SophisticatedDocumentViewer`. | Viewer: Embedded inline reader | Document Identity Bar displays red originality badge: "34.8% Similarity (Non-Compliant)". |
| 3 | Faculty Adviser | Toggle **Revision Diff (+/-)** mode in viewer, inspect highlighted matched passages, add inline review comments, and click **Request Chapter Revision**. | Comment: "Paraphrase section 1.2 literature review. Plagiarism exceeds 25% threshold." | Revision request recorded. Project defense eligibility remains locked. Student receives notification. |
| 4 | Student Lead | Log in, download commented manuscript or view diff in viewer, revise copied sections, and upload `draft_v2.docx`. | File: `Chapter1_Draft_v2.docx` | BullMQ queue re-scans document. Plagiarism similarity recalculates to 11.5% (88.5% Original). |
| 5 | Faculty Adviser | Open updated document in viewer, compare `v1` vs `v2` using Word Diff mode, verify resolved comments, and click **Endorse Manuscript**. | Action: Endorse Manuscript | Document Identity Bar displays green "11.5% Similarity (Compliant)". Green toast confirms "Manuscript officially endorsed for defense". |

* **Scenario Outcome**: Proves that the unified `SophisticatedDocumentViewer`, multi-granularity Revision Diff mode, plagiarism re-scanning, and Adviser endorsement gates execute accurately.

---

### Scenario TC-T4-SCN-004: Interactive Gantt Schedule Slippage, Late Justification Gating & Working Prototype Defense
* **Actors Involved**: Student Lead (`student@student.buksu.edu.ph`), Faculty Adviser (`adviser@student.buksu.edu.ph`), Defense Panelists (`panelchair`, `panelist2`, `panelist3`), Committee Secretary (`secretary`).
* **Capstone Phases Traversed**: Phase 3 (Interactive Gantt Milestone Tracking, Overdue Milestone Slippage, Late Justification Form, Adviser Clearance, Prototype Demonstration & ADM v2).

| Step # | Actor / Persona | Step Description | Test Data / Input | Expected Observable DOM Assertion |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Student Lead | In Phase 3, open Interactive Gantt Chart spreadsheet canvas with 4 milestone sections and fill scheduled dates. | Gantt: 60-day planned schedule | Interactive timeline cells render scheduled blocks. Milestone progress bar calculates 0%. |
| 2 | Faculty Adviser | Review and approve Gantt timeline baseline. | Action: Approve Schedule | Gantt schedule status displays "Baseline Approved". |
| 3 | System / Tester | Simulate timeline progression beyond Milestone 2 deadline without completed submission (`isLate: true`). | State: Deadline Passed | Milestone card turns amber with prominent badge: "Overdue — Late Justification Required". |
| 4 | Student Lead | Attempt to upload Prototype Demo without justification. | Action: Click Upload Prototype | Action is blocked. Late Justification Modal appears demanding explanation and proof of ongoing work. |
| 5 | Student Lead | Fill Late Justification Modal with explanation, GitHub repository commit link, and unlisted YouTube demo link, then submit. | Reason: "Third-party sensor delivery delay; core API completed." Repo: `github.com/buksu/agripulse` | Justification submitted. Milestone status shows "Late Justification Pending Adviser Review". |
| 6 | Faculty Adviser | Open Advisee reviews, inspect late justification explanation, click GitHub repository link (opens in new tab), and click **Approve Late Justification**. | Action: Approve Justification | Milestone unlocks with amber status "Late Submission Approved". Prototype defense booking is enabled. |
| 7 | Committee & Secretary | Convene Prototype Defense hearing, evaluate live working software, test functional requirements, and publish ADM v2. | Prototype demo; Verdict: Approved with minor UI fixes | ADM v2 table displays logged prototype feedback items. Team clears Phase 3. |

* **Scenario Outcome**: Proves that interactive Gantt milestone calculations, automated late justification gating, external repository link verification, and prototype defense evaluation operate in harmony.

---

### Scenario TC-T4-SCN-005: Secretary Compliance Verification Gate Lockout & Dean Multi-Tier Archival Authority
* **Actors Involved**: Faculty Adviser (`adviser`), Defense Panelists (`panelchair`, `panelist2`, `panelist3`), Committee Secretary (`secretary`), College Dean (`dean`).
* **Capstone Phases Traversed**: Phase 4 (Final Oral Defense, Secretary ADM Compliance Gate Lockout, Sequential Tier 1–3 Digital Signatures, Final Approval Sheet Generation, Automatic Archival & Certificate).

| Step # | Actor / Persona | Step Description | Test Data / Input | Expected Observable DOM Assertion |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Faculty Adviser | Navigate to approved project's Action Done Matrix tab immediately following final defense hearing. | Project: Team Alpha Phase 4 | Top of ADM tab displays prominent institutional Secretary Compliance Verification Gate banner: "Secretary Compliance Verification Gate Pending — Signatures Locked". |
| 2 | Faculty Adviser | Attempt to click Tier 1 (Adviser) signature checkbox. | Action: Click Signature Checkbox | Checkbox is disabled and non-clickable. Tooltip reads "Committee Secretary must endorse minutes before digital signatures unlock". |
| 3 | Defense Panel Chair | Log in and attempt to sign Tier 2 (Panelists/Chair) signature block. | Action: Click Tier 2 Signature | Tier 2 signing controls are disabled with identical gate lockout notice. |
| 4 | Committee Secretary | Log in, open `/secretary-review`, review defense hearing notes, publish official defense minutes, navigate to ADM tab, and check **Secretary Compliance Endorsement**. | Action: Sign Secretary Endorsement | Secretary banner updates from amber warning to green verified badge: "Secretary Endorsement Verified — Committee Signatures Unlocked". |
| 5 | Faculty Adviser | Refresh or inspect ADM tab; observe Tier 1 signature controls are now unlocked, and apply digital signature. | Action: Apply Tier 1 Signature | Tier 1 signature card records Dr. Leon Mentor's digital signature stamp with date and timestamp. |
| 6 | Panel Chair & Panelists | Log in sequentially and apply Tier 2 digital signatures. | Action: Apply Tier 2 Signatures | Tier 2 panelist signature stamps reflect 3/3 verified signatures. |
| 7 | College Dean | Log in, navigate to project ADM tab, verify Tiers 1 and 2 are 100% complete, and apply Tier 3 Dean signature. | Action: Apply Tier 3 Signature | Tier 3 signature card stamps Dean signature. System automatically transitions `projectStatus = 'archived'`. |
| 8 | College Dean | Click **View Final Approval Sheet** and **Print Approval Sheet**. | Action: Print Approval Sheet | Full academic approval sheet opens displaying institutional header, committee appointments, and all digital signature timestamps. Print preview unrolls cleanly without clipping. |
| 9 | College Dean | Click **Generate Completion Certificate**. | Action: Generate Certificate | Sealed BukSU Capstone Completion Certificate renders displaying project title, proponent names, Dean signature, and public QR verification seal. |

* **Scenario Outcome**: Proves that the Secretary Compliance Verification Gate strictly prevents premature committee sign-off, enforces institutional hierarchy, and seamlessly completes multi-tier archival and official paper deliverable printing.

---

## 8. Requirements Traceability Matrix (RTM)

This matrix maps user requirements from `ORIGINAL_REQUEST.md` and feature milestones from `PROJECT.md` to specific test cases in this specification:

| Requirement / Feature # | Description | Milestone | Tier 1 Test Cases | Tier 2 Boundary Cases | Tier 3 Integration Cases | Tier 4 Scenarios |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **R1 / Feat 7** | Mobile Touch Target Normalization ($\ge$ 44x44px) | M2 | TC-T1-UI-001 | — | — | TC-T4-SCN-001 |
| **R1 / Feat 8** | Shell Layout Width Continuity (`max-w-7xl`) | M2 | TC-T1-UI-002 | — | — | TC-T4-SCN-001, 003 |
| **R1 / Feat 9** | Heading Hierarchy Correction (`<h1>` $\to$ `<h2>`) | M2 | TC-T1-UI-003 | — | — | TC-T4-SCN-003 |
| **R1 / Feat 10** | Form Chunking (Cowan 4-Chunking via `<fieldset>`) | M2 | TC-T1-UI-004 | TC-T2-VAL-001 | — | TC-T4-SCN-001, 002 |
| **R1 / Feat 11** | Responsive Table Horizontal Overflow Wrappers | M2 | TC-T1-UI-005 | — | — | TC-T4-SCN-001, 004 |
| **R2 / Feat 12** | CreateProjectPage Fixture & Validation | M3 | TC-T1-ROL-001 | TC-T2-VAL-001, 004 | TC-T3-INT-001 | TC-T4-SCN-001, 002 |
| **R2 / Feat 13** | Role Navigation & Workflow Verification | M3 | TC-T1-ROL-001 - 006 | TC-T2-SEC-001 - 005 | TC-T3-INT-001 - 005 | TC-T4-SCN-001 - 005 |
| **R2 / Feat 14** | Secretary ADM Compliance Gate UI Verification | M3 | TC-T1-ROL-005 | TC-T2-GAT-001 | TC-T3-INT-005 | TC-T4-SCN-001, 005 |
| **R3 / Feat 1** | Expose Final Approval Sheet in UI & Endpoint | M1 | TC-T1-PRN-001 | — | TC-T3-INT-005 | TC-T4-SCN-001, 005 |
| **R3 / Feat 2** | Document Reader Print Handling & Unrolling | M1 | TC-T1-PRN-002 | — | TC-T3-INT-002 | TC-T4-SCN-003 |
| **R3 / Feat 3** | Plagiarism Report Print Stylesheet | M1 | TC-T1-PRN-003 | TC-T2-CAP-005 | TC-T3-INT-002 | TC-T4-SCN-003 |
| **R3 / Feat 4** | Radix Dialog Print Unrolling & Backdrop Bleed | M1 | TC-T1-PRN-004 | — | — | TC-T4-SCN-001, 005 |
| **R3 / Feat 5** | Printable Evaluation Scoresheet | M1 | TC-T1-PRN-005 | TC-T2-VAL-002 | TC-T3-INT-003 | TC-T4-SCN-001 |
| **R3 / Feat 6** | Global Print Stylesheet Polish & Paper Margins | M1 | TC-T1-PRN-006 | — | — | TC-T4-SCN-001, 005 |
| **R4 / Feat 15** | Dedicated Seed Accounts Expansion (11 accounts) | M4 | TC-T1-ROL-001 - 006 | TC-T2-EXC-001 - 005 | TC-T3-INT-001 - 005 | TC-T4-SCN-001 - 005 |
| **R4 / Feat 16** | Seed Account Authentication Invariants | M4 | TC-T1-ROL-001 - 006 | TC-T2-SEC-005 | — | TC-T4-SCN-001 - 005 |
| **Feat 17–21** | 4-Tier Test Suite Architecture & Infrastructure | E2E | All Tier 1 Cases | All Tier 2 Cases | All Tier 3 Cases | All Tier 4 Cases |
| **Feat 22–23** | Anti-Simulation Browser Execution Sweep | M5 | TC-T1-ROL-001 - 006 | TC-T2-GAT-001 - 005 | TC-T3-INT-001 - 005 | TC-T4-SCN-001 - 005 |

---

## 9. Automated Execution Harness Contract

### 9.1 Test Runner Invocation
Automated headless browser sweeps executing this 4-Tier specification are driven via Playwright:
```bash
# Execute End-to-End Browser Automation Harness across all Seed Accounts
node scripts/qa-browser-e2e.mjs
```

### 9.2 Execution Baseline Preconditions
1. **Server & Database Availability**:
   - Backend API running at `http://localhost:5000` (or Docker `cms-server`).
   - Frontend SPA running at `http://localhost:43211` (or Docker `cms-client`).
   - Plagiarism engine online at `http://localhost:8000`.
2. **Deterministic Seeder State**:
   - Prior to full test suite execution, execute:
     ```bash
     node server/seeders/seed-canonical-role-accounts.js
     ```
   - This ensures all 11 seed accounts are verified, populated with standard passwords (`Password123!`), and mapped to designated academic sections and committees.

### 9.3 Output Evidence Artifacts
Upon test completion, the test runner produces three empirical verification artifacts:
1. **ISO/IEC/IEEE 29119-3 Markdown Table**: Summary execution table populated with verified **Actual Result** and **Pass/Fail** statuses.
2. **Structured Machine-Readable Results**: `scratch/qa-evidence/results.json` containing step timestamps, HTTP receipts, and DOM assertions.
3. **Visual Verification Screenshots**: Captured full-page viewports saved to `scratch/qa-evidence/screenshots/` verifying light mode, dark mode, desktop (1440x900), and mobile (390x844) layouts.

---
**Document Status:** Complete & Ready for Automated E2E Implementation  
**Architect:** E2E Test Suite Designer (`e2e_test_writer_1`)  
**Authorized Standard:** ISO/IEC/IEEE 29119-3:2013 / ASDLC v2.0
