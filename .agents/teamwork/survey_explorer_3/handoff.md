# Handoff Report: Phase 5 & Testing/Governance Verification Survey

**Author**: `survey_explorer_3`  
**Role**: Teamwork Explorer (Read-only Investigation & Synthesis)  
**Parent**: `orchestrator_1` (Conversation ID: `1714716d-2fa0-43f0-bb45-4ec063aeb453`)  
**Date**: 2026-09-28T06:26:00Z  
**Target Milestone**: Phase 5 (Progressive Widget Loading & Milestone Progression) & Verification Infrastructure  

---

## 1. Observation

### 1.1 `InstructorDashboard.jsx` Architecture & Monolithic Loading Gate
* **File Path**: `client/src/components/dashboards/InstructorDashboard.jsx` (imported at line 10 and rendered at lines 495-497 in `client/src/pages/dashboard/DashboardPage.jsx`).
* **Query & State Mapping**:
  1. `useSettingsStore()` (line 15): Retrieves `deadlines = []` synchronously from Zustand store. Does not require any network call.
  2. `useQuery(['instructorKpis'])` (lines 16-27):
     - Query function: `dashboardService.getInstructorKpis()`
     - Returns `kpisData` (`totals`, `pipeline`, `performance`)
     - State variables: `kpisLoading`, `kpisError`
     - Consumers: Page header quick stat pills (`totals.totalProjects`, `pipeline.pendingSubmissions`, `performance.completionRatePercent`), and `<KPICards kpis={kpis} />`.
  3. `useQuery(['instructorWorkload'])` (lines 29-41):
     - Query function: `dashboardService.getInstructorWorkload()`
     - Returns `workloadData` (`advisers`, `summary`)
     - State variables: `workloadLoading`, `workloadError`, `refetchWorkload`
     - Consumers: `<WorkloadHeatmap workload={workload} />`.
  4. `useMutation(dashboardService.optimizeInstructorWorkload)` (lines 43-51):
     - Mutation: `optimizeMutation.mutate()`
     - State variables: `optimizeMutation.data`, `optimizeMutation.isPending`
     - Consumers: `<OptimizationEngine />`.
  5. `<CalendarScheduler />` (lines 123-125):
     - Consumes `deadlines` from `useSettingsStore()` and `defenseSchedules={[]}`.
* **Monolithic Blocking Gate (Lines 53-64)**:
  ```jsx
  if (kpisLoading || workloadLoading) {
    return <PageSkeleton />;
  }

  if (kpisError || workloadError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load instructor dashboard data.</AlertDescription>
      </Alert>
    );
  }
  ```
  **Direct Impact**:
  - If `instructorWorkload` takes 1.5s while `instructorKpis` takes 80ms, the entire screen renders `<PageSkeleton />` for 1.5s.
  - The page header ("Instructor Command Center"), `<KPICards />`, `<OptimizationEngine />`, and `<CalendarScheduler />` (which already has local deadline state) are completely blocked from user view.
  - A network error in either query causes a complete dashboard failure Alert, blocking the healthy widgets.

---

### 1.2 `BukSULoginSidePanel.jsx` Architecture & Static 2x2 Decorative Grid
* **File Path**: `client/src/components/auth/BukSULoginSidePanel.jsx` (rendered beside `LoginPage.jsx` inside desktop viewports).
* **Static 2x2 Grid (Lines 164-196)**:
  ```jsx
  <div className="relative z-10 grid grid-cols-2 gap-3">
    {CAPSTONE_STAGES.map((stage, idx) => {
      ...
    })}
  </div>
  ```
  Defined in lines 25-54:
  - `Phase 0-1`: 'Proposal & Title Defense' (Combines Phase 0 & Phase 1)
  - `Phase 2`: 'Chapters 1–3 Manuscript'
  - `Phase 3`: 'Prototype & Gantt Milestones'
  - `Phase 4`: 'Final Defense & Archival'
* **Styling & AI Slop Observations**:
  - Cliché multi-stop gradient heading at lines 118-121:
    ```jsx
    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5C253] via-[#E5A823] to-[#C68A1B]">
      title proposal
    </span>
    ```
  - Redundant inline styles at lines 101, 126, 151, 158, 175, 183, 189, 202, 208, 220:
    e.g., `style={{ color: '#e2e8f0' }}`, `style={{ color: '#cbd5e1' }}`, `style={{ color: '#F5C253' }}`.
  - Static 2x2 card grid lacks sequential directional flow, failing to represent BukSU's canonical 5-phase progression (Phase 0 $\to$ Phase 1 $\to$ Phase 2 $\to$ Phase 3 $\to$ Phase 4).

---

