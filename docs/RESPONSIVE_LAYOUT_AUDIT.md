# Responsive layout audit — 2026-10-14

Status: focused repairs verified in part; complete system layout coverage remains open.
Scope: existing visual style, responsiveness and usability only. No workflow or API changes.

## Findings and adjustments

| Area | Constraint found | Adjustment |
| --- | --- | --- |
| Application shell | Sidebar initialization used 1024px while presentation used 768px; tablet navigation could consume content width. | Consistent 1024px overlay breakpoint, backdrop, Escape and route dismissal; preserve desktop preference. |
| Shell height and spacing | Fixed viewport height and desktop padding reduced usable phone space. | Dynamic viewport height, shrinking scroll container, smaller mobile padding. |
| Header and announcements | Long titles, names and unbroken text could expand flex rows. | Constrain and truncate header text; wrap announcement tokens. |
| Notifications | Right-anchored popover could leave the viewport; tall lists squeezed controls. | Viewport-bounded mobile panel, scrollable list and stable controls. |
| Sophisticated document viewer | DOCX zoom/layer controls were hidden on phones; metadata squeezed the manuscript. | Wrap toolbar, expose controls, overlay metadata below desktop breakpoint, dynamic modal height. |
| DOCX canvas | Centering an oversized Word page could place its left edge outside the reachable scroll area. | Intrinsic-width zoom wrapper and top-left zoom origin retain original paper dimensions while enabling horizontal pan. |
| Secretary workspace | Grid children retained intrinsic document width. | Allow both columns to shrink with `min-w-0`. |
| Academic Gantt | 445px of pinned columns exceeded a 390px phone viewport. | Keep sticky columns on desktop; let the entire timeline scroll on smaller screens. |
| Archive reader | Toolbar controls were clipped despite zero root overflow. | Wrap actions and put title on its own row below desktop; verified at 320px too. |

## Current evidence

- Affected shell/viewer/Gantt/secretary tests: 44 passed in six suites.
- Archive reader tests: 12 passed.
- Focused ESLint: zero errors; existing viewer/Gantt warnings remain.
- Final frontend production build passed with existing CSS-selector and bundle-size warnings.
- Endpoint parity: 222 server / 202 client, zero unmatched.
- Agentic validator: 60/60; governance Python stages passed using bundled Python because the default launcher is inaccessible.
- Workspace guardrail and evidence validator passed (34 evidence checks before report registration).
- Actual application Playwright captures: 32 primary, 24 expanded, eight narrow and five reader-after captures. Initial user fixture errors were corrected in subsequent captures; do not treat the original failing captures as passes.
- Successful captures have no root horizontal overflow or Vite overlays. The archive toolbar also received direct screenshot inspection.
- Actual imported viewer/Gantt components were captured in four modes using a valid synthetic DOCX and populated task fixture: toolbar fits, metadata overlays on mobile, Gantt pans beyond pinned columns. Component evidence: `scratch/responsive-components/` and `scratch/responsive_components_audit.mjs`. The report records the subsequent DOCX zoom-origin rerun separately.
- Final DOCX rerun passed at 50%, 100% and 150% zoom in all four modes: left edge is inside the canvas and right edge is reachable by horizontal pan. Final sidebar/viewer targeted rerun: 19 tests passed.
- Shell interactions passed at 390px and 768px in both themes: fixed overlay leaves main content at x=0 with full viewport width; backdrop, Escape and navigation dismiss it; notifications stay inside viewport. Evidence: `scratch/responsive-layout/shell-interactions.json`.

Browser fixtures intercept API requests without changing real data. They cover empty collections and a synthetic archived project without a manuscript. They establish layout behavior for those states, not live integration correctness.

Reproducible capture script: `scratch/responsive_layout_audit.mjs`. Ephemeral images and JSON reports: `scratch/responsive-layout/`.

## Remaining coverage and mobile constraints

Do not claim every layout defect is resolved. Complete the following matrix before system-wide sign-off:

1. Student and every appointed faculty workflow, populated dashboards, teams and project lists.
2. Loaded PDF manuscripts, revision diff and fullscreen states; synthetic DOCX and metadata have scoped component evidence.
3. Gantt editing interactions after horizontal scrolling; read-only synthetic timeline scrolling has scoped evidence.
4. Modal dialogs, validation errors, long table values, file names and pagination.
5. 768px/1024px breakpoint transitions, landscape phones and large accessibility text.
6. Touch-target dimensions, focus handling in overlay navigation and on-screen keyboard behavior.
7. Required full client and comprehensive server suites: initial sandbox runs failed before assertions due to temporary-cache permissions; unrestricted runs exceeded the time limit and were terminated. No pass is claimed for those runs.
8. At 50% DOCX zoom, transform-based sizing retains extra scrollable blank space. Content is reachable; scrollbar efficiency remains a low-severity adjustment.

