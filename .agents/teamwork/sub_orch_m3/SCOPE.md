# Scope: Milestone 3 — Workflow Integrity, Role Exclusions & Test Fixture Hardening

## Architecture
- Target files:
  - `client/src/pages/projects/CreateProjectPage.test.jsx` (test fixture & React change event trigger)
  - `client/src/pages/projects/CreateProjectPage.jsx` (component edit mode validation)
- Verification targets:
  - Role-specific navigation menus and pages (Student, Instructor, Faculty: Adviser, Secretary, Panelist, Chair, Dean)
  - Secretary ADM Gate UI indicators in `ActionDoneMatrixTab.jsx`
- Core Invariants:
  - Course Instructor exclusion from capstone defense committees (`role === 'instructor'` cannot be adviser, secretary, or panelist)
  - Secretary compliance verification gate in Phase 4 ADM v3 (`project.admSignatures.secretary.endorsed === true` required before Tier 1–3 signatures unlock)
  - 100% passing tests for `CreateProjectPage.test.jsx` (20/20 tests passing)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 12 | CreateProjectPage Test Fixture Fix | Add missing `pitchDeck` fields (`objectives`, `technicalStack`) to mock state in `CreateProjectPage.test.jsx:1071`, ensure `fillRequiredProposalDetails` triggers change events properly, and verify 20/20 tests pass | M3 | Survey 2 |
| 13 | Role Navigation & Workflow Verification | Verify and test UI views and transitions for Student, Instructor, Adviser, Secretary, Panelist, Chair, and Dean without console errors or broken API calls | M3 | Survey 2 |
| 14 | Secretary ADM Compliance Gate UI Verification | Verify Secretary minutes publishing and endorsement banner indicators in `ActionDoneMatrixTab.jsx` accurately reflect `project.admSignatures.secretary.endorsed` | M3 | Survey 2 |

## Milestones / Sub-tasks
| # | Task | Scope | Status |
|---|------|-------|--------|
| 3.1 | Technical Exploration | Explore `CreateProjectPage.test.jsx`, identify exact root cause and fix strategy, check role views & Secretary ADM gate | IN_PROGRESS |
| 3.2 | Worker Implementation | Update `CreateProjectPage.test.jsx`, run targeted test suite, verify 20/20 pass | PLANNED |
| 3.3 | Reviewer Verification | Independent code review & test verification by 2 Reviewers | PLANNED |
| 3.4 | Challenger Verification | Adversarial verification by 2 Challengers | PLANNED |
| 3.5 | Forensic Audit Verification | Integrity check by Forensic Auditor | PLANNED |
| 3.6 | Gate & Handoff | Gate pass check, report to parent orchestrator | PLANNED |

## Interface Contracts
- `client/src/pages/projects/CreateProjectPage.test.jsx`: Must test `CreateProjectPage.jsx` edit mode with full proposal pitchDeck fields without mocking out the validation logic.
- `team.service.js` & `ActionDoneMatrixTab.jsx`: Committee composition and Secretary endorsement gates must remain strictly intact.
