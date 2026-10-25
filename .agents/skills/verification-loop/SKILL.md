---
name: verification-loop
version: 1.6.5
schema-version: 1
description: Verification-first loop for test, lint, runtime, Playwright visual feedback, and evidence checks before declaring completion.
---

# Verification Loop

Use this skill for tasks where correctness must be proven, not assumed.

## Focus Areas
- Rule 0: Chat-Starter Preflight Snapshot verification before chat or action
- Fast-Path Targeted Testing (1–5s feedback) during active code iteration
- Playwright Visual Feedback Loop (light/dark mode, desktop/mobile) for all UI/UX work
- Docker Container Dependency Sync (`cms-client` / `cms-server-prod`) and Vite error overlay detection
- Test and lint gates for each meaningful change
- Runtime validation of critical paths
- Evidence mapping between claims and outputs
- Comprehensive quality gates before final task completion

## Fast-Path Targeted Testing Pattern
```bash
# Target only the relevant test file:
npm test --workspace=client -- <test-file-path>
# Or targeted server test:
npm test --workspace=server -- <test-file-path>
```

## Windows Isolated Vitest Recovery

When a Windows sandbox reports `EPERM` while Vitest renames a temporary SSR cache file, redirect only the test process temp directory to the approved workspace scratch area before retrying the same targeted suite. This can affect either client or server tests and may occur before any assertions run:

```powershell
$env:TEMP = Join-Path (Get-Location) 'scratch/vitest-tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null
npm test --workspace=server -- <target-test-file>
npm test --workspace=client -- <target-test-file>
```

Confirm the initial run failed before test execution, then retry only the affected suite with the isolated temp path. Keep generated temp files under `scratch/` and clean them only after the test process has exited.

If the isolated `MongoMemoryServer` fixture then fails with `EACCES` on `127.0.0.1`, treat it as a sandbox loopback restriction, not an application failure. Request approved loopback access for that targeted test only; never redirect a test suite to the running application's database. Keep each server suite separate when a multi-file run gives no progress, and stop any still-running test at the repository's 120-second watchdog. Diagnose and confirm worker cleanup before another attempt.

For multi-file React suites containing Radix portals, keep Vitest file isolation enabled even when using a single worker. `--no-isolate` can leave document-level portal content between test files and produce duplicate accessible labels; use it only for a focused single-file workaround with a completed assertion summary.

Before retrying a stalled MongoMemoryServer suite, check that a compatible `mongod` binary exists in the configured MongoMemoryServer cache or local path. An empty binary cache can leave the runner in startup before assertions. Keep any diagnostic cache inside `scratch/`; if the runner makes no progress, stop it before 120 seconds, inspect the cache, and confirm no test or `mongod` process remains. Do not repeat the same unchanged startup attempt or redirect it to the application database.

For a large client suite that exceeds the watchdog, use Vitest `--shard=N/M` to partition the same complete suite, keep one shard process at a time on Windows, and give each shard its own workspace-local `TEMP`/`TMP` folder. Parallel shards may contend for CPU, module transforms, or temporary cache files. Record only terminal shard summaries as passes, account for every shard, and verify all expected test files are covered before declaring the full suite complete.

## Docker Container Dependency Sync Pattern
```bash
# When installing new packages, sync both host and container:
npm install --workspace=client <pkg>
docker exec cms-client npm install --workspace=client <pkg>
docker restart cms-client
```

## Playwright Visual Feedback Pattern (UI/UX Tasks)
```bash
# Execute visual feedback script to capture screenshots across viewports & themes:
node scratch/<feature>_audit.mjs
# Inspect scratch/screenshots/ for alignment, jitter, overflow, and contrast fidelity.
# Ensure visual script listens for pageerror and console errors to detect Vite import overlays.
```

When an audit harness mounts a component that calls TanStack Query hooks, create a dedicated QueryClient and wrap the rendered tree in QueryClientProvider. Intercept the component API reads with deterministic synthetic responses via page.route, and confirm the mocked request and expected state appear before capturing. A blank page with No QueryClient set indicates a harness setup failure; add the provider and rerun the same audit before diagnosing the product UI.

