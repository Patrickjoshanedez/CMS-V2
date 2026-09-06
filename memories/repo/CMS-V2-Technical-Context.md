# CMS-V2 Technical Context

## Prevention Rules
- For orchestration initialization-only changes, require an evidence triad before completion: (1) targeted verification report, (2) explicit mutation evidence convention with numeric score, (3) reviewer verdict.
- Any submissions read endpoint must enforce scoped authorization through `getSubmissionViewContext` or `_assertCanViewSubmission` against project membership/assignment, not role-only shortcuts.
- When a service method signature is hardened with requester context, add or update route-level integration coverage for that endpoint to catch stale call sites.
- For monorepo targeted server verification, always run focused tests with server context command: `npm --prefix server run test -- <files>`.
- Keep regression coverage for archive/certificate guards: missing finals, plagiarism failed, non-archived upload, missing certificate key.
- For local Docker MongoDB seeding on Windows, prefer `mongodb://127.0.0.1:27017/cms_v2` over `localhost` to avoid IPv6 resolution timeouts, and start Mongo with `docker compose -f docker-compose.yml up -d mongodb`.
- If host-side seeding fails with Atlas DNS/SRV errors (e.g., `querySrv ECONNREFUSED`), run seed scripts inside `cms-server-prod` so container-network Mongo (`mongodb`) is reachable.
- After patching seed scripts locally, sync changes into the running container (`docker cp ... cms-server-prod:/app/server/...`) or rebuild before rerunning `npm run seed`; otherwise the container executes stale code.
- Keep production and development compose stacks isolated by project name (for example `name: cms-v2-prod` in [docker-compose.prod.yml](docker-compose.prod.yml)) to prevent mixed-service networks and intermittent `mongodb` DNS/TCP failures.
- Serena reliability gate: require preflight evidence that `.serena/project.yml` exists with `project_name`, non-empty `base_modes`, and non-empty `default_modes`; orchestrator startup must run `get_current_config` and activate/switch modes when needed.
- Secret-hygiene scanners must treat `${input:...}` and `${env:...}` placeholders as safe references, while still fail-closing on literal token/API-key patterns (for example `ghp_...` or `github_pat_...`).
- Express 5 request.query is getter-only; validation middleware must not assign `req.query = ...` directly. Use `Object.defineProperty(req, 'query', { value: parsed, ... })` or a validated payload container to avoid `TypeError: Cannot set property query`.
- Mongoose 9 document middleware should use promise-style pre hooks (`schema.pre('save', async function () { ... })` / `schema.pre('validate', function () { ... })`); callback-style `next` can be undefined and trigger `TypeError: next is not a function`.
- Express 5 catch-all routes must not use bare `*` (for example `app.all('*', ...)`), because path-to-regexp v8 throws `Missing parameter name`; use `app.all('/{*path}', ...)` (or equivalent named wildcard) for 404 fallbacks.
- For archive OCR UX, always keep a client-side fallback that derives metadata from filename and keyword inference when extraction is empty/unavailable; never leave the metadata form blank after a PDF selection.
- When hot-patching large JSX files, run a quick tail check to ensure no detached statements were appended outside the component scope.
- Institutional Capstone Workflow Ground Truth: BukSU CMS-V2 strictly operates under the canonical 4-Phase Capstone / 5-Milestone progression (`Phase 0: Team Formation & Lock`, `Phase 1: Capstone 1 - Proposal & Similarity Pre-Scan`, `Phase 2: Capstone 2 - Chapters 1-3 & ADM v1`, `Phase 3: Capstone 3 - System Dev, Gantt Tracker & ADM v2`, `Phase 4: Capstone 4 - Final Defense, Multi-Tier ADM Sign-off & Archival`). Never reintroduce or reference legacy 6-phase or 3-phase workflows.
- Cross-Session Memory Invariant: Every agent in every chat must perform Stage 0 startup preflight by inspecting `.agents/ptss/index.jsonl` (last 2-3 sessions) and `memories/repo/CMS-V2-Technical-Context.md` to establish architectural continuity. On task completion, lessons learned must be dual-persisted to `.agents/ptss/sessions/` and `memories/repo/lessons/` (with required keywords: `lesson`, `learned`, `prevention`, `runbook`, `checklist`).
- Committee Assignment & Faculty Querying Prevention Rule: In `user.validation.js`, keep `listUsersQuerySchema` limit cap aligned with frontend bulk selects (max 500) and support multi-role filtering (`role: instructor,adviser,panelist,faculty`). When querying candidate faculty in modals or views, always pass explicit faculty role filters and handle loading/empty placeholders gracefully so student records never crowd out faculty.
- Runbook & Checklist for User Filter Endpoints:
  1. Checklist: Ensure query validation schemas allow pagination limits requested by frontend components (e.g. limit: 200).
  2. Checklist: When candidate lists require specific subsets of users (such as faculty committee members), filter by role on the database layer to avoid pagination displacement by other user types (e.g. students).
  3. Lesson learned: Zod validation errors on query parameters fail quietly inside React Query hooks if not explicitly surfaced in UI, causing select dropdowns to appear empty even when database records are seeded.
  4. Lesson learned / Prevention: In Docker Desktop on Windows, inotify filesystem events from the Windows host do not trigger nodemon in Linux containers without the `-L` (`--legacy-watch`) polling flag. Keep `nodemon -L` in `server/package.json` dev script so code changes trigger reloads reliably.
  5. Lesson learned / Prevention: Default array parameters in React components (e.g. `initialPanelistIds = []`) create a new array reference on every render, causing `useEffect` dependencies to falsely trigger and reset form state. Stabilize with `Object.freeze([])` and serialized dependency strings.
  6. Institutional Nomenclature Rule: In the UI, course instructors are designated `[Instructor]`, while all other department personnel (adviser, panelist, secretary, chair, faculty) are labeled under the unified institutional title `[Faculty]`.
  7. Committee Composition & Mutual Exclusion Rule: Defense committees consist of 1 Adviser, 1 Secretary, and 3 Defense Panelists (Panelist 1 Lead/Chair, Panelist 2 Member, Panel Member 3), none labeled optional. A faculty member cannot serve as both adviser/secretary and panelist on the same team, nor can panelists duplicate each other, enforced across UI comboboxes, submit validation, and backend service logic.

31. Primary User Role Consolidation Rule: Primary user account roles visible in user management (`/users`) are strictly: `student` (Student), `instructor` (Instructor), and `faculty` (Faculty) exported as `PRIMARY_ROLES` in `@cms/shared`. Adviser, Secretary, Panelist, and Chair are committee appointments under the Faculty umbrella. In `user.service.js:listUsers`, querying `role: 'faculty'` automatically expands to `{ $in: ['faculty', 'adviser', 'panelist'] }` to ensure full compatibility with legacy or seeded accounts.
32. Deep-Linking and Phase 0 Roster Inspection Rule: Teams deep-linking via query parameter (`?teamId=<id>`) is supported on both the API service (`team.validation.js` `teamId` filter and `team.service.js` `_id` query) and client layer (`useTeamById`). `TeamsPage` automatically inspects URL `searchParams`, highlights the targeted team, and opens `InspectRosterDialog`, displaying BukSU Phase 0 verification status, the 5 standardized proponent roles, and committee appointments.