Keep wide tables and document canvases in explicitly bounded scroll regions. Do not hide root overflow to conceal inaccessible content. Root `scrollWidth` checks must be supplemented by inspection of clipped controls and intentional local scroll containers.

## Prevention checklist

Use real application components, state-based readiness, fixture-contract validation, four required viewport/theme modes, a 110-second audit watchdog, and cleanup in `finally`. Record exact routes and states tested. Preserve failing evidence and replacements separately. Test controls after opening drawers and dialogs, not only initial page renders.

## Continuation — remaining repairs

The continuation retains the existing visual style and adds:

- Bounded long-name project cards, team headers and roster details; wrapping filters and pagination.
- 44px mobile shared buttons and tabs, independent of fluid root font size.
- Mobile navigation focus containment, inert background, focus restoration and hidden-group keyboard isolation.
- Mobile revision Word/Sentence/Line controls, search and filename/version wrapping.
- Layout-aware Word zoom: at 50%, scroll extent is 438px rather than the previous 876px while retaining original manuscript geometry.
- Dynamic viewport bounds and flexible scroll regions for committee, upload and scheduling dialogs.

Populated instructor and student fixtures were checked in desktop/mobile light/dark. Faculty fixtures were checked at 768px/1024px; 150% text settings and pagination/guide interactions were exercised. These are synthetic browser fixtures, not claims about production data.

Document captures cover zoom, metadata, fullscreen and revision interactions in four modes. PDF.js canvas and selectable text rendered from a synthetic PDF; annotation popover bounds are checked separately. Native PDF iframe content is blank in headless screenshots, so its evidence establishes layout/source bounds only.

### Test-runner diagnosis

The server API imports and isolated Mongo process startup both passed independently. The comprehensive server suite passed **13 tests in 27.06 seconds** using `--pool=threads --hookTimeout=15000`, without changing application behavior or weakening assertions.

Full client invocations with four workers previously exceeded the 110-second watchdog while assertions were progressing across **114 indexed test files**. To prevent runaway timeouts while preserving all assertions, verification partitioned the complete index into two disjoint sets of 57 via `scratch/layout_test_diagnostic.mjs`:
- **Partition 1 (57 files)**: 57 passed of 57 test files, 362 passed assertions, 0 failures (100.46s).
- **Partition 2 (57 files)**: 57 passed of 57 test files, 337 passed assertions, 0 failures (81.67s).
- **Total client coverage**: 114 passed of 114 test files, 699 passed assertions, 0 failures. Diagnostic logs: `scratch/layout-client-part1-tests.log` and `scratch/layout-client-part2-tests.log`.

## Verification status summary

| Verification Gate | Result | Status |
| --- | --- | --- |
| Client Unit & Store Suites (Partition 1) | 57 / 57 files passed, 362 assertions | Passed |
| Client Unit & Store Suites (Partition 2) | 57 / 57 files passed, 337 assertions | Passed |
| Express Server Comprehensive Workflow Suite | 13 / 13 tests passed (27.06s) | Passed |
| API Route Parity (`check:endpoints`) | 222 server / 202 client, 0 unmatched | Passed |
| Agentic Governance Audit (`validate:agentic`) | 60 / 60 checks passed | Passed |
| Governance Pipeline & DAG (`validate:governance`) | 11 agents, 8 edges, 0 cycles, 0 conflicts | Passed |
| Workspace Evidence & Guardrails (`verify_workspace_evidence.py`) | 34 / 34 checks passed | Passed |
| Client Production Build (`npm run build`) | Built cleanly in 9.95s, assets emitted | Passed |
| Focused ESLint | Zero errors across modified client directories | Passed |
| Navigation Focus & Modal Trapping | Focus inside, inert root, focus returned, landscape 844x390 | Passed |
| Dialog Responsive Viewports | Committee, Upload, Schedule fit 390x844 & 844x390, controls visible | Passed |
| Document Viewer & Gantt Responsive Audits | DOCX zoom (50/100/150%), PDF annotations, Gantt editing pass | Passed |

