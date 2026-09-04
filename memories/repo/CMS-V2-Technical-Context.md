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

## Test Fixture Notes
- Submission chapter-upload integration fixtures must include at least one assigned panelist on the project in Capstone phase 1, otherwise uploads fail with PANELISTS_NOT_ASSIGNED before other assertions.



