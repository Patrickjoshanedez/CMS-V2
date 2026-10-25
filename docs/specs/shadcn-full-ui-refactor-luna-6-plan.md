# Full CMS-V2 UI refactor — Luna 6 implementation plan

Date: 2026-10-21 (Asia/Manila)  
Status: implementation in progress; planning is complete and staged migration evidence is recorded in the migration inventory.  
Owner: Luna 6 implementation agent.  
Authority: supporting implementation guidance, subordinate to AGENTS.md, institutional requirements, and API contracts.

## 1. Outcome and scope

Replace the entire CMS-V2 application interface with one coherent shadcn/ui design system. This includes the public landing page, login and registration, all authenticated screens and role dashboards, navigation, forms, tables, filters, dialogs, document toolbars, notifications, error states, skeletons, spinners, loading screens, route loading bars, and asynchronous job progress.

This is a complete presentation refactor. A screen is not migrated because it imports a shadcn Button while retaining its old visual system. Its complete component tree, responsive layout, interaction states, overlays, and loading/error/empty variants must satisfy this plan. No final mixture of legacy styles and new styles.

shadcn supplies component source and composition patterns; layout still uses semantic HTML, Tailwind utilities, and shared tokens. Do not attempt to replace every div with a Card. Custom domain visualizations must use the same tokens and shadcn controls. Document contents, manuscript typography, official forms, and chart geometry retain the fidelity required by their purpose, while all surrounding application UI is migrated. These are explicitly audited surfaces, not untracked exceptions.

The user authorized implementation on 2026-10-21. This plan is now the active implementation contract; staged work is in progress.

## 2. Verified repository baseline and implications

Inspected package manifests, App.jsx, UI primitive implementations, index.css, Tailwind configuration, dashboard dispatch, component/page inventories, and repository governance on 2026-10-21. This is source inspection, not a completed visual audit or runtime certification.

| Observed baseline | Implementation consequence |
| --- | --- |
| React 18.3.1, Tailwind 3.4.17, Vite 8.0.8, JavaScript/JSX | Keep React 18, Tailwind 3, and JSX as the default migration baseline. Verify every generated dependency and component against it. |
| No client/components.json found | Configure shadcn deliberately; do not treat this as an initialized registry project. |
| Existing PascalCase components under client/src/components/ui | Preserve import contracts during migration and choose one final path convention. |
| Button says “shadcn/ui-compatible” but contains custom loading, preload, and child behavior | Audit source and callers; compatibility labels do not establish official primitive behavior. |
| Select and Tabs implement their own React contexts | Replace internals with the selected official shadcn primitive family and verify keyboard behavior and controlled state. |
| Skeleton uses a custom glass/shimmer class | Replace every skeleton family and all direct shimmer/spinner implementations, not only Skeleton.jsx. |
| App.jsx mounts Sonner directly and coordinates Suspense with topProgress | Migrate styling and composition without losing lifecycle coordination or multiplying providers. |
| CSS already has semantic HSL tokens plus competing brand/archive/text tokens | Consolidate into one documented theme; avoid adding a second token vocabulary. |
| React Query, Zustand, React Hook Form, Zod, Lucide, Sonner, Recharts already exist | Reuse these integrations; avoid redundant state, form, icon, chart, and toast systems. |
| DashboardPage.jsx contains StudentDashboard; faculty/instructor dashboards are separate components | Inventory nested role renderers as well as route files. |
| Numerous existing uncommitted changes in UI, workflow, memory, and backend files | Record the starting diff; never reset, stash, overwrite, or revert unrelated work. Re-inspect each file immediately before editing. |

