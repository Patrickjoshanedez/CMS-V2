---
name: verification-loop
version: 1.6.2
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


## Usage Triggers
- "verify"
- "prove it works"
- "run tests"
- "targeted test"
- "playwright feedback"
- "chat starter"
- "quality gate"
- "pre-final audit"
