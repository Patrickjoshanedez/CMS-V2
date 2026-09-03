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

## Test Fixture Notes
- Submission chapter-upload integration fixtures must include at least one assigned panelist on the project in Capstone phase 1, otherwise uploads fail with PANELISTS_NOT_ASSIGNED before other assertions.
