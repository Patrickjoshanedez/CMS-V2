# Project: BukSU Capstone Management System V2 (CMS-V2) System-Wide UI Redesign, Workflow Integrity & Testing

## Architecture
- **Frontend SPA**: React 18, Vite, Tailwind CSS, Zustand Store, TanStack React Query (`client/src/`).
- **Backend REST API**: Express.js 5 + Mongoose 9 ODM + Redis + BullMQ (`server/`).
- **Plagiarism & Similarity**: FastAPI + Celery + ChromaDB (BAAI/bge-m3 dense + sparse vector core) + Winnowing (`plagiarism_engine/`).
- **Design Tokens & Shell**: Institutional BukSU Gold (`#F5C253`) and Navy Blue (`#1A448A`), Tailwind CSS variable tokens (`bg-background`, `text-foreground`, `border-border/60`), canonical `DashboardLayout` (`max-w-7xl`).
- **Unified Document Viewer**: Canonical `SophisticatedDocumentViewer.jsx` format supporting inline (`embedded={true}`) and modal (`open={true}`) presentations with full OOXML and PDF streaming.
- **Printing Architecture**: `@media print` unrolling, removing overflow clipping, hiding interactive chrome (`print:hidden`), paper margins (`@page { margin: 1in; size: letter portrait; }`), and high-contrast black-on-white text for official paper deliverables.
- **Institutional Roles & Committees**: Primary roles (`student`, `instructor`, `faculty`). Faculty appointments (`adviser`, `secretary`, `panelist`, `chair`). Complete exclusion of Instructors from defense committees. Secretary Compliance Gate prerequisite before Tier 1–3 ADM digital signatures.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Expose Final Approval Sheet in UI | Connect uncalled backend endpoint `GET /api/projects/:id/approval-sheet` to `CertificatePage.jsx`, `ActionDoneMatrixTab.jsx`, and `ProjectSubmissionsPage.jsx` | M1 | Survey 1 |
| 2 | Document Reader Print Handling | Add Print button and unrolled `@media print` styling to `SophisticatedDocumentViewer.jsx` (remove overflow scroll & zoom clipping on print) | M1 | Survey 1 |
| 3 | Plagiarism Report Print Stylesheet | Add `@media print` styles and `print:hidden` utility classes to `PlagiarismReportPage.jsx` to eliminate active UI controls and scroll clipping | M1 | Survey 1 |
| 4 | Radix Dialog Print Unrolling | Add global print unrolling in `index.css` for `[role="dialog"]` and `LiveDefenseMinutesModal.jsx` to prevent 90vh clipping and dark backdrop bleed | M1 | Survey 1 |
| 5 | Printable Evaluation Scoresheet | Implement printable evaluation rubric scoresheet format in `EvaluationPanel.jsx` for defense panel scoring records | M1 | Survey 1 |
| 6 | Global Print Stylesheet Polish | Unroll `.docx-outer-container` in `index.css`, establish clean paper margins, and force high-contrast print typography | M1 | Survey 1 |
| 7 | Mobile Touch Target Normalization | Enforce min 44x44px touch targets on mobile viewports (`min-h-[44px] sm:min-h-0 sm:h-8`) across `ActionDoneMatrixTab.jsx`, `PrototypeGalleryModal.jsx`, `ManuscriptTemplateWidget.jsx`, `TeamFormationNotificationItem.jsx`, and `SubmissionReviewPage.jsx` | M2 | Survey 1 |
| 8 | Layout Width Shell Continuity | Remove hardcoded `max-w-5xl` clamping in `CanonicalDocumentViewer.jsx` and optimize oversized `max-w-6xl` containers to align with `DashboardLayout` `max-w-7xl` | M2 | Survey 1 |
| 9 | Heading Hierarchy Correction | Demote duplicate `<h1>` in `CanonicalDocumentViewer.jsx:1275` to semantic `<h2>` | M2 | Survey 1 |
| 10 | Form Chunking (Cowan 4-Chunking) | Refactor dense forms (>5 inputs) with semantic `<fieldset>` and `<legend>` across `UsersPage.jsx`, `ExistingCapstoneUploadPage.jsx`, `ProfilePage.jsx`, `ScheduleDefenseModal.jsx`, and `MilestoneDeadlinesModal.jsx` | M2 | Survey 1 |
| 11 | Responsive Table Overflow Wrappers | Add horizontal overflow wrappers (`overflow-x-auto`) to scoring tables in `EvaluationPanel.jsx`, diff tables in `VersionCompare.jsx`, and `SecretaryMinutesDocumentSheet.jsx` | M2 | Survey 1 |
| 12 | CreateProjectPage Test Fixture Fix | Add `pitchDeck` fields to mock state in `CreateProjectPage.test.jsx:1071` to satisfy component validation guard and restore 20/20 passing tests | M3 | Survey 2 |
| 13 | Role Navigation & Workflow Verification | Verify and test UI views and transitions for Student, Instructor, Adviser, Secretary, Panelist, Chair, and Dean without console errors or broken API calls | M3 | Survey 2 |
| 14 | Secretary ADM Compliance Gate UI Verification | Verify Secretary minutes publishing and endorsement banner indicators in `ActionDoneMatrixTab.jsx` | M3 | Survey 2 |
| 15 | Dedicated Seed Accounts Expansion | Update `server/seeders/seed-canonical-role-accounts.js` and `server/seeders/index.js` to seed 11 dedicated canonical accounts (Student Lead/Members, Instructor, Adviser, Secretary, Panelists 1–3, Dean) | M4 | Survey 3 |
| 16 | Seed Account Authentication Invariants | Ensure seed accounts have verified status, valid bcrypt hashed passwords (`Password123!`), correct roles and faculty appointments, and satisfy committee composition rules | M4 | Survey 3 |
| 17 | E2E Testing Infrastructure Setup | Establish opaque-box test runner, Playwright configurations, and 4-tier test case hierarchy (Tiers 1–4) derived from user requirements | E2E | Survey 3 |
| 18 | Tier 1: Feature Coverage E2E Suite | Implement >=5 test cases per feature across UI, deliverables, and role actions | E2E | Survey 3 |
| 19 | Tier 2: Boundary & Corner Case Suite | Implement boundary tests (empty inputs, role mismatches, unauthorized access, late justification flags) | E2E | Survey 3 |
| 20 | Tier 3: Cross-Feature Combinations Suite | Implement pairwise cross-feature tests across student proposal, instructor approval, committee assignment, and ADM signatures | E2E | Survey 3 |
| 21 | Tier 4: Real-World Application Scenarios | Implement end-to-end multi-role scenarios from team formation to archival and certificate issuance | E2E | Survey 3 |
| 22 | Anti-Simulation Browser Verification Execution | Execute 14-scenario anti-simulation Playwright browser test sweep across all 11 seed accounts without simulated finishes | M5 | Survey 3 |
| 23 | Adversarial Coverage Hardening (Tier 5) | Conduct white-box challenger analysis and patch any exposed edge cases | M5 | Strategy |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Paper Deliverables & Printing Format Integration | Features 1, 2, 3, 4, 5, 6 | none | PLANNED |
| M2 | UI Sizing, Spacing & Cognitive Ergonomics Overhaul | Features 7, 8, 9, 10, 11 | none | PLANNED |
| M3 | Workflow Integrity, Role Exclusions & Test Fixture Hardening | Features 12, 13, 14 | none | PLANNED |
| M4 | Dedicated Seed Accounts & Seeder Expansion | Features 15, 16 | none | PLANNED |
| M5 | Final Milestone: Pass 100% E2E Suite & Anti-Simulation Browser Verification | Features 22, 23 | M1, M2, M3, M4, E2E | PLANNED |
| E2E | E2E Testing Track (Tiers 1–4 Test Suite & Infrastructure) | Features 17, 18, 19, 20, 21 | none | PLANNED |

