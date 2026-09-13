# Lesson Learned: Proposal Compilation UI Consistency & Institutional File Upload Standard

## Context & Problem
During review of the Proposal Compilation page (`/project/proposal`), multiple visual and functional inconsistencies with the BukSU CMS-V2 design system were identified:
1. **Raw Database Enum Badges**: The project info card displayed raw unformatted strings such as `Project pending_for_submission` with underscores and lowercase `Title approved`.
2. **Unstyled Native File Input**: The document upload section rendered a default browser `<input type="file">` ("Choose File No file chosen") inside a dark input border box, breaking dark mode styling and contrasting with the interactive dropzone standard used on `ChapterUploadPage`.
3. **Missing Chapter Breakdown**: Students were only shown a single generic checkmark "Chapters 1-3 are ready" with no chapter-by-chapter status, round number, or version visibility.
4. **Layout & Spacing Inconsistencies**: Spacing, borders, and progress text were unrefined rather than using consistent design system tokens (`bg-background`, `text-foreground`, `border-border/60`).

## Solution & Architecture
1. **Standardized Status Badges**:
   - Replaced raw text badges with canonical `<TitleStatusBadge status={project.titleStatus} />` and `<ProjectStatusBadge status={project.projectStatus} />`.
   - Integrated academic year tag (`2025-2026`) and Capstone Phase pill (`Capstone 2 Proposal`).
   - Applied defensive entity prefix normalization to team names (`team.name.replace(/^Team\s+/i, '').trim()`).
2. **Interactive Drag-and-Drop Dropzone**:
   - Implemented canonical CMS-V2 dropzone with dashed border, hover transitions, format guidance (`PDF, DOCX, or DOC`), and max size specification (25 MB).
   - Added drag-and-drop listeners (`onDragOver`, `onDragLeave`, `onDrop`).
   - Selected file review card displaying document icon, full file name, formatted file size (`formatBytes`), file type badge, and a prominent remove button.
   - Client-side validation for file types and file size boundaries with immediate inline error feedback.
3. **Chapter-by-Chapter Readiness Matrix (Chapters 1–3)**:
   - Rendered a dedicated 3-chapter status matrix (`Chapter 1: Introduction`, `Chapter 2: Review of Related Literature`, `Chapter 3: Technical Methodology`) showing each chapter's approval status, round/version (`Round v1`, `Round v2`), and readiness indicator (`[✔] Approved` / `[⏳] Pending`).
   - Upgraded prerequisites into clear status cards with semantic icons (`CheckCircle2`, `Clock`, `ShieldCheck`).
4. **Refined Remarks & Upload Progress**:
   - Upgraded remarks textarea with clear reviewer visibility helper caption.
   - Dynamic animated progress bar during compilation upload.
   - Refined institutional advice banner ("Before you submit").

## Prevention Rule & Checklist
- **Checklist 1 (Status Badges)**: Never render raw database status enums (e.g. `pending_for_submission`, `revision_needed`) in presentation templates. Always use the project's dedicated badge components (`ProjectStatusBadge`, `TitleStatusBadge`, `SubmissionStatusBadge`).
- **Checklist 2 (File Uploads)**: Avoid unstyled native `<input type="file">` elements. All file upload flows across CMS-V2 must use the interactive drag-and-drop dropzone pattern with hidden input, drag event styling, selected file review card, and client-side validation for file type and size.
- **Checklist 3 (Chapter Progression Transparency)**: Whenever a multi-chapter prerequisite is required (e.g. Chapters 1–3 for proposal compilation), always break down each individual chapter's status, round, and version rather than displaying a single opaque boolean indicator.
- **Runbook (Verification Battery)**:
  1. Targeted Unit Tests: `npm test --workspace=client -- src/pages/submissions/ProposalCompilationPage.test.jsx` (4/4 passed).
  2. Related Submissions Tests: `npm test --workspace=client -- src/pages/submissions/ProjectSubmissionsPage.test.jsx` (3/3 passed).
  3. API Route Parity: `npm run check:endpoints` (204 Server / 182 Client, UNMATCHED_COUNT = 0).
  4. Agentic Governance: `npm run validate:agentic` (60/60 checks passed).
  5. Playwright Visual Feedback Loop: Multi-viewport audit across Desktop (1440x900) and Mobile (390x844) in Light and Dark modes.

## Evidence
- **Passed**: 4/4 targeted client unit tests in `ProposalCompilationPage.test.jsx`.
- **Passed**: 3/3 submission suite tests in `ProjectSubmissionsPage.test.jsx`.
- **Passed**: 0 unmatched endpoints in `check:endpoints`.
- **Passed**: 60/60 agentic validation checks in `validate:agentic`.
- **Passed**: Pristine workspace in `workspace_guardrail.py`.
- **Evidence Screenshots**:
  - `01_desktop_light_top.png`
  - `02_desktop_light_upload_dropzone.png`
  - `03_desktop_dark_top.png`
  - `04_desktop_dark_upload_dropzone.png`
  - `05_desktop_dark_file_selected.png`
  - `06_mobile_light_upload_dropzone.png`
