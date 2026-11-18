# DISPATCH — sub_orch_e2e

## Mission: E2E Testing Track — Test Suite Creation & Infrastructure (Dual Track)

- **Role**: E2E Testing Orchestrator (`self`)
- **Parent Conversation ID**: ed92d340-7260-43d5-8952-0ac19a527b4f
- **State Folder**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_e2e\
- **Working Directory**: c:\Users\patri\dev\CMS-V2
- **Original Request File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- **Relevant Survey Findings**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_3\survey_report.md

## Scope & Target Deliverables:
1. **`TEST_INFRA.md` Publication**:
   - Create `TEST_INFRA.md` at project root using the specification template (Test Philosophy: Opaque-box, requirement-driven, 4-tier methodology, feature inventory, runner commands).
2. **Comprehensive 4-Tier Test Suite Architecture**:
   - Tier 1: Feature Coverage (>=5 test cases per feature across UI redesign, deliverables, role workflows, and printing).
   - Tier 2: Boundary & Corner Cases (>=5 test cases per feature: empty inputs, max lengths, unauthorized routes, role exclusion checks).
   - Tier 3: Cross-Feature Combinations (pairwise coverage of major feature interactions, e.g. Student proposal -> Instructor approval -> Committee assignment -> Chapter upload -> Adviser endorsement -> Defense evaluation -> Secretary ADM endorsement -> Multi-tier signatures).
   - Tier 4: Real-World Application Scenarios (>=5 realistic application scenarios covering the full capstone lifecycle from Phase 0 to Phase 4).
3. **Anti-Simulation Playwright Harness**:
   - Build upon the verified patterns identified in `survey_explorer_3`:
     - Mandatory `networkidle` elimination (use `waitUntil: 'domcontentloaded'`).
     - Session hydration handling (`waitForSelector('text=Initializing session...', { state: 'detached' })`).
     - Hard safety watchdog timeouts (110s).
     - Isolated browser contexts per persona.
     - Real DOM assertions (no hardcoded 'Pass' strings).
4. **`TEST_READY.md` Publication**:
   - Publish `TEST_READY.md` at project root with runner command, test counts per tier, and feature checklist.

## Exclusive File Boundaries:
- `TEST_INFRA.md`
- `TEST_READY.md`
- `scripts/qa-browser-e2e.mjs` or `tests/e2e/`
- `.agents/teamwork/sub_orch_e2e/`

## Procedure:
Follow the Orchestrator procedure:
1. Initialize your `SCOPE.md`, `BRIEFING.md`, and `progress.md` in your state folder.
2. Execute the test creation iterations:
   - a. Spawn `teamwork_test_writer` or `teamwork_explorer` to structure test cases from user requirements.
   - b. Spawn Worker (`teamwork_worker`) to implement the test runner and suites.
   - c. Spawn Reviewers (`teamwork_reviewer`) to verify opaque-box compliance and anti-simulation rules.
   - d. Spawn Challengers (`teamwork_challenger`) and Forensic Auditor (`teamwork_auditor`).
3. Publish `TEST_READY.md`, write your `handoff.md`, and notify parent via `send_message`.


## 2026-11-13T17:49:22Z
[Message from parent ed92d340-7260-43d5-8952-0ac19a527b4f]: You are sub_orch_e2e. Read your instructions in c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_e2e\DISPATCH.md and c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md. Execute the E2E Testing Track (Test infrastructure setup, 4-tier test case hierarchy Tiers 1-4, anti-simulation Playwright harness). Publish TEST_INFRA.md and TEST_READY.md at project root. Maintain your SCOPE.md, BRIEFING.md, and progress.md in c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_e2e\. When the test suite is ready, notify your parent orchestrator via send_message.