## Interface Contracts
### Deliverables & Printing Contract (M1)
- Endpoint: `GET /api/projects/:id/approval-sheet` returns binary `application/pdf` with attachment/inline content disposition.
- Client consumption: `authService.getApprovalSheetUrl(projectId)` or direct blob download/view via `SophisticatedDocumentViewer`.
- Print CSS: `.print-only` visible only under `@media print`; `.no-print` / `print:hidden` hidden on print; scroll wrappers (`overflow-auto`) reset to `overflow: visible; height: auto; max-height: none;` during print.
- Radix Dialogs: `[role="dialog"]` positioned statically with zero overlay opacity under print.

### UI Sizing & Ergonomics Contract (M2)
- Mobile touch target floor: `min-h-[44px] min-w-[44px]` for interactive controls on viewport width < 640px; desktop compactness preserved with `sm:min-h-0 sm:min-w-0 sm:h-8`.
- Shell max-width: Standardized to `max-w-7xl` matching `DashboardLayout.jsx`.
- Form chunking: Forms with >5 fields grouped into `<fieldset className="space-y-4 rounded-lg border border-border/60 p-4">` with `<legend className="text-sm font-semibold text-foreground px-2">`.

### Role Boundaries & Workflow Contract (M3)
- Course Instructor exclusion: `role: 'instructor'` strictly rejected from `adviser`, `secretary`, or `panelist` roles.
- Secretary ADM Gate: `project.admSignatures.secretary.endorsed === true` required before Tier 1–3 digital signatures unlock.
- Committee composition: Exactly 1 Adviser, 1 Secretary, 3 Panelists (Panelist 1 = Chair).

### Dedicated Seed Accounts Contract (M4)
- 11 canonical accounts:
  1. `student@student.buksu.edu.ph` (Student Lead - Team Alpha)
  2. `student2@student.buksu.edu.ph` (Student Member 2 - Team Alpha)
  3. `student3@student.buksu.edu.ph` (Student Member 3 - Team Alpha)
  4. `student4@student.buksu.edu.ph` (Student Member 4 - Team Alpha)
  5. `instructor@student.buksu.edu.ph` (Course Instructor)
  6. `adviser@student.buksu.edu.ph` (Capstone Adviser - Team Alpha)
  7. `secretary@student.buksu.edu.ph` (Committee Secretary - Team Alpha)
  8. `panelchair@student.buksu.edu.ph` (Defense Panel Chair - Team Alpha)
  9. `panelist2@student.buksu.edu.ph` (Defense Panelist 2 - Team Alpha)
  10. `panelist3@student.buksu.edu.ph` (Defense Panelist 3 - Team Alpha)
  11. `dean@student.buksu.edu.ph` (College Dean)
- Default credentials: password `Password123!`, `isVerified: true`, `isActive: true`.

## Code Layout
- `client/src/components/documents/` — Canonical document viewers (`SophisticatedDocumentViewer.jsx`)
- `client/src/components/projects/` — Action Done Matrix, Evaluation Panel, Project cards
- `client/src/components/ui/` — Design primitives (`Dialog.jsx`, `Button.jsx`, `Table.jsx`)
- `client/src/pages/submissions/` — Plagiarism Report, Submission reviews
- `client/src/pages/projects/` — Create Project, Project Details, Approval Sheet view
- `client/src/index.css` — Global print stylesheets and CSS variables
- `server/seeders/` — Canonical role account seeders
- `server/modules/projects/` — Approval sheet generation, ADM controllers, archive service
- `scratch/` — Playwright browser test verification scripts and visual audit harnesses