33. Committee Role Restrictions & Notification Auto-Completion Rule:
- Course instructors (`role: 'instructor'`) cannot serve as Adviser, Secretary, or Defense Panelists; committee appointments are strictly reserved for Faculty members (`role: 'faculty'`, `adviser`, `panelist`). Both client comboboxes (`useUsers({ role: 'faculty' })`) and backend services (`team.service.js:assignCommittee`) strictly reject instructor appointments.
- Mongoose Mixed Schema Query Gotcha / Prevention: `metadata` on notifications uses `Schema.Types.Mixed`, meaning Mongoose does NOT auto-cast `ObjectId` to string or vice-versa. Querying `'metadata.teamId': team._id` fails to match when saved as `team._id.toString()`. Always query `$or: [{ 'metadata.teamId': team._id }, { 'metadata.teamId': team._id.toString() }]`.
- Full-Assignment Auto-Completion Checklist: A committee is fully assigned only when 1 Adviser, 1 Secretary, and >= 3 Panelists are assigned. Upon reaching this threshold, notifications are marked `isRead: true` with `metadata.status: 'completed'`. The UI swaps the active `Action Required` pill and blue `Assign Committee` button for an `Assigned` status badge and `Edit Committee` option, supported by cache invalidation across `['teams']`, `['notifications']`, and `['projects']`.
34. Committee Secretary Defense Workflow & ADM Endorsement Gate Rule:
- Live Defense Minutes: Committee Secretaries log real-time defense critiques tagged with 6 institutional categories (`Manuscript / Literature`, `System Architecture / Backend`, `UI/UX`, `Database Schema`, `Methodology & Implementation`, `General / Other`), panelist attribution, severity level, and page/module anchors.
- Automated Score Aggregation: Consolidates panel evaluation rubrics, validates against the institutional 75% minimum passing threshold, and locks composite scores (`compositeScores.isLocked = true`) with Chair confirmation.
- Consensus Verdict & Atomic ADM Publishing: Records consensus decisions (`approved`, `minor_revisions`, `major_revisions`, `failed`) and atomically publishes minutes entries as Action Done Matrix rows (`pending_developer_action`).
- Secretary Compliance Verification Gate: `project.admSignatures.secretary.endorsed = true` is an immutable prerequisite for committee digital signatures. In `project.controller.js:signTieredADM`, panel members and advisers cannot sign until the Secretary submits digital endorsement certifying student compliance. In the UI (`ActionDoneMatrixTab.jsx`), an institutional Secretary Compliance Verification Gate banner appears above Tier 1, locking committee signatures when endorsement is pending.

35. Interconnected Harness Scaling Architecture (IHSA) & In-Process Dispatcher Rule:
- PreToolUse Static Gatekeeper Deadlock Prevention: PreToolUse static gatekeeping must NEVER evaluate on-disk linter passes over un-mutated files if a file currently contains syntax debt, as doing so deadlocks agents from applying fixes. In `static_gatekeeper.py`, linting verifies proposed patch buffers and externalizes domain-specific token restrictions to `feature_policies.json`.
- Provider-Agnostic Cloud AI Runtime: Hardcoded Ollama localhost dependencies are prohibited. The runtime operates on high-throughput cloud reasoning models (DeepSeek API `https://api.deepseek.com` with model `deepseek-chat` as alternative to GPT-4o) configured via `.github/hooks/state/runtime_config.json` and `DEEPSEEK_API_KEY`.
- Monolithic Hook Decomposition: The legacy 2,551-line `continual_learning_checkpoint.py` is decomposed into single-responsibility gates (`test_tracking_gate.py`, `public_exposure_gate.py`, and `completion_keyword_guard.py`), preserving a thin modular facade for 100% backward compatibility.
- In-Process Hook Dispatcher Execution (<175ms): `hooks_dispatcher.py` loads `hook_registry.json` and executes lifecycle gates in-process using Python module caching (`sys.modules`), slashing tool dispatch latency from ~1,800ms down to <175ms.
- Checklist & Runbook for IHSA Maintenance:
  1. Runbook: Synchronize agent states and hook registries with `python .github/hooks/scripts/generate_registries.py`.
  2. Checklist: Verify 60/60 governance checks with `npm run validate:agentic` and `npm run validate:governance`.
  3. Lesson learned: In-process module caching eliminates Python interpreter cold-boot overhead across multi-agent turns.
  4. Lesson learned / Prevention: Store cloud model keys in `.github/hooks/state/runtime_config.json` and read via `os.environ` to satisfy secret scanners and HLLM regex preflights without committing secrets.

36. Page Transition Top Progress & SDG Combobox Architecture Rule:
- Global Zero-Latency Top Progress Bar: In `client/src/lib/topProgress.js` and `TopProgressBar.jsx`, all page navigations trigger an immediate 0ms jump to 24% via capture-phase click interception and History API wrappers (`pushState`/`popstate`). React `<Suspense>` chunk downloads are bridged via `SuspenseProgressBridge` in `App.jsx`, trickling progress up to 95% and surging to 100% when the target view mounts. Misplaced inner progress bars in layouts (e.g. inside `<main>`) are strictly forbidden.
- Authoritative Institutional SDG Catalog: Proponents submit titles tagged with UN Sustainable Development Goals (1..17). Never hardcode partial subsets in components; always import `SDG_GOALS` from `@cms/shared`. In `SdgCombobox.jsx`, render searchable comboboxes with real-time keyword filtering and custom scrollbars to prevent option cutoff.
- Tactile Proponent Toast Feedback: Changes to proposal metadata (SDG alignment, discipline) must emit instant, explicit feedback via `toast.success` to reassure proponents that their selections are recorded.

37. Canonical IT Field of Discipline & Combobox Architecture Rule:
- Single Source of Truth in `@cms/shared`: Institutional IT disciplines must be imported from `shared/constants/disciplines.js` (`IT_DISCIPLINES`, `IT_DISCIPLINE_NAMES`, `getDisciplineByNameOrId`), adhering to CHED CMO 25 s. 2015 and BukSU IT Department capstone specializations (18+ distinct domains including Software Engineering, AI/ML, Cloud Systems, Telemedicine, Agri-Tech, GIS, FinTech, and E-Governance). Never restrict components to ad-hoc local subsets.
- Domain-Categorized Combobox Pattern: In `DisciplineCombobox.jsx`, render searchable comboboxes with real-time keyword filtering across title, domain category, and curriculum description, paired with domain badges and scrollable viewports (`max-h-64 overflow-y-auto`) to eliminate viewport cutoffs.
- Dual Alignment Visual Feedback: In proposal authoring studios (`CreateProjectPage.jsx`), provide instant `toast.success` notifications with domain context and dual active alignment cards confirming both the IT Field of Discipline and the UN SDG target prior to submission.

38. One-to-Many Field of Discipline & SDG Alignment Modal & Toast Architecture:
- One-to-Many Relational Gating: BukSU Capstone 1 title proposals support 1..10 IT Fields of Discipline (`capstoneType: [String]`) and 1..10 UN SDGs (`sdgTags: [String]`). Single-select dropdowns/comboboxes are replaced with dedicated `[ + Select Disciplines ]` and `[ + Select SDGs ]` trigger buttons opening `<AlignmentSelectorDialog>`.
- High-Density Multi-Select Modal Dialog: `AlignmentSelectorDialog` features live keyword search filtering, domain category tabs, individual custom checkboxes, selection count caps (1–10 max), and explicit Apply Selection actions.
- Tag Pill Clouds with Direct Removal: Selected items render into responsive badge pill clouds in the host form with individual `(x)` remove triggers, emitting Sonner toasts (`toast.success`, `toast.info`) upon updating or removing items to provide continuous tactile feedback.
- Portal Isolation in Tests: `AlignmentSelectorDialog` accepts an optional `portal = true` prop (default `true` using `createPortal(..., document.body)` in production, set to `false` in component tests) ensuring clean, isolated test runs without detached JSDOM memory leaks.

39. Fast-Path Targeted Testing Directive (Zero-Lag Verification):
- Test Delay Bottleneck: Running the full 43+ test suites in `client/` requires ~96–120s due to JSDOM environment initialization across each file. Running full test suites on every minor edit wastes developer time, inflates token usage, and risks watchdog timeouts.
- Targeted Testing Rule: Agents and developers MUST use targeted testing during development loops (`npm test --workspace=client -- <test-file-path>` or `npm run test:client -- <test-file-path>`), which runs in 1–5s (slashing wait times by >90%).
- Targeted Server Testing: Use `npm test --workspace=server -- <test-file-path>` or `npm run test:server -- <test-file-path>` for unit tests (1–4s) instead of invoking the full 13-stage MongoMemoryServer integration suite on minor changes.
- Tiered Verification Strategy:
  - Iteration Tier: Run targeted tests matching the edited files or directory pattern.
  - Final Gate Tier: Run full verification battery (`npm test --workspace=client`, server workflow test, `check:endpoints`, `validate:governance`, `workspace_guardrail.py`) only upon final task completion or before commit/PR.

