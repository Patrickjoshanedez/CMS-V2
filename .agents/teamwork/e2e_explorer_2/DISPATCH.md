# DISPATCH — e2e_explorer_2

## Mission: Anti-Simulation Playwright Harness Architecture
- **Role**: Playwright Harness Investigator (`teamwork_explorer`)
- **Parent Conversation ID**: 1d510dcc-9499-4a34-9b6f-1193ae141e8b
- **State Folder**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_explorer_2\
- **Working Directory**: c:\Users\patri\dev\CMS-V2
- **Original Request**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- **Sub-Orchestrator Scope**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_e2e\SCOPE.md
- **Prior Survey Report**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_3\survey_report.md

## Objectives:
1. Read `ORIGINAL_REQUEST.md` and prior survey findings in `survey_explorer_3/survey_report.md`.
2. Inspect existing test runner scripts in `scripts/` (`e2e-capstone-core-scenarios.js`, `qa-test-runner.js`, `test-all-roles-browser.mjs`, `scripts/seed_demo_state.js`, etc.) and client auth flow in `client/src/stores/authStore.js` and `client/src/App.jsx`.
3. Identify:
   - Specific lines where simulated finishes or false passes occur (e.g. status 'Pass' pushed without DOM assertion).
   - Networkidle hang locations and fix strategy using `waitUntil: 'domcontentloaded'`.
   - Hydration race conditions and skeleton settle wait logic (`waitForSelector('text=Initializing session...', { state: 'detached' })`).
   - Browser context isolation per role persona.
   - 110s watchdog timeout and process exit cleanup.
4. Architect the complete implementation specification for `scripts/qa-browser-e2e.mjs` (the standalone anti-simulation Playwright runner).
5. Output your analysis to `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_explorer_2\harness_analysis.md` and write your `handoff.md`. Notify parent when complete.


## 2026-11-13T17:53:23Z
You are e2e_explorer_2. State folder: c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_explorer_2\. Read c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md, c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md, c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_e2e\SCOPE.md, and your instructions in c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_explorer_2\DISPATCH.md. Investigate existing test runner scripts and client auth flow. Architect the complete implementation specification for scripts/qa-browser-e2e.mjs eliminating simulation, networkidle hangs, and hydration races. Output your analysis report to c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_explorer_2\harness_analysis.md and write your handoff.md. Report back via send_message to 1d510dcc-9499-4a34-9b6f-1193ae141e8b.