### 1.3 Target Components & Baseline Test Status Across Phases 1–5
1. **`InstructorDashboard.jsx`**:
   - **Status**: No dedicated unit test exists (`FacultyDashboard.test.jsx` exists in `client/src/pages/dashboard/`, but zero tests for `InstructorDashboard`).
2. **`LoginPage.jsx` & `BukSULoginSidePanel.jsx`**:
   - **Status**: No dedicated unit test exists for `LoginPage` or `BukSULoginSidePanel`. (Audited previously only via Playwright visual audit scripts).
   - In `LoginPage.jsx` lines 237-244, `<GoogleLogin />` lacks `locale="en"` or `hl="en"`.
3. **`App.jsx`**:
   - **Existing Tests**: `client/src/App.routes.test.jsx`, `client/src/App.error-routes.test.jsx`, `client/src/App.session-timeout.test.jsx`.
   - **Route Observation**: In `client/src/App.jsx` lines 213-239, `/committee-assignments` and `/scheduling-center` are registered, but legacy shorthand paths `/committee` and `/scheduling` are missing redirects.
4. **`TeamCommitteeAssignmentsView.jsx`**:
   - **Existing Test**: `client/src/components/users/TeamCommitteeAssignmentsView.test.jsx` passes 5/5 tests in 1.56s (`task-120`).
   - **Touch Target / ARIA Observation**:
     - Remove panelist button (lines 826-833): `className="h-6 w-6"` (24x24px, violating WCAG 44x44px touch targets).
     - Accordion chevron toggle (lines 886-892): `className="h-7 w-7 p-0"` (28x28px, violating 44x44px touch targets), missing `aria-label="Toggle Project Milestones & Deadlines"` and `aria-expanded={isDeadlinesOpen}`.
5. **`GoogleScholarSidebar.jsx` & `PrototypeGallery.jsx`**:
   - **File Paths**: `client/src/components/archive/GoogleScholarSidebar.jsx` (preset buttons lines 100-110 use `py-1` ~24px height), and `client/src/components/projects/PrototypeGallery.jsx` (delete button line 119: `h-7 w-7`, close button line 192: `h-6 w-6`, mode toggles line 204: `h-7`).
6. **`ProjectCohortCard.jsx` & `DefenseSchedulingPage.jsx`**:
   - **`border-l-4` Accents**:
     - `client/src/components/projects/ProjectCohortCard.jsx:162`: `isActionNeeded && 'border-l-4 border-l-amber-500 dark:border-l-amber-400'`
     - `client/src/pages/instructor/DefenseSchedulingPage.jsx:2116`: `className={`absolute left-1 right-1 rounded-lg border-l-4 border-l-blue-600 ...`
   - **Baseline Test Issue in `ProjectCohortCard.test.jsx`**:
     - Execution of `npm test --workspace=client -- src/components/projects/ProjectCohortCard.test.jsx` (`task-173`) failed with:
       ```
       Error: No QueryClient set, use QueryClientProvider to set one
           at useQueryClient (QueryClientProvider.js:9:21)
           at usePrefetchProject (useProjects.js:108:23)
           at ProjectCohortCard (ProjectCohortCard.jsx:77:27)
       ```
       `ProjectCohortCard.jsx` added `usePrefetchProject()` which calls `useQueryClient()`, but `ProjectCohortCard.test.jsx` was not wrapped in `QueryClientProvider` or mocked.
7. **Legacy Document Viewers**:
   - `client/src/components/documents/PaginatedDocumentViewer.jsx` and `client/src/components/projects/ReadonlyPDFViewer.jsx` are obsolete dead-code files only referenced by their own test/mocks (`PaginatedDocumentViewer.test.jsx`, `PlagiarismReportPage.test.jsx:37`, `ProjectDetailPage.back-nav.test.jsx:81`).

---

### 1.4 Playwright Visual Verification Infrastructure in `scratch/`
* **Audit Scripts Examined**: `scratch/visual_audit_defense_scheduling.mjs`, `scratch/audit_landing_and_login_parallax.mjs`, `scratch/visual_audit_milestone_progression.mjs`.
* **Standard Verification Pattern**:
  - Chromium headless runner with strict 110s watchdog (`setTimeout(() => process.exit(1), 110000)`).
  - Navigation using `{ waitUntil: 'domcontentloaded' }` (Strict `networkidle` ban per Rule 16).
  - Viewports:
    - **Desktop**: 1440 × 900 (`{ width: 1440, height: 900 }`)
    - **Mobile**: 390 × 844 (`{ width: 390, height: 844, deviceScaleFactor: 2 }`)
  - Theming:
    - **Light Mode**: `document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light');`
    - **Dark Mode**: `document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark');`
  - Dual capture: Images stored in `scratch/` and copied to `ARTIFACTS_DIR`.

