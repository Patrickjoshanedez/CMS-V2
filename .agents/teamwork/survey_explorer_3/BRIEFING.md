# BRIEFING — 2026-09-28T06:26:20Z

## Mission
Conduct a technical survey and exploration of Phase 5 (Progressive Widget Loading & Layout Architecture) and Testing/Governance verification.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\survey_explorer_3
- Original parent: 1714716d-2fa0-43f0-bb45-4ec063aeb453
- Milestone: Phase 5 & Testing/Governance Survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Deliver findings to c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\survey_explorer_3\handoff.md
- Adhere to AGENTS.md and GEMINI.md rules

## Current Parent
- Conversation ID: 1714716d-2fa0-43f0-bb45-4ec063aeb453
- Updated: 2026-09-28T06:26:20Z

## Investigation State
- **Explored paths**:
  - `client/src/components/dashboards/InstructorDashboard.jsx` & `client/src/pages/dashboard/DashboardPage.jsx`
  - `client/src/components/dashboards/KPICards.jsx`, `WorkloadHeatmap.jsx`, `OptimizationEngine.jsx`, `CalendarScheduler.jsx`
  - `client/src/components/ui/PageSkeleton.jsx` & `Skeleton.jsx`
  - `client/src/components/auth/BukSULoginSidePanel.jsx` & `client/src/pages/auth/LoginPage.jsx`
  - `client/src/App.jsx`, `App.routes.test.jsx`, `App.error-routes.test.jsx`
  - `client/src/components/users/TeamCommitteeAssignmentsView.jsx` & `TeamCommitteeAssignmentsView.test.jsx`
  - `client/src/components/archive/GoogleScholarSidebar.jsx` & `client/src/components/projects/PrototypeGallery.jsx`
  - `client/src/components/projects/ProjectCohortCard.jsx` & `ProjectCohortCard.test.jsx`
  - `client/src/pages/instructor/DefenseSchedulingPage.jsx`
  - `scratch/` visual audit scripts (`visual_audit_defense_scheduling.mjs`, `audit_landing_and_login_parallax.mjs`, etc.)
- **Key findings**:
  1. `InstructorDashboard.jsx` has a monolithic blocking gate `if (kpisLoading || workloadLoading) return <PageSkeleton />` at lines 53-64, blocking `<CalendarScheduler />`, `<OptimizationEngine />`, and page headers while slow aggregate workload queries run.
  2. `BukSULoginSidePanel.jsx` lines 164-196 contains a static 2x2 grid combining Phase 0-1 and line 118 has a multi-stop gradient heading. Needs conversion to a 5-step canonical BukSU milestone progression timeline (Phase 0 $\to$ Phase 4) with institutional gold tokens and connecting track.
  3. Running `npm test --workspace=client -- src/components/projects/ProjectCohortCard.test.jsx` failed due to missing QueryClient context (`usePrefetchProject` hook), needing a mock or `QueryClientProvider`.
  4. `TeamCommitteeAssignmentsView.test.jsx` (5 tests) and `App.routes.test.jsx` (6 tests) pass in 1-2 seconds with fast-path execution.
  5. Playwright scripts in `scratch/` follow a standard 110s watchdog, `waitUntil: 'domcontentloaded'`, Desktop (1440x900) & Mobile (390x844), Light & Dark mode capture pattern.
- **Unexplored areas**:
  - Full end-to-end implementation and Playwright visual capture (reserved for implementer agents).

## Key Decisions Made
- Fully documented exact file paths, line numbers, and architectural decoupling strategies for Phase 5.
- Documented testing matrix and established root cause for broken `ProjectCohortCard.test.jsx` test baseline.
- Compiled complete 5-component handoff report at `c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\survey_explorer_3\handoff.md`.

## Artifact Index
- `DISPATCH.md` — Incoming dispatches
- `BRIEFING.md` — Working memory & state
- `progress.md` — Liveness heartbeat
- `handoff.md` — Final survey handoff report
