---
name: verification-loop
version: 1.4.0
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