---

## 2. Logic Chain

```
[Observation 1.1: Monolithic gate `if (kpisLoading || workloadLoading) return <PageSkeleton />`]
       │
       ▼
[Deduction 1: Slow query (workload) blocks fast query (kpis) and local store (deadlines)]
       │
       ▼
[Deduction 2: Cascading failure occurs if either query errors out]
       │
       ▼
[Proposed Architecture: Decouple into progressive widget-level skeletons:
 - Page Header: Title renders immediately, stats show mini shimmers when kpisLoading.
 - KPICards: KPICardsSkeleton shown while kpisLoading; error card with retry if kpisError.
 - WorkloadHeatmap: WorkloadHeatmapSkeleton shown while workloadLoading; error card if workloadError.
 - OptimizationEngine: Renders immediately with aria-busy for suggestions.
 - CalendarScheduler: Renders immediately using deadlines from useSettingsStore.]
```

```
[Observation 1.2: BukSULoginSidePanel 2x2 grid combines Phase 0-1 and has static boxes]
       │
       ▼
[Deduction 1: Violates Ground Truth (Phase 0 Roster Lock is distinct from Phase 1 Title Defense)]
       │
       ▼
[Deduction 2: Static 2x2 grid does not convey temporal milestone gating or directional flow]
       │
       ▼
[Proposed Architecture: 5-Step Vertical Connected Timeline:
 - Node 0: Phase 0 Team Formation & Roster Lock (Users icon, Roster Lock badge)
 - Node 1: Phase 1 Title Defense & Similarity Pre-Scan (GitBranch icon, BAAI/bge-m3 badge)
 - Node 2: Phase 2 Chapters 1-3 & Midterm Defense (Layers icon, Plagiarism <25% badge)
 - Node 3: Phase 3 Prototype & Progress Defense (Cpu icon, Gantt Milestone badge)
 - Node 4: Phase 4 Final Defense & Archival (ShieldCheck icon, MinIO Vault badge)
 - Connected by an authentic vertical tracking line with pulse node on current/active phase]
```

```
[Observation 1.3: ProjectCohortCard.test.jsx failed due to missing QueryClientProvider]
       │
       ▼
[Deduction: Fast-path unit test execution is broken on master for ProjectCohortCard]
       │
       ▼
[Proposed Fix: Mock usePrefetchProject in ProjectCohortCard.test.jsx or wrap with QueryClientProvider]
```

---

## 3. Caveats

1. **Read-Only Sandbox**: No production code or tests were modified during this investigation. All observations were made by viewing source files and running read-only test runners.
2. **Backend Query Independence**: The backend API endpoints `GET /api/dashboard/instructor/kpis` and `GET /api/dashboard/instructor/workload` are already implemented as separate REST endpoints in Express. Their decoupling on the client frontend requires no server-side route changes.
3. **Screen Vertical Budget on Login**: The side panel in `BukSULoginSidePanel.jsx` has `max-h-screen` and `overflow-hidden`. The 5-step milestone progression must remain vertically compact (each node ~44–50px) to prevent vertical overflow on 1440x900 screens.

---

## 4. Conclusion & Recommendations

### 4.1 Recommended Phase 5 Implementation Blueprint

#### A. Progressive Widget Loading in `InstructorDashboard.jsx`
1. **Remove the Monolithic Gate**: Delete lines 53-64 of `client/src/components/dashboards/InstructorDashboard.jsx`.
2. **Header Stats Shimmer**:
   ```jsx
   <div className="grid grid-cols-3 gap-3">
     <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
       <p className="text-[11px] uppercase font-semibold tracking-wide text-muted-foreground">Projects</p>
       {kpisLoading ? (
         <Skeleton className="h-8 w-12 mx-auto my-0.5 rounded" />
       ) : (
         <p className="text-2xl font-bold text-foreground">{kpis?.totals?.totalProjects ?? '-'}</p>
       )}
     </div>
     {/* Same pattern for Pending and Completion */}
   </div>
   ```
3. **Widget Skeletons**:
   - `KPICardsSkeleton`: 4 cards in `grid sm:grid-cols-2 xl:grid-cols-4` + 1 bottom summary card with 3 metric skeletons.
   - `WorkloadHeatmapSkeleton`: Card container with table header and 4 animated shimmer rows.
   - `WidgetErrorFallback`: Inline Card with error message and retry button calling `refetch()`.
4. **Instant Widgets**:
   - `<OptimizationEngine />` renders immediately with initial prompt and `aria-busy={optimizeMutation.isPending}` on the trigger.
   - `<CalendarScheduler />` renders immediately with `deadlines` from `useSettingsStore()`.