For canonical reader migration audits, include a file-only consumer with no submission record and open its metadata Sheet: portaled content expressions can evaluate before the Sheet opens. Do not repair the fixture by inventing a submission if the public component supports file-only usage. For sidebar tooltip fixtures, distinguish ordinary items from navigation groups; group-only test IDs do not select ordinary item tooltips. Inspect the current consumer and target its actual visible Radix popper wrapper, using keyboard focus when recording a focus state.

For white institutional paper, inspect functional no-print controls in their production route as well as the paper component fixture. Global paper text selectors may intentionally exclude no-print elements, leaving dark-theme foreground variables on a white or pale background. Use the scoped paper-ui semantic palette and confirm inherited button overrides do not replace shared Button text colors. Compute contrast against composited ancestor backgrounds, include element opacity, and report disabled controls separately from the 4.5:1 non-disabled text requirement.

When a full lint run reaches the watchdog without output, capture a bounded ESLint debug log before retrying. Distinguish gradual file processing from a stuck file or worker-start failure. Preserve the configured rule set and full target scope; a final cached full-scope result is valid only when ESLint validates current file metadata/configuration and reports zero errors. Record the executable/runtime, full file count, warnings, exit code and duration. Do not count an aborted cold or worker run as a pass.

Derive visual evidence totals from a deduplicated screenshot catalog, not manual constants or the number of module references. Verify every counted file exists and is a valid PNG; keep pixel dimensions separate from CSS viewport dimensions. Link supplemental captures explicitly so an older inline review note cannot silently become a counted file. Correct stale counts rather than carrying them forward. A complete file catalog still does not prove exhaustive states or final-source visual fidelity.

For bounded final test shards, retain file isolation and store a source fingerprint with each result. Aggregate only passing shards from the same fingerprint, verify the expected test-file set against the union of reported files, and reject duplicate or missing files before claiming full-suite success. Keep timed-out attempts separate. If an isolated MongoMemoryServer suite produces no report, enable setup diagnostics before retrying; count only a completed zero-exit result.

When running independent shards concurrently, write each summary to its own file and update shared aggregate/latest JSON through a temporary file plus atomic rename. After all processes finish, independently re-read all reports, recompute source fingerprints, verify every expected test file appears exactly once, and reject failed or pending assertions. Do not rely solely on the last worker's progress aggregate.

Before treating a preview timeout as a continuing network blocker, inspect the current cms-client container state. Read its startup command before restoring an existing stopped development client; a verified Vite-only command can be started within an authorized UI task. Then check HTTP reachability and compare every installed direct client dependency against the lockfile. HTTP 200 and dependency parity do not replace a rendered-page audit. Keep new audit shard outputs separate from an existing reconciled evidence catalog so an older writer cannot restore stale manual counts.

Do not treat a Vite `ready` banner as proof that the desktop browser can reach the preview. Verify a listening TCP socket and an HTTP response from the same network context the browser uses before opening a route. If the preview process is isolated from the browser, serve the current production `dist/` bundle from a bounded local HTTP server inside the Playwright audit process; bind only to loopback, intercept API requests locally, and block all non-GET calls except a synthetic auth request when specifically testing its error state. Use an origin included in the built Google sign-in allowlist or the page may render a misleading origin-warning state. Record component/production-bundle captures separately from route-integrated authenticated workflow captures.

For stable screenshots of Radix dialogs and other animated surfaces, wait until the opening animation finishes. Also measure critical geometry while the animation is active whenever the acceptance criteria include viewport containment or overlays: Radix zoom keyframes own `transform` and can mask or replace transform-based centering. Assert the dialog bounding rectangle stays within the viewport during and after animation; prefer an independent CSS `translate` property for fixed centering. For the stable capture point, `page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].every((element) => element.getAnimations().every((animation) => animation.playState === 'finished')))` waits for the open transition to finish.


For live route captures, body text length and session readiness do not establish loaded content. Wait for route-specific loaded landmarks and the disappearance of its loading placeholder before accepting a loaded-state screenshot; label deliberate skeleton captures separately. Keep Socket.IO transport failures visible as runtime findings rather than silently dropping them from failed-response checks. Review actual screenshots before treating a successful automation exit as visual acceptance.

## Usage Triggers
- "verify"
- "prove it works"
- "run tests"
- "targeted test"
- "playwright feedback"
- "chat starter"
- "quality gate"
- "pre-final audit"