Official compatibility guidance says existing React 18/Tailwind 3 apps can continue using compatible components. The implementation must still verify the actual CLI/registry output and peer dependencies: current documentation may show a different primitive family or framework generation. See [Tailwind compatibility guidance](https://ui.shadcn.com/docs/tailwind-v4), [Vite installation](https://ui.shadcn.com/docs/installation/vite), and [JavaScript setup](https://ui.shadcn.com/docs/javascript).

## 3. Mandatory architectural decisions

1. **One component family.** Prefer the official Radix-based shadcn family compatible with the existing stack. Confirm availability before adding components. Do not mix Radix and Base UI examples accidentally. Record exact CLI version, component source revision, peer dependencies, and family in the migration ledger. If compatibility cannot be established, resolve the foundation decision before changing screens; do not silently upgrade React or Tailwind.
2. **One theme.** Use CSS variables for background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, radius, chart, sidebar, and semantic status colors. Keep BukSU identity through primary/brand tokens and existing logos. The approved interface tone is clear, professional, and reassuring. New surface styling should follow restrained shadcn defaults: clear borders, modest radius, legible typography, limited shadows, consistent spacing. Eliminate page-specific glass effects, arbitrary gradients, and competing palettes.
3. **One canonical primitive location.** Keep client/src/components/ui as the final home. Prefer the existing PascalCase filenames for replacements to minimize import churn. For newly generated lowercase files, move/merge intentionally and update imports; never maintain two live Button, Select, or Dialog implementations. Check casing on Linux as well as Windows.
4. **One shared composition layer.** Use client/src/components/common for repeated page headers, form fields, loading patterns, responsive data lists, and domain status compositions only where multiple callers justify them. Keep business hooks and permission checks in their existing layers.
5. **Keep React 18 ref semantics.** Components consumed through refs must retain forwardRef where required. Do not paste React 19-only ref APIs into the client.
6. **Preserve routing and data contracts.** Retain route aliases, deep links, query parameters, browser back behavior, tab URL synchronization, React Query keys, Socket.IO invalidation, auth persistence, and action payloads.
7. **No bulk destructive generation.** Inspect generated source in an isolated approved scratch directory first. Never run an overwrite-all CLI against the populated ui directory. Patch existing source surgically and preserve comments/JSDoc.
8. **Respect configuration boundaries.** The migration will need client/components.json, package manifests/lockfile, and possibly alias/Tailwind configuration outside client/src. Treat these as an explicit, narrow setup work package under the user's implementation authorization and applicable sandbox rules. Do not expand the repository whitelist generally. If a concrete write is denied, prepare the exact change and report the specific blocker.

## 4. Institutional behavior that must survive

- Phase 0–4 remains workflowPhase; legacy capstonePhase remains course number 1–3. Do not recalculate progression from the new visual stepper.
- Student registration retains Student ID, institutional verification, academic year/term, section, and assigned instructor requirements. Teams stay 1–4 members with roster locking and one active project per term.
- Proposals remain 1–10, including discipline, problem statement, objectives, technology stack, SDGs, similarity warning, feedback, and revision history.
- User-management primary roles remain Student, Instructor, Faculty. Committee appointments remain faculty capabilities; instructors cannot be appointed.
- Committee composition remains exactly one adviser, one secretary, and three distinct panelists. Keep conflict checks and clear required labels.
- Sequential chapter approvals, plagiarism clearance, endorsements, scheduling, evaluation, grade release, semester boundaries, and archive prerequisites remain enforced by official APIs.
- In Phase 4, Secretary endorsement remains a prerequisite for all downstream ADM signature tiers. Keep its banner above Tier 1; locked controls explain the missing prerequisite. Never fabricate approval, sign records, or invoke final signature operations as a visual test.
- Real-time updates, OCR queued/processing/completed/degraded/error states, and notification delivery must remain visible and correct.
- Preserve existing truthful plagiarism qualification copy. Do not change estimated non-matching text into an unsupported authorship or clearance claim.
- Sanitize display prefixes so a stored “Team Gamma” never renders as “Team Team Gamma.”

## 5. Component replacement map

Install only components used by a scheduled work package. Confirm names and APIs against the pinned family; the [official component catalog](https://ui.shadcn.com/docs/components) is the starting reference.

| Existing pattern/surface | Target composition | Required behavior |
| --- | --- | --- |
| Button, icon action, link-styled action | Button and its variants; Slot/asChild where supported | Loading label, disabled state, ref, form type, accessible name, route preloading preserved |
| Input, FloatingInput, Textarea, YearInput | Input/Textarea + Label + common field composition | Visible labels, descriptions, invalid state, password reveal, autofill, error association; no floating-label overlap |
| Form groups | Compatible shadcn Form/Field pattern + existing RHF/Zod | Preserve validation timing, submit payload, dirty state, server errors, and focus on invalid field |
| Select, FacultySearchCombobox, DisciplineCombobox, tags | Select; Command/Popover combobox; Badge + Input for tags | Search/loading/empty, clear selection, keyboard selection, duplicate rules, required values |
| Custom toggles and choice pills | Checkbox, Switch, RadioGroup, ToggleGroup as semantically appropriate | Correct form values and labels; a checkbox must not silently become a switch |
| Cards and summary widgets | Card family; Separator and semantic sections | Use cards to group content, not to wrap every nested element |
| Title/submission/project/originality badges | Badge variants + domain status mapping | Preserve label meaning; icons/text supplement color |
| Custom tabs and workflow triggers | Tabs + domain lock composition | Controlled selection, URL sync, keyboard controls, unsaved-content/mounting behavior |
| Expandable phase areas | Accordion/Collapsible | Required progress and locked prerequisites remain visible |
| Custom modal/drawer/popover | Dialog, AlertDialog, Sheet, Popover, Tooltip, DropdownMenu | Title/description, focus trap/return, Escape, scroll lock, portal stacking, nested overlay behavior |
| Sidebar/header/mobile menu | Sidebar + Sheet + Breadcrumb + Avatar + DropdownMenu | Existing role filtering, active paths, collapsed state, notification count, mobile closure after navigation |
| Tables, hierarchy lists, action menus | Table + Pagination + DropdownMenu; optional TanStack Table only if needed | Preserve server sorting/filtering/paging; keep row identities, loading, empty, selection, bulk actions |
| Dates and schedules | Calendar + Popover date picker + time fields | Existing locale/timezone and defense-conflict rules; no accidental UTC date shift |
| Reports and dashboards | Chart composition around existing Recharts | Preserve chart data, scales, legends, tooltips, exports, and accessible text summaries |
| Toasts and banners | One compatible themed Sonner integration + Alert | Retain toast IDs, actions, mutation results and inline errors; one global provider |
| Skeletons, loaders, page loading, job progress | Skeleton, compatible Spinner, Progress + shared compositions | Full state policy in section 6; no legacy shimmer or loader hidden inside a domain component |
| Signature, upload, PDF/editor, Gantt, slide tools | Specialist engine + shadcn controls + shared tokens | Preserve pointer/keyboard behavior, fidelity, export and processing semantics |
| Error/forbidden/empty states | Alert/Card/Empty composition + Button | Recoverable action, clear reason, no false loading or false success |

The final API of wrappers should be small. Temporary adapters may accept legacy props while callers migrate, but every adapter has an owner and removal batch. Do not rename an old component “shadcn” without replacing its behavior and design.

## 6. Loading and feedback specification — mandatory across the app

Inventory all loading owners before editing: App Suspense, auth hydration, route transitions, query initial loading, background fetches, mutation buttons, upload transport, OCR, plagiarism scans, document rendering, image/media loading, charts, and export generation.

| Situation | Visual treatment | State/accessibility rules |
| --- | --- | --- |
| Initial app/auth hydration | Minimal themed LoadingScreen | Accessible status text; prevent unauthorized-content flash; no fake percentage |
| Lazy route code | PageSkeleton matching destination family + route bar | Preserve App SuspenseProgressBridge; no second shell or double page padding |
| Initial query without data | Skeleton matching real page geometry | Mark containing region busy; skeleton shapes hidden from assistive tech; one loading announcement |
| Background refetch with cached data | Keep data visible; small local indicator | Do not replace the page with skeletons or steal focus; preserve scroll/selection |
| Form mutation | Button spinner + action-specific label | Prevent duplicate submit, preserve button width and entered data; error returns control |
| Upload with measured bytes | Labeled determinate Progress | Percent reflects transport only; uploading 100% does not imply OCR or plagiarism completion |
| OCR/scan without numeric progress | Indeterminate Progress or Spinner + real stage text | Queued, processing, retrying, degraded, failed and complete remain distinct |
| Document render | Reader-shaped Skeleton and render status | Render error/retry, preserve active document/version identity |
| Dashboard/table/chart load | Context-shaped rows/cards/chart skeleton | Match desktop/mobile layout, not generic unrelated placeholders |
| Empty result | Empty composition | Never show an eternal Skeleton when a successful response contains zero records |
| Failure, timeout, offline | Alert + safe retry action | Resolve busy state; retain recoverable data and reason; no automatic duplicate mutation |

Refactor client/src/components/ui/Skeleton.jsx, PageSkeleton.jsx, LoadingScreen.jsx, TopProgressBar.jsx, Progress.jsx; inspect client/src/lib/topProgress.js, hooks/useNavigationSkeleton.js, and all callers. Preserve the controller contract initially and replace its presentation. Any controller correction must have separate lifecycle assertions.

The route bar must cover link navigation, programmatic navigation, history navigation, lazy imports, aborted/failed navigation, same-route clicks, rapid successive routes, external/download links, and unmount cleanup. Ignore unrelated notification polls and WebSockets. Model idle → pending → settled/failed → idle; navigation generations must prevent an old completion hiding a newer pending route. Only claim semantic completion when the relevant navigation settles. A safety timer may clear a stuck visual but cannot announce operation success. Do not present trickled progress as a measured percentage. Use an accessible indeterminate presentation when the total is unknown; verify the selected Progress API rather than assuming it supports null values. See [official Progress documentation](https://ui.shadcn.com/docs/components/progress).

Use a consistent short appearance delay where needed to avoid flicker (initial proposal: 150 ms), and test fast/slow operations. Honor reduced motion by removing shimmer/trickle animation while retaining clear status. Avoid blanket artificial waits and unnecessary minimum durations that slow the app. Prevent layout shift with stable skeleton dimensions; measure key entry screens with a target CLS below 0.1 under a repeatable capture setup.

## 7. Complete screen and component inventory

Luna must generate the final machine-readable inventory from current source before implementation. The following seed inventory covers inspected entry points; it is not a license to ignore newly discovered descendants. Walk imports, conditional role branches, tabs, portal contents, and responsive-only branches. Include development preview surfaces and all route aliases from App.jsx.

| Work area | Existing entry files | Descendants/states to include |
| --- | --- | --- |
| Public/errors | pages/LandingPage.jsx, ForbiddenPage.jsx, NotFoundPage.jsx | Public navigation/footer, CTA, mobile menu, 403/404 recovery and route error boundary |
| Authentication | pages/auth/LoginPage.jsx, RegisterPage.jsx, VerifyOtpPage.jsx, ForgotPasswordPage.jsx, ResetPasswordPage.jsx | layouts/AuthLayout; auth/BukSULoginSidePanel, AuthStatusAlert, AuthSubmitButton; all registration steps; OAuth, CAPTCHA, OTP paste/resend/countdown, expired links and invalid credentials |
| Global shell | components/layouts/DashboardLayout.jsx, Sidebar.jsx, Header.jsx, AnnouncementBanner.jsx, NotificationBellPopover.jsx | ThemeToggle, TextScaleDropdown, keyboard navigation, notification badge/popover, account dropdown, desktop collapse/mobile Sheet |
| Dashboards | pages/dashboard/DashboardPage.jsx; components/dashboards/InstructorDashboard.jsx, FacultyDashboard.jsx | Inline StudentDashboard; KPICards, calendar, workload, adviser analytics, topic cards, heatmap, optimization widgets; every assigned faculty capability |
| Teams | pages/teams/TeamsPage.jsx and components under pages/teams/components | Student/faculty views, roster, creation, invitations, pending membership, locked roster, no-team states; components/teams committee, roster inspection, bulk invite, template config, faculty combobox and manuscript widgets |
| Users/academic hierarchy | pages/users/UsersPage.jsx; components/users/CreateAcademicNodeDialog.jsx, TeamCommitteeAssignmentsView.jsx | Year/program/section/T-code/team/student drilldown, unassigned students, role filters, bulk actions, creation/editing and denied states |
| Project entry/list | pages/projects/CreateProjectPage.jsx, TitleApprovalPage.jsx, MyProjectPage.jsx, ProjectsPage.jsx, ProjectDetailPage.jsx | Every proposal/title card, revision request, feedback, SDG/discipline/alignment chooser, similarity modal, details modal, rejection, committee/context/sidebar and audit panels |
| Course workflows | components/projects/Capstone1CollapsibleSections.jsx, Capstone2CollapsibleSections.jsx, Capstone3CollapsibleSections.jsx | WorkflowPhaseTracker, CapstoneWorkflowStepper, locked tabs, chapter prerequisites, modification review, consultation, deadlines and reports |
| Development/prototype | components/projects/WeeklyProgressCheckIns.jsx, AcademicExcelGanttChart.jsx, InteractiveGanttChart.jsx, PrototypeShowcaseAndDemo.jsx, PrototypeGalleryModal.jsx | Schedule approval, overdue justification, GitHub/media/demo links, drag/resize if present, gallery and clearance |
| Submissions | pages/submissions/ProjectSubmissionsPage.jsx, ChapterUploadPage.jsx, ProposalCompilationPage.jsx, SubmissionDetailPage.jsx, SubmissionReviewPage.jsx, PlagiarismReportPage.jsx | components/submissions upload/compile modals, ChapterCard, ChapterReviewPanel, history, VersionCompare, evaluation workspace, report, annotation/highlight and final paper upload |
| Document services | pages/documents/TemplateManagementPage.jsx, DocumentEditorPage.jsx; pages/adviser/TeamReviewWorkflowPage.jsx | Template availability, editor/save status, revision selection, download, errors and all document reader hosts |
| Defense/committee | pages/instructor/DefenseSchedulingPage.jsx, CommitteeAssignmentsPage.jsx | DefenseScheduleCalendar, CalendarScheduler, ScheduleDefenseModal, MilestoneDeadlinesModal, schedule badges, conflict/error states and committee selection |
| Secretary/ADM | pages/projects/SecretaryReviewPage.jsx; components/projects/ActionDoneMatrixTab.jsx, ActionDoneMatrixSection.jsx | ADMTableView, ADMRemarkRow, secretary minutes sheet, LiveDefenseMinutesModal, evaluation and signature locks, required tier order, read-only/authorized actions |
| Archive/search | pages/archive/ArchiveSearchPage.jsx, ArchiveDocumentViewerPage.jsx | ArchiveSearchBar, GoogleScholarSearchBar/Sidebar, OriginalityShieldBadge, CitationExportModal, preview, results, advanced filters, source links and pagination |
| Archive ingestion | pages/archive/ExistingCapstoneUploadPage.jsx, AcademicPaperArchiveUploadPage.jsx, AcademicJournalArchiveUploadPage.jsx | Batch/single uploads, file validation, extraction progress, metadata correction, OCR degraded fallback, review and submission |
| Standalone plagiarism | pages/plagiarism/ArchivePlagiarismCheckerPage.jsx; components/plagiarism | DropZone, ScanHero, ScanButton, ScoreBar, MatchSnippet, PlagiarismReportPage, global PlagiarismProgressModal; queued/completed/failed/degraded states |
| Reports/admin | pages/reports/ReportsPage.jsx; pages/admin/AuditLogPage.jsx, EvaluationTemplateBuilderPage.jsx | ReportsFilterDrawer, DynamicChartWidget, CohortKPIRibbon, export, pagination, template rows, validation and audit filters |
| Personal/settings | pages/profile/ProfilePage.jsx, pages/settings/SettingsPage.jsx, pages/notifications/NotificationsPage.jsx | All components/settings sections: appearance/text scale/theme, security/password, notifications, administration, about, digital signature; profile/avatar/upload, mark-read and empty inbox |
| Certificates/presentations/dev | pages/projects/CertificatePage.jsx; components/projects/ProposalSlideCanvas.jsx, ProposalRehearsalModal.jsx, presentation/FullscreenToolbar.jsx; pages/dev/PdfWorkspaceTestPage.jsx | Certificate/download/print controls; 16:9 slides, fullscreen, keyboard navigation guarded during text input; dev reader uses canonical viewer |

For every inventory row store: ID, source file, routes/aliases, role/appointment, phase, scenario/state, old pattern, target primitive/composition, dependencies, status, screenshot references, tests, blockers, and any specialist rendering rationale. Use docs/specs/shadcn-ui-migration-inventory.json as the durable source-file census. It was initialized at implementation start; reconcile route aliases, imports, role/state branches, and evidence as files migrate. Keep it registered in the authority index and classification manifest.

## 8. Canonical document reader and specialist surfaces

SophisticatedDocumentViewer.jsx remains the universal reader. Trace all uses of CanonicalDocumentViewer, PdfViewerWorkspace, GoogleDocViewer, AnnotationViewer, RevisionDiffViewer, VersionCompare, and archive/submission preview paths. Classify each as a reader host, internal engine, or editor. Route reader presentations through the canonical viewer; do not indiscriminately delete internal PDF/annotation engines needed by it.

Migrate its identity bar, version/file/originality badges, revision mode controls, zoom, details Sheet, download Button, fullscreen controls, embedded wrapper, Dialog presentation, loading, and errors to the shared design system. Preserve chapter title, filename, file size, version, originality qualification, previous/current version identity, word/sentence/line diff, search, deletion/comment markers, addition/removal counters, high-fidelity docx-preview rendering, PDF streaming, annotations, and authenticated downloads. Test both embedded and modal presentations in every viewport/theme.

Do not let generic global typography, overflow, transforms, or dark-mode CSS alter OOXML/PDF content, page dimensions, selection, highlight coordinates or print layout. Native PDF/third-party editor surfaces may retain engine-owned rendering; explicitly document and verify the boundary while migrating their application chrome. Official manuscript and minutes sheets remain readable paper layouts; use print-specific rules to hide interactive chrome without changing institutional content.

Re-theme signature canvas controls and preserve pointer/touch coordinate scaling and saved-signature behavior. Verify with inert fixtures; final institutional signatures require authorized human action. Gantt/heatmap/chart/presentation internals use shared chart/status tokens, accessible labels, and shadcn controls. Slides remain 16:9 with navigation outside the canvas and no keyboard interception while typing.

## 9. Ordered implementation work packages

Execute sequentially in bounded sessions. Each package must leave the application runnable. Shared primitive changes have broad impact: run consumer tests before calling the package complete. Do not depend on a later phase to repair a broken intermediate state.

### P0 — Discovery, evidence, and baseline

- Read AGENTS.md, preflight protocol, latest sessions, technical memory, frontend/design, capstone, verification, and evidence skills. Verify active startup snapshot; use its documented scratch fallback only if the canonical path is locked.
- Record branch, HEAD, starting modified/untracked files and relevant existing diffs. Reuse the current checkout unless isolation is needed; preserve existing work. Never auto-commit the entire dirty tree.
- Build the complete route/component/state inventory described above. Find raw controls, custom portals, CSS modules/global classes, inline styles, hardcoded colors, animation utilities, browser alert/confirm calls and direct toast mounts through bounded searches/AST inspection.
- Measure baseline client build, existing lint configuration, relevant tests, route behavior, network errors, bundle chunks and representative render timings. Record pre-existing failures separately; do not represent them as passing.
- Capture representative existing screens with real authorized test roles or API-created disposable fixtures: authentication, student/instructor/faculty dashboards, complex form, table, document viewer, ADM and loader.
- Exit: inventory IDs cover all routes and descendants; exact foundation versions/family and baseline evidence are recorded. No implementation claim based on screenshots alone.

### P1 — shadcn foundation and theme

- Configure JSX/non-RSC shadcn setup, verified aliases, existing cn utility, CSS variables and pinned compatible dependencies. Validate Radix composition/ref APIs and Tailwind 3 syntax with a small pilot before generating more components.
- Reconcile index.css and tailwind.config.js; introduce sidebar/chart tokens, shared typography and spacing. Preserve text-scale preference and pre-paint theme synchronization. Keep theme values centralized; components consume semantic tokens.
- Initially port Button, Input, Textarea, Label, Card, Badge, Alert and Separator. Add required accessible interaction primitives next. Preserve caller API through narrowly scoped adapters and a removal ledger.
- Build a development-only component showcase under an approved source location: variants, states, keyboard examples, long content, dark mode and reduced motion. No new public production route.
- Synchronize installed client dependencies inside cms-client and restart it as required by AGENTS.md; do not modify deployment scripts. Inspect generated dependency changes and Vite error overlays.
- Exit: pilot production build and component/consumer tests pass; theme, ref forwarding, child composition and focus styles verified in four visual conditions. No duplicate primitive files.

### P2 — Feedback, loading, and errors

- Implement section 6 centrally; migrate top bar, startup screen, route/page skeletons, mutation loading, toasts and domain jobs.
- Preserve existing topProgress subscriptions/timer cleanup and Suspense coordination. Centralize the compatible themed Sonner provider; preserve existing toast callers/actions.
- Migrate RouteErrorBoundary and shared empty/error/status components, including reset/retry behavior and auth/session expiry presentation.
- Exit: targeted loading tests cover overlapping navigation, fast/slow/failing requests, cached refetch, reduced motion and cleanup; capture route bar and skeletons visibly in each required condition.

### P3 — Global shell and navigation

- Migrate DashboardLayout, Sidebar, Header, mobile Sheet, breadcrumbs, announcement, account menu, notification popover, theme/text-scale controls and shared page headers.
- Preserve active aliases, role filtering, collapsed preference, logout, unread counts, content scroll regions and deep links. Add a visible skip link and consistent main landmark.
- Exit: all roles can navigate by keyboard and touch; mobile menu closes correctly, focus returns, no hidden content under fixed headers, no duplicate shell or global horizontal overflow.

### P4 — Public/authentication flows

- Migrate landing/error pages, AuthLayout and all five auth pages with the final theme and form patterns. Replace FloatingInput consumers with explicit accessible field composition after auditing their props.
- Preserve all registration stages/academic fields, password requirements, OTP semantics, OAuth/CAPTCHA, resend rate limits, recovery redirects and server validation. Do not inspect or alter secret files.
- Exit: full login/register/verify/recover/reset success and failure cases; mobile keyboard and autofill/reveal alignment; public header/footer and loading variants captured.

### P5 — Dashboards and shared analytics

- Migrate inline StudentDashboard and faculty/instructor dashboards, every subordinate widget, calendar and dashboard Skeleton. Use task priority, upcoming deadlines and progress as hierarchy; preserve underlying queries/calculations.
- Verify faculty appointments expose only authorized actions; distinguish empty assignment, no team, no project and genuinely loading states. Replace invented chart colors with chart tokens.
- Exit: every dashboard role and key workflow phase has inventory evidence, stable loading geometry, correct empty/error/refetch behavior, responsive charts and accessible summaries.

### P6 — Teams, users, profile, settings, notifications

- Migrate all roster/invite/committee and academic hierarchy compositions, dialogs, searchable selectors, profile forms, settings sections, personal signature controls and notification actions.
- Enforce existing 1–4 roster and committee rules with unchanged API guards. Preserve section/T-code presentation, students without teams, semester history, text scaling and real-time updates.
- Exit: targeted team/user/profile/settings tests pass; committee conflict/denied states and all mobile overlays verified; no loss of form data during a popover or theme change.

### P7 — Proposals, project pages, and course workspaces

- Migrate project lists/details, creation, title approval/revision, proposal cards, phase tabs, history, contextual panels, SDG/discipline/alignment controls and every modal.
- Migrate Capstone 1/2/3 panels, Gantt, check-ins, consultation, prototype/gallery/demo and slide/rehearsal chrome. Keep existing draft header behavior such as “{teamName} Title Proposal.”
- Audit controlled tab synchronization and content mounting: a new Tabs component must not reset upload drafts, remove an editor unexpectedly or bypass locked phases.
- Exit: all phase and title-status scenarios represented; back-navigation/deep-link/tab-sync tests, revision warnings, schedule approval and overdue evidence behavior preserved.

### P8 — Submissions, documents, plagiarism, archive

- Migrate the canonical reader first, then migrate every host and internal toolbar. Include upload, compile, sequential chapter review, version history/diff, editor/template management, evaluation and plagiarism report screens.
- Migrate archive search/citations, all three ingestion flows, standalone checker and job progress, including real OCR degraded fallback and connection/error states. Keep authenticated file streams/downloads and large-file behavior.
- Exit: canonical-reader feature checklist passes in both presentations; DOCX/PDF fixtures, diff modes, annotations, upload→processing→review states and search filters verified. No ad-hoc reader introduced.

### P9 — Scheduling, secretary, ADM, reporting, certification

- Migrate scheduling center and all aliases, committee assignment center, minutes, secretary review, ADM table/signature tiers, evaluation template builder, audit log, reports/exports and certificate chrome.
- Keep forms and printable institutional documents faithful; isolate controls from printable content. Keep Secretary prerequisite banner before Tier 1 and display disabled reasons accessibly.
- Exit: scheduling conflicts and permission denials tested; Phase 4 downstream signatures remain locked without endorsement; print/export checks and report/chart/table states pass using authorized test fixtures.

### P10 — Eliminate legacy styling and complete coverage

- Reconcile inventory against routes/import graph again. Audit every descendant, portal, responsive branch, error/loading state and development preview. Add newly discovered surfaces to their work package rather than marking them excluded.
- Remove transitional adapters, duplicate primitives, old custom control implementations, obsolete glass/shimmer/gradient classes, unused tokens/CSS, dead imports and unused dependencies only after caller evidence proves safety.
- Use AST-aware checks to identify raw interactive controls outside canonical primitives. Investigate findings: a file input, canvas, media element or semantic table may be legitimate; all exceptions need a narrow owner/path/rationale and shared theme compliance.
- Search for hardcoded functional colors, literal dark palette overrides, custom z-index/focus implementations, alert/confirm calls and standalone spinners. Replace each or register an explicit specialist rendering boundary.
- Exit: 100% inventory status verified; zero unexplained legacy UI implementations or parallel palettes; no compatibility adapters left.

### P11 — Final verification and handoff

- Run section 11 gates from the final source state. Inspect screenshots rather than merely generating them. Capture visual regressions and fix them before claiming completion.
- Produce final inventory summary, changed-file list, component/token documentation, test and capture evidence, measured before/after bundle/performance results and truthful unresolved blockers.
- Update document authority/classification, evidence inventory and dual-persistence records. If any required check fails or cannot run, mark implementation incomplete with the exact reason.

Dependency order: P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9 → P10 → P11. Revisit shared primitive consumers whenever P6–P9 expose a foundation issue. A later work package does not erase earlier verified evidence; invalidate and rerun evidence only where a shared dependency changed.

## 10. Luna 6 execution and recovery contract

- Work on one bounded slice at a time: one primitive family or one route family with its descendants. Read exact implementation and caller ranges before a surgical patch. Avoid wholesale JSX file regeneration and automated search/replace across the entire client.
- For each slice: inspect → state intended behavior → patch → targeted tests/lint/build as applicable → visual feedback → inspect → fix → update inventory/checkpoint. Tests must assert useful behavior, especially institutional locks and interaction lifecycle; avoid tests that only mirror classes.
- Use docs/specs/shadcn-ui-migration-inventory.json for durable coverage and .agents/ptss/tasks/shadcn-full-ui-refactor.json for execution state. The latter carries active_scenario_id, completed_subgoals, remaining_subgoals, last_action_result, progress_delta and loop_count. Initialize a separate record from other active agents' tasks.
- Use composite stages for foundation, shell, route families and final cleanup; preserve completed state when resuming. The route dependency graph above determines eligibility. Independent scenario records can be tracked without requiring subagents or concurrent file editing.
- If remaining subgoals do not shrink for two consecutive iterations, stop the retry loop and diagnose. After repeated test failure, inspect root cause before another edit. Do not repeatedly reinstall packages, regenerate primitives or loosen tests.
- Respect the repository's five-minute execution-session and 120-second command limits. Persist a truthful checkpoint between sessions. A long migration is multiple bounded resumable sessions; a single oversized agent loop is not the execution plan.
- Never launch an unbounded full-client suite during iteration. Full suites belong to final closure; if runtime exceeds the hard limit, terminate and diagnose. Deterministic documented partitions may supplement evidence, but do not falsely claim the mandatory original gate passed.
- Preserve user work. Roll back only the current slice's exact changes after checking the baseline diff; never hard reset or restore an entire pre-modified file. Shared theme edits require especially broad consumer verification.
- Do not seed production data, mutate MongoDB/Redis/Chroma directly, edit .env files, alter deployment automation or apply final ADM signatures. Use official APIs and disposable authorized fixtures for test state. Stop only the specific action that genuinely requires authorization.

## 11. Verification matrix and quality gates

### Per-slice functional checks

Run relevant existing tests first, then add missing high-value behavior coverage. Starting examples from the current tree:

```text
npm test --workspace=client -- src/components/ui/Button.test.jsx
npm test --workspace=client -- src/components/ui/Skeleton.test.jsx
npm test --workspace=client -- src/components/ui/LoadingScreen.test.jsx
npm test --workspace=client -- src/components/ui/TopProgressBar.test.jsx
npm test --workspace=client -- src/App.routes.test.jsx src/App.error-routes.test.jsx src/App.session-timeout.test.jsx
npm test --workspace=client -- src/components/layouts/
npm test --workspace=client -- src/pages/auth/registerSchema.test.js
npm test --workspace=client -- src/pages/dashboard/
npm test --workspace=client -- src/pages/teams/ src/components/teams/
npm test --workspace=client -- src/pages/projects/ src/components/projects/
npm test --workspace=client -- src/pages/submissions/ src/components/documents/
```

Select individual files or subdivide large directories to keep iterations bounded. Verify current test paths before running. Add targeted suites for new Radix-backed Select/Tabs/Dialog behavior, route loading lifecycle and canonical viewer regressions where coverage is missing. Keep exact existing institutional assertions; do not weaken them to accommodate the redesign.

Run the repository's configured ESLint on changed JS/JSX and compile with `npm run build --workspace=client`; run the full lint gate at closure and report any pre-existing failures. There is no client TypeScript compiler script in the inspected manifest; do not claim a nonexistent typecheck ran.

### Mandatory rendered inspection

For every migrated screen and state-bearing shared component, capture and inspect:

| Theme | Desktop | Mobile |
| --- | --- | --- |
| Light | 1440×900 | 390×844 |
| Dark | 1440×900 | 390×844 |

Use screenshots and a machine-readable run manifest keyed to inventory IDs. Reuse one capture for the same shared component state only when it demonstrably covers the same rendering; role, locked/authorized and phase-specific branches need their own evidence. Test default, hover/focus, disabled, loading, empty, error, long content, open overlay, invalid form and success states where applicable. Force slow/failed test responses locally through browser interception or fixtures; do not alter live production data.

Inspect viewport overflow, clipped labels, keyboard focus, tab order, heading/landmark hierarchy, modal focus trap/return, Escape, scroll lock, overlap, z-index, form errors, tooltips on touch, 200% zoom/text scale, color contrast, reduced motion and system-theme persistence. Aim for WCAG 2.2 AA: normal text ≥4.5:1, large text ≥3:1, visible focus and adequate non-text contrast; use comfortable 44px touch targets where practical. Automated accessibility checks supplement keyboard/manual review.

Capture real loading states, not just completed screens. Compare desktop/mobile skeleton geometry to the resulting content. Verify app/theme boot without a flash of an incorrect palette. Test long project titles, long Filipino/English names, empty lists, large tables and absent avatar/media.

Put visual scripts and captures under scratch/. Every automation script has a 110-second hard watchdog, closes its browser in finally and exits after cleanup. Break coverage into resumable shards. Use domcontentloaded and state-based locators; never networkidle because notifications/WebSockets keep traffic active. Check for Vite overlays, page errors and failed assets before screenshotting. Match dynamic proposal headers or semantic locators, not an assumed stored title.

### Final repository gates

Run from the final source state and record exact commands, durations, exits, source revision/working-tree fingerprint and artifact paths:

```text
npm run check:endpoints
npm run validate:agentic
npm run validate:governance
npm test --workspace=client
npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js
python scripts/workspace_guardrail.py
node scratch/shadcn_ui_audit.mjs
npm run check:evidence
npm run lint
npm run build --workspace=client
```

The visual audit command is the proposed implementation artifact; create its bounded orchestrator/shards during implementation. Do not report it as existing or executed by this plan. Treat stale hardcoded endpoint/test counts as historical; require current zero errors/unmatched routes. A UI-only refactor still runs the required server workflow gate to guard institutional behavior.

Baseline failures remain blockers to a fully clean sign-off unless resolved within scope or explicitly dispositioned by the user; report baseline and new failures separately. Never suppress errors, fabricate screenshots, silently skip tests or claim production readiness from unit tests alone.

## 12. Acceptance criteria and deliverables

Implementation is complete only when all conditions hold:

1. Every route, alias, role/appointment branch, tab, dialog, nested component and state in the reconciled inventory is verified; remaining/unreviewed count is zero.
2. Every applicable control uses the canonical shadcn primitive/composition. Every specialist rendering surface has shared themed chrome and a documented verified boundary. No legacy UI island remains.
3. Login through dashboards through archival/certification share the same theme, typography, spacing, status semantics, responsive behavior and overlay conventions.
4. Skeletons, route bar, startup loading, async jobs, mutation buttons, errors, empty states and cached refetches satisfy section 6 throughout the system.
5. All document readers follow SophisticatedDocumentViewer and retain every required rendering/diff/identity/tool feature in embedded and modal forms.
6. Institutional rules, authorization, routes, real-time cache synchronization, validation, uploads, exports and signatures remain behaviorally correct; no UI-only permission bypass.
7. No duplicate primitive families/files, unremoved migration adapters, unsupported generated APIs, unexplained hardcoded functional colors or unused legacy style systems.
8. Required tests, lint, build, governance, evidence checks and visual matrix pass from the final source. Measured performance is compared against baseline; investigate any >10% increase in initial client JavaScript transfer or key interaction/render timing under the same measurement conditions before sign-off.
9. Dependency manifests/lockfile and running cms-client agree; no Vite module overlay or missing asset remains.
10. Deliver a component/token guide, migration inventory, state/visual evidence manifest, final verification report, specialist-boundary list and a precise known-issues list (empty for a clean completion).

Do not estimate calendar completion before P0 measures inventory size and baseline complexity. Report progress as verified inventory items and completed work packages rather than a guessed percentage or number of files edited.

## 13. Ready-to-use implementation prompt for Luna 6

> Implement the complete CMS-V2 shadcn/ui refactor described in docs/specs/shadcn-full-ui-refactor-luna-6-plan.md. Start at P0 and follow the dependency order through P11. The scope includes every public/authenticated screen, all role dashboards, shared and nested components, overlays, loading bar, skeletons, startup loaders, progress feedback, errors and empty states. Re-read AGENTS.md and relevant skills, preserve the existing dirty working tree, and record the baseline before editing. Keep React 18/Tailwind 3/JSX unless a verified compatibility blocker requires an explicitly documented setup decision. Use one pinned compatible shadcn primitive family, one token system and one canonical UI directory. Preserve all workflow, permission, routing, realtime, document-reader and signature behavior. Work in bounded resumable slices with targeted tests and actual light/dark desktop/mobile visual inspection. Update the durable coverage inventory and execution checkpoint after each verified slice. Do not stop after migrating primitives or the most visible pages. Finish the legacy-style sweep and final gates before declaring completion; report any precise blocker without claiming the affected surface is done. No subagents are required by this plan.

## 14. Reference and planning evidence

- Repository requirements: AGENTS.md; .agents/rules/00-chat-starter-protocol.md; .agents/skills/frontend-patterns/SKILL.md; .agents/skills/ui-design-principles/SKILL.md; .agents/skills/context-gathering-and-ast-triage/SKILL.md; .agents/skills/workspace-evidence-maintenance/SKILL.md.
- Source evidence: client/package.json; package.json; client/tailwind.config.js; client/src/index.css; client/src/App.jsx; client/src/components/ui/Button.jsx, Select.jsx, Tabs.jsx, Skeleton.jsx; client/src/lib/topProgress.js; client/src/lib/utils.js; client/src/pages/dashboard/DashboardPage.jsx; bounded page/component filename inventories.
- Official sources accessed 2026-10-21: [shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite), [React 18/Tailwind 3 compatibility](https://ui.shadcn.com/docs/tailwind-v4), [JavaScript configuration](https://ui.shadcn.com/docs/javascript), [components](https://ui.shadcn.com/docs/components), [Progress](https://ui.shadcn.com/docs/components/progress). Re-check these at implementation time and pin actual compatible output.
- Planning limitations: no live visual audit, application tests, build, dependency installation or UI implementation performed as part of authoring this plan. Source inventory is a seed; P0 must reconcile it with the then-current tree.