#### B. Milestone Progression Timeline in `BukSULoginSidePanel.jsx`
1. **Replace `CAPSTONE_STAGES` with 5 Canonical BukSU Phases**:
   - Phase 0: Roster Lock & Committee Setup (Adviser, Chair, Secretary, Panelists)
   - Phase 1: Capstone 1 Title Defense (`BAAI/bge-m3` live cosine pre-scan, SDG tagging)
   - Phase 2: Capstone 2 Chapters 1–3 Manuscript (Dual Plagiarism `< 25%`, ADM v1)
   - Phase 3: Capstone 3 Prototype & Progress Defense (4-milestone Gantt, late justification gating, ADM v2)
   - Phase 4: Capstone 4 Final Defense & Archival (Secretary endorsement gate, 3-tier ADM, MinIO auto-archival)
2. **Timeline Visual Structure**:
   - Vertical timeline with an institutional connecting line (`before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5A823]/30`).
   - Compact node rows with stage badge, title, and one-line description.
   - Replace gradient heading (`bg-gradient-to-r`) with high-contrast institutional color token `text-[#F5C253]` (R4).
   - Remove redundant `style={{ color }}` inline styles (R1).

---

## 5. Verification Method & Test Plan

### 5.1 Fast-Path Targeted Unit Test Execution Matrix
The implementer can execute each focused test file in 1–3 seconds:

| Phase | Target Component | Command | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Document Viewer Parity | `npm test --workspace=client -- src/components/documents/SophisticatedDocumentViewer.test.jsx` | 100% Pass; confirm removal of `PaginatedDocumentViewer.test.jsx` |
| **Phase 2** | Touch Targets & Accordion | `npm test --workspace=client -- src/components/users/TeamCommitteeAssignmentsView.test.jsx` | 100% Pass (5+ tests, assert 44x44px touch bounding box) |
| **Phase 3** | App Route Redirects | `npm test --workspace=client -- src/App.routes.test.jsx` | 100% Pass (assert `/committee` $\to$ `/committee-assignments`, `/scheduling` $\to$ `/scheduling-center`) |
| **Phase 4** | Card Border Accents & Landing | `npm test --workspace=client -- src/components/projects/ProjectCohortCard.test.jsx` | 100% Pass (with QueryClientProvider mock; assert zero `border-l-4` tells) |
| **Phase 4** | Scheduling Page Accents | `npm test --workspace=client -- src/pages/instructor/DefenseSchedulingPage.test.jsx` | 100% Pass (assert zero `border-l-4` tells) |
| **Phase 5** | Progressive Loading Dashboard | `npm test --workspace=client -- src/components/dashboards/InstructorDashboard.test.jsx` | 100% Pass (assert decoupled widget skeletons and instant header/calendar rendering) |
| **Phase 5** | Side Panel Milestone Timeline | `npm test --workspace=client -- src/components/auth/BukSULoginSidePanel.test.jsx` | 100% Pass (assert 5 milestone stages and zero gradient text) |

### 5.2 Playwright Visual Verification Plan in `scratch/`
Create `scratch/visual_audit_phase5_and_design_gates.mjs` verifying:
1. **Desktop Viewport (1440 × 900)**:
   - Light & Dark: `InstructorDashboard` renders header, calendar, and progressive skeletons gracefully before network resolution.
   - Light & Dark: `LoginPage` + `BukSULoginSidePanel` renders connected 5-phase milestone timeline without vertical overflow or gradient headings.
   - Light & Dark: `ProjectCohortCard` and `DefenseSchedulingPage` render balanced borders with zero `border-l-4` tells.
2. **Mobile Viewport (390 × 844)**:
   - Light & Dark: `TeamCommitteeAssignmentsView` milestone accordion toggle and panelist delete buttons satisfy $\ge 44 \times 44\text{px}$ touch targets.
   - Light & Dark: `GoogleScholarSidebar` and `PrototypeGallery` action buttons satisfy $\ge 44 \times 44\text{px}$ touch targets.

### 5.3 Invalidation Conditions
- Any occurrence of `PageSkeleton` completely replacing the `InstructorDashboard` component tree.
- Any remaining `border-l-4` classes in `ProjectCohortCard.jsx` or `DefenseSchedulingPage.jsx`.
- Any gradient heading text (`bg-gradient-to-r` or `text-transparent bg-clip-text`) remaining in `BukSULoginSidePanel.jsx`.
- Failure of `/committee` to redirect to `/committee-assignments` or `/scheduling` to `/scheduling-center`.
- Unit test execution exceeding 120 seconds or failing with unhandled QueryClient errors.
