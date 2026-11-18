# HANDOFF REPORT — e2e_spec_miner_3

**Role**: Specification Miner (`specification_miner`)  
**Target Platform**: BukSU Capstone Management System V2 (CMS-V2)  
**Parent Agent**: `1d510dcc-9499-4a34-9b6f-1193ae141e8b`  
**State Folder**: `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_spec_miner_3\`  
**Date**: November 14, 2026  
**Status**: COMPLETE (Hard Handoff)  

---

## 1. Observation

Direct code and architectural observations were mined from the CMS-V2 codebase and specification artifacts:

1. **Authentication Matrix & Persona Seeding**:
   - Seed accounts share unified credentials (`Password123!`).
   - 11 dedicated personas verified in database seeds and specs:
     * Student Lead: `student@student.buksu.edu.ph` (`role: 'student'`)
     * Student Members: `student2@student.buksu.edu.ph`, `student3@student.buksu.edu.ph`, `student4@student.buksu.edu.ph` (`role: 'student'`)
     * Course Instructor: `instructor@student.buksu.edu.ph` (`role: 'instructor'`)
     * Faculty Adviser: `adviser@student.buksu.edu.ph` (`role: 'faculty'`)
     * Committee Secretary: `secretary@student.buksu.edu.ph` (`role: 'faculty'`)
     * Panel Chair (Panelist 1 Lead): `panelchair@student.buksu.edu.ph` (`role: 'faculty'`)
     * Panel Member 2: `panelist2@student.buksu.edu.ph` (`role: 'faculty'`)
     * Panel Member 3: `panelist3@student.buksu.edu.ph` (`role: 'faculty'`)
     * College Dean: `dean@student.buksu.edu.ph` (`role: 'faculty'`)
     * Additional institutional roles: Department Chair, System Admin.

2. **Session Hydration & Network Polling Invariants**:
   - `client/src/App.jsx:327` renders full-screen `<div className="flex h-screen items-center justify-center">` with text `"Initializing session..."` while Zustand `useAuthStore` restores session from `/api/users/me`.
   - Polling hook `/api/notifications?page=1&limit=1` and Socket.IO real-time channels are perpetually active. As documented in `AGENTS.md:Section 16`, any Playwright script using `waitForLoadState('networkidle')` hangs indefinitely until the 120s timeout.

3. **Team Scaffolding & Roster Locking (Phase 0, Scenario 1)**:
   - `client/src/pages/teams/StudentTeamDetail.jsx:292`: Button `Lock Roster & Finalize Team` triggers `PATCH /api/teams/:id/lock`.
   - `server/modules/teams/team.service.js:420`: Backend validates member profiles; once locked, sets `team.isLocked: true`, preventing further member additions or departures.

4. **Instructor Committee Exclusion & Conflict Map (Phase 0, Scenario 2)**:
   - `server/modules/teams/team.service.js:assignCommittee`: Checks faculty roles. Assigning any user with `role: 'instructor'` throws HTTP 400 with code `INSTRUCTOR_COMMITTEE_EXCLUSION`.
   - `client/src/components/users/AssignCommitteeDialog.jsx:248`: `FacultySearchCombobox` queries `/api/users?role=faculty` which excludes instructors. Assigning the same faculty member to multiple roles triggers client toast: `"This faculty member is already assigned as Capstone Adviser on this team."`

5. **Title Proposal Submission & Similarity Pre-Scan (Phase 1, Scenario 3)**:
   - `client/src/pages/projects/CreateProjectPage.jsx:380`: Submitting titles triggers live archive similarity pre-scan via `useCheckTitleSimilarity` hook against ChromaDB/Winnowing backend. Titles with similarity $\ge 20\%$ render an orange warning badge with matching archived project citations.
   - `CreateProjectPage.jsx:1390`: Proponents can create 1..10 proposal cards with SDG tags and technical stack chips.

6. **Defense Hearing Gate for Title Approval (Phase 1, Scenario 4)**:
   - `client/src/pages/projects/Capstone1CollapsibleSections.jsx:241`: Button `Approve as Official Title` is guarded by `!isScheduledOrDone`. If defense hearing is not scheduled, button opens `ScheduleDefenseModal` and rejects approval.

7. **Chapter Upload & Plagiarism Queue (Phase 2, Scenario 5)**:
   - `server/modules/submissions/submission.routes.js:68`: Enforces multer magic-byte validation for `.docx`, `.pdf`, `.txt`. Uploading triggers BullMQ job `document-extraction` and vector similarity scan.
   - `client/src/components/submissions/UploadChapterModal.jsx:117`: Dialog provides file dropzone, chapter selector (1–5), and late justification letter textarea if past deadline.

8. **Unified Document Reader Contract (Scenario 6)**:
   - `client/src/components/documents/SophisticatedDocumentViewer.jsx`: Mandatory reader component providing OOXML client-side rendering via `docx-preview`, PDF iframe streaming, zoom controls (`-`, `%`, `+`), and Revision Diff (+/-) Studio comparing `v{N-1}` to `v{N}`.

9. **Fluid Oral Defense Scheduler (Scenario 7)**:
   - `client/src/pages/instructor/DefenseSchedulingPage.jsx`: Renders calendar schedule.
   - `client/src/components/instructor/ScheduleDefenseModal.jsx`: Selects date, time (30-min increments), and venue (physical room or Google Meet URL). Conflicting bookings return HTTP 409 `SCHEDULE_CONFLICT`.

10. **Action Done Matrix & Secretary Verification Gate (Phases 2 & 4, Scenarios 8, 10, 11, 13)**:
    - `client/src/components/projects/ADMRemarkRow.jsx:226`: Secretary logs defense panel remarks; proponent submits actions taken; individual panel members toggle verification checkboxes (`status: 'verified'`).
    - `client/src/pages/projects/ActionDoneMatrixTab.jsx:1070`: Secretary Compliance Verification Gate banner appears above Tier 1. Secretary clicks `Verify & Endorse ADM Compliance`.
    - If any row has `status !== 'verified'`, `POST /api/projects/:id/adm/endorse` returns HTTP 400.
    - `ActionDoneMatrixTab.jsx:1148`: Tier 1 (Adviser), Tier 2 (Panelists), and Tier 3 (Chair) digital signatures are strictly disabled with lock banners until `project.admSignatures.secretary.endorsed === true`.

11. **Standardized Grading & Guarded Release (Scenario 9)**:
    - `client/src/pages/projects/EvaluationPanel.jsx:808`: Committee evaluates proponents using BukSU 1.00–5.00 rubric. Course instructor button `Release All Evaluations` (`POST /api/evaluations/release-all`) is disabled until all 3 panel members submit rubrics.

12. **Milestone Tracking & Prototype Staging (Phase 3, Scenario 12)**:
    - `client/src/components/projects/InteractiveGanttChart.jsx`: Displays 4 development milestone sections with progress sliders and completion checkboxes.
    - `client/src/components/projects/PrototypeShowcaseAndDemo.jsx`: Verifies GitHub repo URL and live prototype URL, embedding an interactive staging iframe preview.

13. **Archival, Read-Only Lock & QR Certificate (Phase 4, Scenarios 13 & 14)**:
    - `server/modules/projects/projectArchive.service.js`: Applying final Dean degree clearance triggers auto-archival to S3/MinIO, setting `isArchived: true` and `projectStatus: 'archived'`.
    - `client/src/pages/archive/ArchiveSearchPage.jsx`: Public search returns archived project.
    - `client/src/pages/projects/ProjectDetailPage.jsx`: Archived project forms are rendered read-only; mutations return HTTP 403 `PROJECT_ARCHIVED_READ_ONLY`.
    - `client/src/pages/projects/CertificatePage.jsx:132`: Renders official BukSU completion certificate with College of Technologies seal, proponent roster, SHA-256 hash, and QR code verification link.

---

## 2. Logic Chain

1. **Mapping Requirement to Authoritative Reality**:
   - The user dispatch instructed `e2e_spec_miner_3` to probe all server API routes and frontend views across all 11 personas and Phases 0–4 to construct the concrete DOM verification checkpoints for Scenarios 1–14.
   - By tracing `client/src/App.jsx`, page routes, and individual UI component JSX trees, the exact semantic selectors (`getByRole`, `getByTestId`, `getByLabel`, `page.locator`) were matched to their respective backend controllers and Mongoose models.

2. **Deconstructing Role-Specific Invariants & Access Gates**:
   - Inspection of `team.service.js` and `AssignCommitteeDialog.jsx` proved that the Instructor Committee Exclusion is enforced symmetrically on frontend comboboxes and backend validation logic.
   - Inspection of `ActionDoneMatrixTab.jsx` and `project.controller.js` proved that the Secretary ADM Compliance Gate is an absolute blocker for tiered digital signatures. Tests must model the exact chronological sequence: Proponent submits $\to$ Panelist verifies $\to$ Secretary endorses $\to$ Committee signs.

3. **Establishing Playwright Automation Invariants**:
   - The presence of the background notification poller `/api/notifications?page=1&limit=1` means that any test awaiting `networkidle` will freeze until timeout. Therefore, the specification explicitly bans `networkidle` and mandates `domcontentloaded` with explicit skeleton/hydration detachment.

4. **Synthesizing Deliverables**:
   - All 14 scenarios were systematically documented in `dom_verification_checkpoints.md` with:
     * Scenario Objective, Actor, Route, and View component path
     * API endpoints, HTTP methods, and status codes
     * Chronological table of DOM verification checkpoints with exact locators and asserted states
     * Screenshots/evidence paths under `scratch/qa-evidence/`
     * Discovered features table (18 features) and edge cases table (10 boundary conditions).

---

## 3. Caveats

1. **Database Seeding Prerequisite**:
   - The checkpoints assume the database is seeded with canonical BukSU users (`Password123!`). In test suites, seed state must be validated or reset before running Phase 0 through Phase 4 workflows sequentially.
2. **Sequential Scenario Dependencies**:
   - Scenarios 1–14 form an end-to-end lifecycle DAG. For instance, Scenario 4 (Title Approval) depends on the project created in Scenario 3 and defense scheduled in Scenario 7 (or Phase 1 scheduling). Similarly, Scenario 13 (Dean Clearance) requires Scenarios 10–12 to be completed.
3. **Third-Party OCR / Plagiarism Engine Mocking in Isolated Tests**:
   - The Python `cms-ocr-engine` (PaddleOCR-VL) and FastAPI plagiarism engine run in Docker containers. In headless unit or lightweight E2E test runs where those microservices are offline, tests must handle or stub the asynchronous BullMQ fallback status (`ocrStatus: 'degraded'`).
4. **No Implementation Actions Taken**:
   - In accordance with the Specification Miner role contract, no production code or test files were modified or created.

---

## 4. Conclusion

- The specification mining mission is **100% complete**.
- `dom_verification_checkpoints.md` provides an exhaustive, robust blueprint for the E2E Test Writer (`e2e_test_writer_1`) and QA engineers to implement the Playwright test harness (`scripts/qa-browser-e2e.mjs`) with zero simulation and zero guesswork.
- All 11 personas, 14 scenarios, semantic locators, validation gates, boundary conditions, and API payloads have been verified directly against the production codebase.

---

## 5. Verification Method

To independently verify the discoveries and assertions documented in this report:

1. **Inspect Mined Specification Document**:
   - File: `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_spec_miner_3\dom_verification_checkpoints.md`
   - Verify all 14 scenarios, Section 4 (Features Discovered), and Section 5 (Edge Cases).

2. **Verify Codebase Line Citations**:
   - Check `client/src/App.jsx:327` for `"Initializing session..."` hydration element.
   - Check `server/modules/teams/team.service.js:assignCommittee` for `INSTRUCTOR_COMMITTEE_EXCLUSION`.
   - Check `client/src/pages/projects/ActionDoneMatrixTab.jsx:1070` for `admSignatures.secretary.endorsed` gate.
   - Check `client/src/pages/projects/Capstone1CollapsibleSections.jsx:241` for defense schedule prerequisite before title approval.

3. **Verify Route Parity & Compliance**:
   ```bash
   npm run check:endpoints
   npm run validate:agentic
   ```
