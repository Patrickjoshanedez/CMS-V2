# DISPATCH — e2e_worker_1

## Mission: Anti-Simulation Playwright E2E Harness & Test Suite Implementation
- **Role**: E2E Test Implementer (`teamwork_worker`)
- **Parent Conversation ID**: 1d510dcc-9499-4a34-9b6f-1193ae141e8b
- **State Folder**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_worker_1\
- **Working Directory**: c:\Users\patri\dev\CMS-V2
- **Original Request**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- **Sub-Orchestrator Scope**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_e2e\SCOPE.md

## Reference Specification Artifacts:
1. `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_test_writer_1\test_suite_design.md` (ISO 29119-3 4-Tier Test Cases: 52 test cases)
2. `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_explorer_2\harness_analysis.md` (Anti-simulation Playwright harness architecture)
3. `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_spec_miner_3\dom_verification_checkpoints.md` (DOM selectors & API contracts)

## File Boundaries & Write Ownership:
You own exclusively:
- `scripts/qa-browser-e2e.mjs`
- `TEST_INFRA.md` (at project root)
- `TEST_READY.md` (at project root)
- `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_worker_1\`

## Objectives & Tasks:
1. Implement `scripts/qa-browser-e2e.mjs` as a production-grade, anti-simulation Playwright E2E test runner supporting all 52 test cases across Tiers 1–4:
   - Tier 1: 17 Feature Coverage tests (UI scaling, print unrolling, deliverables, role flows).
   - Tier 2: 25 Boundary & Corner tests (empty inputs, bounds, unauthorized routes, committee exclusions, workflow gates).
   - Tier 3: 5 Cross-Feature interaction tests (cascading state transitions).
   - Tier 4: 5 Real-World application scenarios covering all 11 dedicated seed accounts from Phase 0 to Phase 4 (14 scenario sub-steps).
2. Enforce strict anti-simulation invariants:
   - Zero synthetic passes, zero URL-only fallbacks, zero slicing expected strings without assertion.
   - Mandatory `networkidle` elimination (use `waitUntil: 'domcontentloaded'`).
   - Session hydration handling (`waitForSelector('text=Initializing session...', { state: 'detached' })`).
   - Browser context isolation per persona.
   - 110s unref'd watchdog timer with guaranteed `browser.close()` in finally blocks.
   - Support CLI arguments: `--tier=1`, `--tier=2`, `--tier=3`, `--tier=4`, `--all`, `--dry-run`, `--headless`.
3. Create `TEST_INFRA.md` at project root with full documentation of test philosophy, architecture, runner usage, and coverage.
4. Create `TEST_READY.md` at project root with runner command, test counts per tier, and complete feature checklist.
5. Verify your implementation by running syntax checks (`node --check scripts/qa-browser-e2e.mjs`) and any necessary verification.
6. Write your `handoff.md` and report back to parent orchestrator.

## MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-11-13T18:17:15Z
Received dispatch message:
You are e2e_worker_1. State folder: c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_worker_1\.
Read your instructions in DISPATCH.md, ORIGINAL_REQUEST.md, PROJECT.md, and SCOPE.md.
Also read reference specifications and automated-qa-tester SKILL.md.
Implement scripts/qa-browser-e2e.mjs, publish TEST_INFRA.md and TEST_READY.md at project root, verify syntax and execution, write your handoff.md, and report back via send_message to 1d510dcc-9499-4a34-9b6f-1193ae141e8b.