40. Candidate Proposal Capacity & Tiered Test Scoping (TTS) Rule:
- Capstone 1 Candidate Proposals Expansion: Teams can author and submit up to 5 candidate proposals in `CreateProjectPage.jsx` (expanded from 3 to 5, bounded within the backend schema's 1..10 capacity). Non-primary candidate proposals (options 2..5) feature dedicated remove triggers with real-time pill cloud synchronization and Sonner feedback.
- Tiered Test Scoping (TTS) & Execution Rules: Mandated in `docs/specs/ihsa-specification.md` and `.github/hooks/state/feature_policies.json`. Monolithic test loops (`npm test`, `npm test --workspace=client`, `npm test --workspaces`) are strictly disallowed for inner-loop agent execution; agents must run targeted specs with `--watchAll=false` (`npm run test:client -- <spec>`) to eliminate Docker/runner timeout stalls (30s limit).

41. Container Shell Script Line-Ending Normalization (Windows CRLF Prevention):
- Lesson learned: Shell scripts mounted into Linux containers (such as `entrypoint.sh` for `cms-ollama`) fail with `syntax error: unexpected end of file` and `$'\\r': command not found` if formatted with Windows CRLF (`\\r\\n`) line endings. Linux bash treats `\\r` as command text, breaking syntax structures (`do`, `done`, `then`, `fi`).
- Prevention / Checklist: Enforce `*.sh text eol=lf` in `.gitattributes` so git never converts shell scripts to CRLF on Windows checkouts. Before mounting local `.sh` scripts into Docker containers, verify with `bash -n` or strip `\\r` using `content.replace(/\\r\\n/g, '\\n')`.
- Runbook for Ollama Container Diagnostics:
  1. Checklist: Check container health status with `docker ps` and inspect logs with `docker logs cms-ollama --tail 50`.
  2. Evidence: Look for `$'\\r': command not found` in bash error traces.
  3. Action: Normalize file line endings to LF, verify syntax with `docker run --rm -v "${PWD}/entrypoint.sh:/test.sh" bash:5 bash -n /test.sh`, and run `docker restart cms-ollama`.
  4. Verification passed: Confirm container status is `healthy` and probe tags with `curl http://localhost:11434/api/tags`.

42. Similar Project Preview Modal & Enriched Similarity Payload Rule:
- Interactive Similarity Warning Trigger: In `TitleSimilarityChecker.jsx`, similar titles detected above the threshold render as interactive triggers with hover states, cursor indicators, inspection icons (`Eye`), match percentage badges, and "View Scope →" prompts, opening `<SimilarProjectModal>`.
- Institutional Preview Modal: `SimilarProjectModal.jsx` displays title match %, academic year, abstract/project summary, two-column grid with target beneficiary/scope and tech stack tags, and an institutional Divergence Recommendation banner. Uses `createPortal(..., document.body)` with `portal = true` default (configurable for unit tests) and Escape key/backdrop dismiss.
- Enriched Similarity Screening Payload: `findSimilarProjects` in `server/utils/titleSimilarity.js` returns `id`, `similarityScore`, `academicYear`, `abstract`, `targetBeneficiary`, and `techStack`, while preserving `projectId` and `score` for 100% backward compatibility. In `project.service.js`, queries across `checkTitleSimilarity`, `createProject`, `updateTitle`, and `submitTitleProposal` explicitly select full project metadata.

43. Auto-Expanding Textarea Component & Proposal Pitch Fields Rule:
- Dynamic Scroll Height Auto-Adjustment: Reusable `AutoExpandingTextarea` (`client/src/components/projects/AutoExpandingTextarea.jsx`) sets `textarea.style.height = 'auto'` before applying `textarea.scrollHeight`, ensuring smooth shrinking on backspace and immediate auto-expansion on paste or typing overflow. Uses CSS transition `transition-[height,border-color,box-shadow,background-color] duration-200 ease-out` and `resize-none overflow-hidden` to eliminate horizontal scrollbars and text truncation.
- Proposal Form Integration: In `CreateProjectPage.jsx`, the 5 pitch fields (`problemStatement`, `proposedSolution`, `uniqueContribution`, `targetUsers`, `expectedImpact`) use `AutoExpandingTextarea` to accommodate variable-length research descriptions without clipping.
- Institutional Input Contract Preservation: The `Proposed Project Title` input retains its `<Input id="proposal-{i}-title">` element to remain 100% compliant with institutional draft tests in `CreateProjectPage.test.jsx`.
- Multi-Workflow Backward Compatibility: Supports `variant="ghost"` and floating `savingStatus` (`saving`, `saved`, `error`) for seamless usage across `ActionDoneMatrixTab.jsx` and `LiveDefenseMinutesModal.jsx`.

44. High-Contrast Surface Standardization, Autosave Exit Guard & Text Scaling Rule:
- High-Contrast Border & Surface Standardization: In light mode, pale borders (`border-slate-100`/`border-slate-200`) wash out against white backgrounds. All card containers and structural boundaries use `border-slate-300` (`border border-slate-300 shadow-sm bg-white`) and form controls use `border border-slate-400/80 bg-white` with `focus:border-blue-600 focus:ring-2 focus:ring-blue-100`, matching dark mode's `border-slate-700 dark:bg-[#0c1424]` and `dark:focus:border-blue-500 dark:focus:ring-blue-900/40` with 1:1 visual weight. Page canvas uses `bg-slate-100 dark:bg-[#060b13]`, and section dividers use `border-slate-300 dark:border-slate-800`.
- Reactive Debounced Autosave Hook with Exit Guard (`useAutosave.js`): Custom hook debounces form data persistence to `localStorage` (and optional remote backend sync), returning `saveStatus` (`'saved' | 'saving' | 'unsaved'`). Intercepts `beforeunload` events when status is `'unsaved'` or `'saving'` to prevent accidental data loss. Renders alongside reactive `<SaveStatusIndicator status={saveStatus} />` chip displaying amber pulsing dot for `Saving...`, rose dot for `Unsaved changes`, and emerald dot for `Draft (Auto-saved)`.
- Accessible Text Scaling Dropdown (`TextScaleDropdown.jsx`): Replaces static toolbar button with a 3-tier dropdown (`1x (Normal) 100% 16px`, `1.1x (Medium) 110% 17.6px`, `1.25x (Large) 125% 20px`), dynamically adjusting root `document.documentElement.style.fontSize` and `--font-size-multiplier` for uniform rem-based typography scaling across the entire application, persisted in `localStorage('app_text_scale')`.
- Proposal Capacity & Alignment Dialog Parity: Capstone 1 proposal authoring supports up to 5 candidate pitches with removal of non-primary proposals, and one-to-many IT Fields of Discipline and SDG alignments wired to `AlignmentSelectorDialog` with Sonner toast feedback.

45. Edge Cases & Layout Regression Hardening Rule (Animated Inputs, Autosave, Rail Sidebar & Text Scaling):
- Auto-Expanding Textarea Scroll Jumping & Flicker Prevention: In `AutoExpandingTextarea.jsx` (and `ResilientTextarea`), measuring dynamic height via `textarea.style.height = 'auto'` can cause the page viewport to jump upward if the user is editing far down a long document. Prevented by recording `window.scrollY` before height collapse, applying `Math.max(scrollHeight, minHeight)`, and restoring scroll position. Enforces `box-border` and `overflow-y-hidden` to completely stop border calculation jitter and infinite expansion loops.
- Autosave SPA Route Navigation Loss & Network Race Prevention: `beforeunload` only catches page reload/tab closure; navigating internal client routes (e.g. from proposal to dashboard) causes component unmount without triggering `beforeunload`. In `useAutosave.js`, `useEffect` cleanup flushes `latestDataRef.current` synchronously to `localStorage` on unmount. To prevent slower out-of-order responses from overwriting newer local edits, in-flight remote requests are cancelled with `AbortController` before issuing new saves, ignoring `AbortError`/`ERR_CANCELED`. Exports `useProposalAutosave` for proposal-specific key namespacing (`draft_capstone_${projectId}_proposal_${proposalIndex}`).
- Portal-Based Sidebar Rail Tooltip Clipping Prevention: In collapsed rail state (`w-[76px]`), `overflow-y-auto` causes `absolute` positioned tooltips to be clipped or create a horizontal scrollbar. Navigation nodes render tooltips via React Portal (`createPortal(tooltip, document.body)`) using fixed viewport coordinates derived from `getBoundingClientRect()`, with accessible `role="tooltip"`, `data-testid="sidebar-tooltip"`, and synthetic mouse/focus event support.
- Text Scaling Layout Collision Prevention: Flexible minimum heights (`min-h-[2.5rem]`, `py-2`) and rem-based Tailwind typography classes replace rigid fixed heights (`h-10`, `h-12`) across headers and interactive bars, ensuring smooth expansion when root font scaling is set to 1.1x (Medium) or 1.25x (Large).
- Global Autofill & Select Native Option Contrast Fix: In `index.css`, `@layer base` applies `-webkit-box-shadow: 0 0 0px 1000px ... inset !important` and `-webkit-text-fill-color` to prevent WebKit/Blink autofill from wiping out dark mode surfaces with pale yellow. Native `<select option>` elements are explicitly styled for light and dark themes to prevent black-text-on-black-background rendering.
- Checklist & Runbook for Form Ergonomics and Layout Hardening:
  1. Checklist: Verify that expanding textareas include `overflow-y-hidden` and `box-border` and cache `window.scrollY`.
  2. Checklist: Verify that autosave hooks flush draft refs on unmount and use `AbortController` for remote sync.
  3. Checklist: Verify that collapsed rail tooltips escape clipping containers via `createPortal`.
  4. Runbook: Test scaling at 1.25x with dark mode autofill and check all 6 governance/test verification gates.

46. Rule 0: Chat-Starter Preflight Snapshot Protocol:
- Absolute Tier 0 Precondition: Before chatting, outputting responses, or executing code in any session, agents must check for and verify the existence of the active chat-starter snapshot file at `.agents/ptss/chat-starter.json` (as mandated in `.agents/rules/00-chat-starter-protocol.md`).
- Session Context Priming: The chat-starter file captures session ID, timestamp, git branch status, ASDLC stage, recalled memory sessions from `index.jsonl`, primed skills, and a boolean flag for Playwright feedback requirements.
- Prevention & Runbook:
  1. Checklist: Probe `.agents/ptss/chat-starter.json` at turn 1.
  2. Action: If missing, initialize atomically with active task parameters and prime domain skills from the Skills Dictionary.
  3. Verification passed: Confirm file is valid JSON with `status: 'active'` or `'initialized'` before conversational output.

47. Skills Dictionary Mandatory First-Use & Continuous Gap-Updating Contract:
- Mandatory Domain Skill Consultation: The catalog in `.agents/skills/` is the authoritative Skills Dictionary. Agents are strictly prohibited from writing code or improvising architectures for specialized domains (backend, database, frontend, UX styling, capstone lifecycles, SRE, verification) without inspecting the matching skill first.
- Continuous Gap Patching: When using any skill, if execution uncovers missing workflow steps, undocumented file paths, or unhandled edge cases, the agent MUST update/patch `SKILL.md` (via surgical CST diffs or `skill-write-or-patch`) so that the Skills Dictionary continuously improves.
- Lesson learned: Relying on generic model weights without consulting domain skills causes institutional drift and missed edge cases. Codifying learned patterns directly back into `SKILL.md` ensures durable institutional knowledge across agent turns.

48. Playwright Multi-Viewport & Dual-Theme Visual Feedback Loop for UI/UX:
- Mandatory Visual Loop for Frontend: Any functional or aesthetic changes to UI components, pages, layouts, or CSS in `client/src/` MUST execute a Playwright visual feedback loop before declaring the task complete.
- Multi-Viewport & Dual-Theme Matrix: Visual capture scripts (e.g. `scratch/<feature>_audit.mjs`) must verify:
  1. Desktop Viewport (1440x900) in both forced Light Mode (`document.documentElement.classList.remove('dark')`) and Dark Mode (`document.documentElement.classList.add('dark')`).
  2. Mobile Viewport (iPhone 14: 390x844) in both Light Mode and Da- Visual Defect Elimination: Inspect rendered screenshots and DOM metrics for text clipping, horizontal scrollbars, jitter on auto-expanding inputs, contrast washouts, and portal clipping. Iterate until visual perfection is verified.
- Runbook & Checklist for UI Feedback Loops:
  1. Checklist: Ensure dev server or target port (e.g. 43211 / 5173) is active.
  2. Action: Run `node scratch/<feature>_audit.mjs` using Playwright (`chromium.launch({ headless: true })`).
  3. Evidence: Verify generated screenshots under `scratch/screenshots/`.
  4. Prevention: Never declare design complete without visual screenshot evidence.

49. BukSU Institutional Landing Page & Login Screen Visual Parity:
- Architectural Cohesion: Replaced consumer music-app neon wave (`#ff5722`, `#e91e63`, `#9c27b0`) and skyline equalizer silhouettes with an institutional BukSU Manuscript & Archive identity.
- Design System Tokens: Unified sticky fixed `h-20` header with BukSU seal, department badge (`COT`), shared `<ThemeToggle />` component, dual-column hero with 40px blueprint coordinate gridlines (`#1A448A`), tactile academic manuscript stack card (`PROP-2026-BSIT-042`, 12.4% originality gauge, committee compliance checkmarks), 4-stage ratification pipeline, college research vault (`THESIS-2024-019`, `THESIS-2024-044`, `THESIS-2023-012`), institutional clearance standards (≤25% plagiarism, ≥75% defense pass, Secretary ADM compliance gate, MinIO digital vault), BukSU Studies Center campus infrastructure showcase with real building photography (`buksu-studies-center.jpg`, Malaybalay City coordinates `8.156° N, 125.127° E`), and standardized footer with system status pulse bar.
- Lesson learned & Prevention:
  1. Checklist: For landing and auth pages, ensure brand monograms, fonts (`font-serif` headings, `font-mono` metrics), and theme toggles share identical design tokens.
  2. Mobile Ergononics: On narrow viewports (<640px), keep the sticky header compact by hiding large primary CTAs (delegate them to the hamburger menu drawer) to prevent monogram and department tag text from wrapping or crowding.
  3. Evidence & Verification passed: Executed Playwright feedback loop (`scratch/landing_audit.mjs`), validating high-contrast rendering across desktop (1440x900) and mobile (390x844) in both light and dark modes.
  4. Runbook: Run `node scratch/landing_audit.mjs` and inspect screenshots in `scratch/screenshots/` whenever modifying `LandingPage.jsx`.

50. Sidebar Sibling Combinator (space-y-*) Desynchronization Prevention:
- Architectural Root Cause: Absolutely positioned elements injected conditionally as direct children into a container styled with Tailwind's `space-y-*` combinator (`> :not([hidden]) ~ :not([hidden])`) trigger margin-top offsets on subsequent flow elements (e.g. Workspace Section). When calculating bounding rects before/after mounting, this causes dynamic layout displacement and creates ghost overlapping boxes over section titles.
- Resolution & Prevention Runbook:
  1. Prevention: Never use dynamic sliding indicator DOM elements inside containers that rely on Tailwind `space-y-*` or `gap-*` for layout rhythm.
  2. Pattern: Place self-contained active pills (`absolute inset-0`) directly within each navigation item component (`SidebarNavItem`). This ensures zero layout displacement, immunity to scroll/resize/zoom desynchronization, and deterministic rendering.
  3. Checklist: Ensure the sidebar brand monogram uses official BukSU tokens (`#1A448A`, `#E5A823`, `COT` badge) for complete visual unity across dashboard, landing, and authentication screens.
  4. Evidence & Verification: Verified via Playwright (`scratch/sidebar_audit.mjs`), confirming clean rendering in dark mode, light mode, and collapsed rail mode without clipping or ghost boxes.

51. TabsList & TabsTrigger Vertical Sizing & Twin Container Alignment:
- Architectural Root Cause: When `TabsList` specifies a fixed height (e.g. `h-9` / 36px) with `p-1` (8px total vertical padding), child `TabsTrigger` buttons with `py-2` (16px vertical padding + 16px line-height = 32px height) exceed the 28px available content box by 4px. This causes active tabs to bleed out over the top and bottom borders. When contrasted against adjacent pill groups with inverted colors (`bg-card` vs `bg-background`), the active tab looks distorted and misaligned.
- Resolution & Prevention Runbook:
  1. Prevention: Never use `py-2` or unconstrained heights on `TabsTrigger` inside `h-9` containers. Always standardize triggers to `h-7` (28px) or `py-1` to fit precisely within `h-9` with `p-1` padding.
  2. Pattern: Harmonize twin containers (e.g. Candidate Option Switcher and View Switcher Tabs). Both must share identical heights (`h-9`), identical container tokens (`bg-muted/50 border border-border p-1 rounded-lg`), identical active button elevations (`bg-card text-foreground shadow-xs font-semibold`), and identical button heights (`h-7`).
  3. Checklist: Ensure `<Tabs>` passed to horizontal toolbars specifies `className="space-y-0"` when tab contents are rendered externally, preventing unintended vertical margin injection.
  4. Evidence & Verification: Verified via Playwright (`scratch/create_project_audit.mjs`), confirming exact 4px top/bottom padding symmetry (`list.top = 233`, `tab.top = 237`, `tab.bottom = 265`, `list.bottom = 269`) with 0px overflow.

52. Universal Governance Synchronization & Directives Parity:
- Architectural Root Cause: When agentic runtime rules exist in fragmented states—where system prompt injection files (e.g. `GEMINI.md`) contain only abbreviated subsets while workspace documentation (`workspace-rules.md`, `00-chat-starter-protocol.md`) contains the full contracts—agents suffer split-brain desynchronization, forgetting critical institutional boundaries (such as Course Instructor committee exclusion and Secretary ADM endorsement gates).
- Resolution & Prevention Runbook:
  1. Prevention: Maintain 100% lexical and behavioral parity across `GEMINI.md`, `AGENTS.md`, and `.agents/rules/workspace-rules.md`. Never leave root agent instructions as truncated stubs.
  2. Checklist: Ensure both `GEMINI.md` and `AGENTS.md` explicitly enforce: (a) Primary User Roles (`student`, `instructor`, `faculty`), (b) Course Instructor committee exclusion, (c) Faculty committee composition (1 Adviser, 1 Secretary, 3 Panelists), (d) Secretary ADM digital sign-off prerequisite (`project.admSignatures.secretary.endorsed === true`), (e) Two-Pile Instruction Architecture, (f) ASDLC v2.0 8-Stage Lifecycle, (g) Supreme Cognitive Protocols & Kernel Engineering Standards, (h) Fast-Path Targeted Testing, and (i) Unified 7-Point Quality Gate Battery.
  3. Lesson learned: In Antigravity/Gemini sessions, `GEMINI.md` takes precedence as an immutable user rule. Synchronizing it with the complete operational boundaries eliminates cognitive drift and prevents invalid committee appointments or test regressions.
  4. Evidence & Verification passed: Executed the full governance validation battery (`npm run validate:governance`, `node scripts/check-endpoint-mappings.js`, `python scripts/workspace_guardrail.py`), achieving 60/60 passing agentic checks, zero endpoint discrepancies (`UNMATCHED_COUNT = 0`), and a pristine workspace.

53. Proposal Similarity Unscanned State & Matched Archive UI Ergonomics:
- Architectural Root Cause:
  1. `CreateProjectPage.jsx` defaulted unscanned proposals to a hardcoded 12.4% with 4.2% exact matches and 14.8% semantic proximity, causing all newly added candidate proposals to show identical fake scan results before any scan was triggered.
  2. Matched Archive Manuscripts card rendered a static hardcoded array containing two dummy titles rather than querying the real repository scan results.
  3. Inside the archive item header, placing the long manuscript title and the academic year `<Badge>` in a flex row without `shrink-0 whitespace-nowrap` caused flex shrinkage, wrapping `"2024–2025"` awkwardly into two separate lines (`"2024-"` and `"2025"`).
  4. The "Inspect" button had no click handler connected to `SimilarProjectModal`.
- Resolution & Prevention Runbook:
  1. Prevention: Unscanned state must always initialize similarity metrics to `0.0%`, display clear "Pending scan — not yet verified" status labels, and provide an explicit "Scan Title" call to action.
  2. Isolation: Track scan results per proposal index (`proposalPlagiarismResults[activeProposalIndex]`, `proposalSimilarityResults[activeProposalIndex]`) so switching proposals preserves each proposal's scan state independently.
  3. Empty States: Render a clean empty state ("No Scan Results Yet") before scanning, and a dedicated confirmation state ("No Similar Manuscripts Found") when the backend returns 0 matches.
  4. Badge Wrapping Guard: Always apply `shrink-0 whitespace-nowrap font-mono` to date and academic year badges alongside flexible titles with `flex-1 min-w-0 pr-2`.
  5. Modal Inspection: Connect "Inspect" to open `SimilarProjectModal` with abstract, target beneficiary, tech stack, and divergence recommendations.
  6. Match Label Concatenation: Check `typeof item.match === 'string' && item.match.includes('match') ? item.match : ...` to prevent duplicate `'match match'` strings.
  7. Evidence & Verification passed: 10/10 targeted client tests passed (`CreateProjectPage.test.jsx`), 2/2 server integration tests passed (`proposal-similarity.test.js`), 4-matrix Playwright visual feedback loop passed across desktop (1440x900) and mobile (390x844) in both light and dark modes (badge height = 20.0px), `check:endpoints` passed with `UNMATCHED_COUNT = 0`, and agentic validation passed (60/60 checks).

54. PowerPoint (.pptx) Proposal Export & Interactive Slide Deck Rehearsal Architecture:
- Architectural Root Cause:
  1. Pitch deck preview in `CreateProjectPage.jsx` was a static single slide card showing only Slide 1 without navigation controls, preventing proponents from previewing and rehearsing their full defense presentation.
  2. The deck preview rendered proponent attribution as `Team Team Gamma` due to string concatenation `"Team " + team.name` where `team.name` already included `"Team Gamma"`.
  3. No PowerPoint (.pptx) export existed in the application; proponents only had PDF export.
  4. The client Vite dev server executes inside Docker container `cms-client`. Installing `pptxgenjs` on the Windows host alone resulted in `Failed to resolve import "pptxgenjs"` inside the running web app.
- Resolution & Prevention Runbook:
  1. Docker Container Dependency Sync: When introducing new npm dependencies into the frontend workspace, install them both on the host (`npm install --workspace=client <pkg>`) and inside the container (`docker exec cms-client npm install --workspace=client <pkg>`), then restart the container (`docker restart cms-client`).
  2. Prefix Sanitization Pattern: Always sanitize entity names that might repeat generic prefixes. Define a memoized cleaner: `const cleanTeamName = team?.name ? team.name.replace(/^Team\s+/i, '') : 'Team';` and display as `Team ${cleanTeamName}`.
  3. Interactive Slide Carousel Pattern: Define an 8-slide array (`deckSlides`) modeling canonical proposal defense slides (Cover, Problem, Solution, Innovation, Target Users, Expected Impact, SDG & Discipline Alignment, Q&A). Track active slide index (`currentSlideIndex`) with Next/Previous button controls, keyboard listener (`ArrowLeft`/`ArrowRight`/`Escape`), and numbered indicator pills.
  4. Fullscreen Presentation Rehearsal: Support modal rehearsal (`isFullscreenDeckOpen`) rendering 16:9 widescreen canvas (`aspect-video`) with high-contrast surfaces, gold accent dividers, and responsive text scaling.
  5. Institutional PowerPoint Generator (`client/src/utils/exportPptx.js`): Use `pptxgenjs` to create an 8-slide widescreen (16:9) presentation matching BukSU institutional branding (Navy `#0A3254`, Academic Gold `#E5A823`, Slate `#334155`).
  6. Evidence & Verification passed: 11/11 client unit tests passed (`CreateProjectPage.test.jsx`), standalone PPTX generator verified with 54KB valid output, multi-viewport Playwright visual audit verified across desktop (1440x900) and mobile (390x844) in both light and dark modes, route parity maintained (`UNMATCHED_COUNT = 0`), and agentic validation passed (60/60 checks).

55. Development Environment Sync, Entity Sanitization & Presentation Canvas Runbook:
- Checklist for Adding Frontend Dependencies:
  1. Checklist: Run `npm install --workspace=client <pkg>` on the Windows host to update `package.json` and host lockfile.
  2. Checklist: Check if Docker container `cms-client` is running via `docker ps`.
  3. Action: Run `docker exec cms-client npm install --workspace=client <pkg>`.
  4. Action: Restart the container via `docker restart cms-client` to force Vite's module optimizer to index the new dependency.
  5. Verification: Before capturing Playwright screenshots in `scratch/`, attach `page.on('pageerror', ...)` to catch Vite resolution overlays (`[plugin:vite:import-analysis]`) immediately.
- Checklist for Entity Display Formatting:
  1. Checklist: Never assume raw entity names lack classification prefixes (e.g. `team.name` may already be `"Team Gamma"`).
  2. Pattern: Always sanitize with `name.replace(/^<Prefix>\s+/i, '').trim()`.
  3. Prevention: Eliminate visual bugs such as `"Team Team Gamma"` or `"SDG SDG 3"`.
- Checklist for 16:9 Slide Presentation Canvases:
  1. Checklist: Canvas must have `aspect-video` (16:9), `relative`, `overflow-hidden`.
  2. Checklist: Use flex column distribution (`flex flex-col justify-between`) so header, content, and footer anchors are deterministic.
  3. Checklist: Keyboard event listeners for slide navigation must ignore events if `['INPUT', 'TEXTAREA'].includes(e.target.tagName)` or `e.target.isContentEditable`.
  4. Checklist: Export generators (PDF, PPTX) must align slide titles and structure 1:1 with the interactive web preview.

56. Floating Labels, Browser Autofill & Controlled Input Character Retention:
- Architectural Root Cause:
  1. Floating label overlap bug: In `FloatingInput.jsx`, label elevation was conditionally toggled via React state (`isFloating = focused || hasValue`). When browser password managers (Chrome/Edge/1Password) autofill credentials, values are injected directly into native DOM elements without dispatching React synthetic `onChange` events. React Hook Form state remained `""`, leaving `isFloating: false`. The CSS lacked peer selectors for `:not(:placeholder-shown)` and `:-webkit-autofill`, leaving the label centered at `top-1/2 -translate-y-1/2` directly overlapping the credentials.
  2. First-character swallowed bug: Attempting to synchronize native DOM values into React state via an internal `el.addEventListener('input', checkDomValue)` caused `setHasDomValue(true)` to fire synchronously on the first keypress. This forced `FloatingInput` to re-render while the parent controlled form (`useController`) still held `value: ""`. The controlled input re-applied `value=""`, wiping out the first character (e.g. `'b'` in `"bennett..."` disappeared).
- Resolution & Prevention Runbook:
  1. Pure CSS Compositor Floating: Delegate autofill and native value detection entirely to CSS compositor rules:
     ```css
     .floating-input:focus ~ .floating-label,
     .floating-input:not(:placeholder-shown) ~ .floating-label,
     .floating-input:-webkit-autofill ~ .floating-label,
     .floating-label-active {
       top: 0.5rem !important;
       transform: translateY(0) scale(0.75) !important;
       transform-origin: top left !important;
     }
     ```
  2. Controlled Input Purity: NEVER attach native DOM `input` or `change` listeners that call `setState` inside an input wrapper wrapping controlled form libraries (React Hook Form). Let React state flow unidirectional from `props.value`.
  3. Vertical Headroom Token: Use `h-14 pt-5 pb-1.5` on floating input boxes to guarantee clean vertical clearance between the scaled label (`scale-75`) and the entered text.
  4. Evidence & Verification passed: Tested character-by-character keypress in Playwright (`'b'` -> `'b'`, `'e'` -> `'be'`, `'n'` -> `'ben'`), verified full credential autofill and blurred input states across desktop (1440x900) and mobile (390x844) in both light and dark modes, route parity maintained (`UNMATCHED_COUNT = 0`), and agentic validation passed (60/60 checks).

57. Trhino CodePen Beam & Aperture Loading Screen Architecture:
- Architectural Root Cause & Mechanics:
  1. Replaced the Alex Warnes 3D orbit spinner with Trhino's CodePen loader (`jOQJPQ`).
  2. The CodePen relies on a 2-phase sequence: Phase 1 expands a centered horizontal slit line (`0% -> 20% -> 30% -> 50% -> 100% width, height: 3px/4px`), and Phase 2 expands the slit vertically from 3px/4px to 100% height (`height: 100%`), revealing the underlying page. When complete, content slides up (`transition.slideUpIn`) and icons/images flip in (`transition.flipYIn`).
  3. Centering Pitfall & Prevention: An aperture element that expands in width and height from the center must use `top: 0; bottom: 0; left: 0; right: 0; margin: auto; position: absolute;` rather than `transform: translate(-50%, -50%)` or Tailwind `relative`. Adding `relative` to the animated aperture element in a flexbox layout causes the CSS cascade to displace the element down by `top: 50%`, positioning the beam at the bottom of the screen instead of the vertical center.
- Dual-Mode Institutional BukSU Theming:
  1. Dark Mode: Deep obsidian backdrop (`#020617`), BukSU midnight space aperture canvas (`#071329`), Academic Gold laser flares (`#E5A823`), gold-embossed seal badge with 3D Y-axis flip (`cms-badge-pop`), and gold-to-royal-blue fluid progress shimmer track (`#F5C253` to `#1A448A`).
  2. Light Mode: Obsidian backdrop (`#0F172A`), crystalline collegiate white aperture canvas (`#FFFFFF`), BukSU Royal Blue flares (`#1A448A`), royal blue framed badge, and royal-blue-to-gold fluid progress track.
- Runbook & Checklist:
  1. Checklist: For fullScreen mode (`fullScreen={true}`), wrap in `fixed inset-0 z-50 flex items-center justify-center overflow-hidden`.
  2. Checklist: When `showLogo={false}`, render only the clean aperture pulse without text so that `container.textContent.trim() === ''` holds for minimal dashboard state changes.
  3. Checklist: When `showLogo={true}`, include the institutional seal, BukSU CMS brand header, subtitle, fluid shimmer track, status message, and CHED coordinates.
  4. Checklist: Pre-reduced motion accessibility must enforce `animation: none !important; transform: none !important; opacity: 1 !important; width: 100% !important; height: 100% !important;`.
  5. Lesson learned: Preserving size presets (`sm: h-16 w-16 / h-32 w-32`, `md: h-20 w-20 / h-48 w-48`, `lg: h-24 w-24 / h-64 w-64`) ensures 100% backward compatibility with all consuming pages (`TeamsPage`, `ArchiveSearchPage`, `App`).
  6. Evidence & Verification passed: All 5 targeted client tests in `LoadingScreen.test.jsx` passed in 206ms, 6-way Playwright visual audit generated clean screenshots (`loader_stage1_beam_expand.png`, `loader_stage2_aperture_open.png`, desktop/mobile dark/light), route parity maintained (`UNMATCHED_COUNT = 0`), 60/60 agentic validation checks passed, and workspace cleanliness guardrail passed.

58. Create Project Submission & Section ID Fallback Normalization:
- Architectural Root Cause & Mechanics:
  1. In `CreateProjectPage.jsx`, submitting candidate title proposals for committee review triggered `POST /api/projects`.
  2. When an unassigned team (such as seeded `Team Gamma`) lacks a team-level `sectionId`, the client state initialized `form.sectionId` to `""` (empty string).
  3. When clicking "Submit for Committee Review", `resolvedSectionId` passed `sectionId: ""` in the request body.
  4. In `server/modules/projects/project.validation.js`, `createProjectSchema.sectionId` was defined as `objectId.optional()`. In Zod, `""` is a string that fails regex `/^[0-9a-fA-F]{24}$/`, triggering a 400 Bad Request error `sectionId: Invalid ObjectId` before reaching the backend service layer.
  5. The backend service (`project.service.js:createProject`) already contained institutional fallback logic (`team.sectionId` -> `data.sectionId` -> `user.sectionId`). However, the Zod validation failure prevented the service from executing this fallback.
- Defensive Prevention & Multi-Tier Resolution:
  1. Backend Zod Preprocessing: Wrap `objectId.optional()` in `z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val === null ? undefined : val), objectId.optional())`. Any empty string or null is coerced to `undefined`, allowing service layer fallback hierarchy to proceed without validation errors.
  2. Client-Side Section Resolution: In `CreateProjectPage.jsx`, resolve `resolvedSectionId = teamSectionId || userSectionId || form.sectionId || undefined`. If falsy, omit `sectionId` from the payload completely (never send empty strings).
  3. Client Pre-fill & Autosave: When hydrating or pre-filling section defaults, derive `effectiveSectionId = normalizedTeamSectionId || normalizedUserSectionId` so unassigned teams automatically inherit the student's enrolled section from their profile. Pass `sectionId: form.sectionId || undefined` in manual draft saves and autosave payloads.
  4. Query Scope: In `CreateProjectPage.jsx`, use `effectiveAcademicYear = team?.academicYear || form.academicYear` for `useSections` queries so section choices hydrate immediately upon team load.
- Runbook & Checklist:
  1. Checklist: When defining optional ObjectId fields in Zod schemas (such as `sectionId`, `excludeProjectId`), always preprocess empty strings and nulls to `undefined` so optionality is honored when clients submit empty form values.
  2. Checklist: Never send empty string `""` for MongoDB ObjectIds in frontend API requests; omit the key or use `undefined`.
  3. Checklist: Ensure fallback hierarchies (`team.sectionId` -> `user.sectionId`) are mirrored on both client and server for seamless UX when students belong to newly formed teams.
  4. Lesson learned: In Mongoose/Zod architectures, empty string is not falsy in schema validation; it is a non-empty string that triggers format/regex failures unless preprocessed.
  5. Evidence & Verification passed: All 14 client tests in `CreateProjectPage.test.jsx` passed (including dedicated tests for team section, user profile section fallback, and empty string omission), all 6 server unit tests in `project.create.validation.test.js` passed, endpoint parity verified (`UNMATCHED_COUNT = 0`), 60/60 agentic validation checks passed, and pristine workspace guardrail verified.


59. Capstone 1 Title Proposal Approval Workflow & Dedicated Candidate Reveal Page (/project/approval):
- Architectural Root Cause & Mechanics:
  1. When submitting proposals for Capstone 1 title defense review, students were previously redirected back to `/project`.
  2. `MyProjectPage.jsx` checks `useMyProject()`. `useMyProject` was gated on `hasTeam = Boolean(user?.teamId)`. When a student's session user document had not re-synced `user.teamId`, `useMyProject` was disabled, causing `MyProjectPage` to render `<EmptyProjectState>` with an action button redirecting back to `/project/create` (an infinite looping trap).
  3. Furthermore, in `server/modules/projects/project.service.js:getMyProject`, if `user.teamId` was null, it threw a `404 NO_TEAM` error without checking actual team membership via `Team.findOne({ members: user._id })` (unlike `team.service.js:getMyTeam` which self-heals `user.teamId`).
  4. In `createProject`, `user.teamId` was not saved on the creator record.
  5. The institutional capstone progression required that proponents have a dedicated Title Approval Page (`/project/approval`) next to the create page where the team can reveal all candidate capstone titles they proposed, inspect 5-field blueprints, rehearsal pitch decks, similarity scores, and defense statuses before proceeding to Capstone 2.
- Multi-Tier Resolution:
  1. Backend Self-Healing: In `project.service.js:getMyProject`, added fallback check `Team.findOne({ members: user._id })` to find active team and reconcile `user.teamId`, and ensured `createProject` sets `user.teamId = team._id` on the creator.
  2. Client State & Hook Resilience: In `useProjects.js`, updated `useMyProject` query gating to `isAuthenticated && (isStudent || Boolean(user?.teamId))` and added `await fetchUser()` with query cache invalidation across `['teams']` and `projectKeys.all` in `useCreateProject`.
  3. Navigation & Routing: Registered protected route `/project/approval` in `App.jsx`, preloaded in `routePreload.js`, added header route mapping in `Header.jsx`, and redirected proposal submissions to `/project/approval`. Non-approved projects accessing `/project` automatically redirect to `/project/approval`.
  4. Dedicated Showcase & Reveal Architecture: Implemented `TitleApprovalPage.jsx` featuring:
     - 4-stage title defense progression stepper (Proposals Submitted -> Similarity Pre-Scan -> Committee Defense -> Title Approval).
     - Reveal All Proposed Capstone Titles showcase with interactive "Reveal Details" / "Hide Details" toggle per proposal card.
     - 5-field blueprint breakdown (Problem Statement, Proposed Solution, Technical Innovation, Target Users, Expected Impact).
     - Interactive 16:9 defense rehearsal presentation deck with next/previous controls, fullscreen modal preview, and PPTX/PDF export.
     - Appointed defense committee roster panel.
     - Celebratory institutional approval clearance banner with direct entry to Capstone 2 workspace when `titleStatus === 'approved'`.
- Runbook & Checklist:
  1. Checklist: For student endpoints querying by `user.teamId`, always implement the fallback `Team.findOne({ members: user._id })` to reconcile out-of-sync session tokens.
  2. Checklist: Ensure any creation mutation that links an entity to a team invalidates both `['teams']` and `['projects']` query caches and refreshes the user profile via `fetchUser()`.
  3. Checklist: Ensure widescreen presentation canvases enforce strict 16:9 aspect ratios (`aspect-video`) with space-between column layout and text input isolation.
  4. Lesson learned: Decoupling the proposal approval state (`/project/approval`) from the full execution workspace (`/project`) prevents empty-state traps and provides students with an immediate, high-fidelity defense preparation cockpit.
  5. Evidence & Verification passed: All targeted client tests in `TitleApprovalPage.test.jsx` (4/4 passed in 1.4s), `CreateProjectPage.test.jsx` (14/14 passed in 3.4s), `Header.test.jsx` (5/5 passed), and `project.create.validation.test.js` (6/6 passed) succeeded. 7-point quality battery completed with route parity (`UNMATCHED_COUNT = 0`), 60/60 agentic validation checks, zero governance errors, pristine workspace guardrails, and 8-way Playwright visual verification across desktop (1440x900) and mobile (390x844) in light and dark modes.

60. End-to-End Capstone Lifecycle Perfection (Proposal Drafting -> Archiving & Certification):
- Architectural Findings & Workflow Gaps Discovered:
  1. Tab Query-Param Race Condition on Page Refresh: In `MyProjectPage.jsx`, when loading `/project?tab=capstone_3` or `/project?tab=capstone_4`, `useEffect` triggered before `project` finished loading. `unlockedTabs` defaulted to `['capstone_1']`, causing `resolveActiveWorkflowTab` to reset the URL to `tab=capstone_1`.
  2. Student Workspace Interactive Gantt Absence: The 5-milestone `InteractiveGanttChart` was present on faculty view (`ProjectDetailPage`), but was omitted from the student's `MyProjectPage` `capstone_3` workspace tab.
  3. Action Done Matrix & Secretary Gate Omission in Capstone 4: `ActionDoneMatrixTab` was missing from `capstone_4` tabs on both `MyProjectPage` and `ProjectDetailPage`, locking out the mandatory Secretary Compliance Verification Gate (`project.admSignatures.secretary.endorsed`) and Tier 1/2/3 digital signatures for final defense.
  4. Archival Workspace Parity: Archived projects on `MyProjectPage` displayed only a static read-only banner, lacking the Official Full Manuscript PDF Reader action (`/api/archive/:id/view`), APA 7th / IEEE citation generator, and direct Completion Certificate route (`/projects/:id/certificate`).
  5. Title Status Routing & Card Display: When a title proposal was marked approved, `TitleActionsSection` displayed "Approved With Revision" due to inverted form logic in `RequestModificationForm`.
- Resolution & Implementation Details:
  1. Tab Normalization Guard: Added `if (isLoading || !project) return;` to `MyProjectPage.jsx` `useEffect`, ensuring tabs retain active query parameters on refresh and direct deep-links.
  2. Interactive Gantt Parity: Mounted `<InteractiveGanttChart project={project} isReadOnly={false} />` in `MyProjectPage.jsx` `TabsContent value="capstone_3"`.
  3. Action Done Matrix in Capstone 4: Mounted `<ActionDoneMatrixTab project={project} isStudent user={user} onRefresh={() => refetch()} />` in `MyProjectPage.jsx` `TabsContent value="capstone_4"` and in `ProjectDetailPage.jsx` for faculty.
  4. Archival Document Package: Integrated manuscript reader PDF action, APA 7th / IEEE dynamic citations (via shared `formatCitation` utility in `projectDetailUtils.js`), and View Certificate button on `MyProjectPage.jsx` for archived projects.
  5. Approved Title Card: Created dedicated `ApprovedTitleCard` in `TitleWorkflowCards.jsx` with collapsible modification form and connected `TITLE_STATUSES.APPROVED`.
- Prevention, Runbook & Checklist:
  1. Prevention rule: In multi-tab workflow SPAs with URL query parameter syncing (`searchParams`), always guard URL rewrite side-effects against initial loading/fetching states to avoid overwriting user deep links with default tabs.
  2. Prevention rule: Every capstone phase tab in student workspaces must maintain full functional parity with faculty views (e.g. interactive Gantt charts, Action Done Matrices, evaluation panels).
  3. Runbook & Checklist:
     - Checklist: Verify that `ActionDoneMatrixTab` is mounted in both Capstone 2 (ADM v1), Capstone 3 (ADM v2), and Capstone 4 (ADM v3 + Secretary Compliance Gate).
     - Checklist: When updating archival states, ensure students and faculty have access to official manuscript readers, academic citation generators, and downloadable completion certificates.
  4. Lesson learned: Systematic Playwright end-to-end visual feedback loops covering every sequential lifecycle phase (1 through 6) detect subtle multi-tab state desynchronizations that isolated unit tests cannot catch.
61. Capstone Milestone Stepper Redesign, Tactile Workflow CTAs & Dark Mode Resilience:
- Architectural Findings & UI/UX Gaps Discovered:
  1. Clunky Progress Stepper: The original `CapstoneWorkflowStepper.jsx` was composed of 5 cramped, isolated cards wrapped in redundant double borders. The visual rhythm was broken and confusing, lacking a continuous progression line, completion percentage, or clear distinction between completed, active, and upcoming milestones.
  2. Duplicate Steppers in Proposal Tab: `ProposalTab.jsx` rendered a duplicate `WorkflowPhaseTracker` inside its inner proposal card header, creating cognitive noise and competing visual anchors.
  3. Dark Mode Regressions in Submissions: `FinalPaperUpload.jsx` contained hardcoded `color-mix(..., white)` and raw CSS variables (`var(--color-surface)`), causing white text on white backgrounds and border inversion when switching to dark mode.
  4. Passive Lifecycle Cards: `NextStepCard.jsx` only supported early proposal states, failing to provide proactive action guidance or direct CTA buttons for Capstone 3 (Gantt roadmap), Capstone 4 (Secretary Gate & final paper), or Archiving.
  5. Mobile Sidebar Viewport Collision: When collapsed on mobile screens (390x844), the desktop icon-rail (`w-[76px]`) occupied ~20% of the horizontal screen real estate, truncating milestone titles and progress bars.
- Resolution & Implementation Details:
  1. Continuous Milestone Pipeline: Redesigned `CapstoneWorkflowStepper.jsx` into a unified progress tracker featuring an active milestone badge (`Current: Phase X`), live completion percentage (`60% Completed`), an emerald-to-primary gradient connecting track, and prominent circular milestone nodes (emerald checkmark for completed, pulsing ring for active, muted lock for upcoming) with keyboard and click navigation.
  2. Nested Card Elimination: Removed redundant card containers around `WorkflowPhaseTracker` in `MyProjectPage.jsx` and `ProjectDetailPage.jsx`, and removed the duplicate tracker inside `ProposalTab.jsx`.
  3. Design Token Standardization: Refactored `FinalPaperUpload.jsx` to standard Tailwind CSS variables (`bg-card`, `text-foreground`, `border-border/60`), ensuring flawless dark mode contrast.
  4. Lifecycle-Aware NextStepCard: Expanded `NextStepCard.jsx` to cover all 5 phases with dynamic CTA buttons (`View Submissions`, `View Gantt Roadmap`, `Open Action Done Matrix`, `View Certificate`). Added inline chapter upload buttons to `ChapterProgressWithRounds.jsx`.
  5. Responsive Drawer Collapse: Updated `DashboardLayout.jsx` and `Sidebar.jsx` so that viewports under 1024px automatically collapse the sidebar to `hidden md:flex`, expanding to a floating drawer overlay (`fixed inset-y-0 left-0 z-50`) only when explicitly toggled.
- Prevention, Runbook & Checklist:
  1. Prevention rule: Never use `color-mix(in srgb, ..., white)` or raw hex color literals in UI components; always use design system semantic tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border/60`).
  2. Prevention rule: Steppers and milestone trackers must function as both status indicators and interactive navigation triggers (`role="button"`, `tabIndex={0}`, `onKeyDown`), updating active tabs directly without forcing users to hunt for tab headers.
  3. Prevention rule: Dashboard sidebars on mobile viewports (<1024px) must collapse completely out of document flow (`hidden md:flex`) to preserve 100% width for critical workspace cards and tables.
  4. Runbook & Checklist:
     - Checklist: Verify milestone stepper nodes have distinct accessibility labels (`aria-current="step"`, `aria-label`).
     - Checklist: Test all submission upload cards in both light and dark modes to guarantee WCAG AAA contrast.
     - Checklist: Verify mobile viewport layout (390x844) renders without horizontal clipping or squished columns.
  5. Evidence & Verification passed: 9/9 client component test suites passed (43/43 tests), 7/7 page test suites passed (33/33 tests), layout tests passed (13/13 tests), full 6-stage Playwright lifecycle audit passed with 0 errors across desktop (1440x900) and mobile (390x844) in dark mode, API route parity verified (`UNMATCHED_COUNT = 0`), and agentic system audit passed (60/60 checks).

## Test Fixture Notes
- Submission chapter-upload integration fixtures must include at least one assigned panelist on the project in Capstone phase 1, otherwise uploads fail with PANELISTS_NOT_ASSIGNED before other assertions.



