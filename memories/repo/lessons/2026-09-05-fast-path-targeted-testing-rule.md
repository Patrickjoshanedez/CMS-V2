# Lesson: Fast-Path Targeted Testing Directive and Verification Strategy

## Incident & Problem Context
In BukSU CMS-V2, as the application grew to 43+ frontend test suites (161 tests) and comprehensive 13-stage server workflow suites, executing the full test command `npm test --workspace=client` took upwards of 96–120 seconds due to Vite JSDOM environment reinitialization per test file. Running the full test suite repeatedly during minor iterative development steps created painful waiting delays, token wastage, and risks of watchdog timeout interruptions. The user explicitly instructed:
> *"the problem I'am facing soetimes is this, it takes a very long time to finish the test there should be a way like targeted test to speed things up, add this to the rules"*

## Key Lessons Learned
1. **Targeted Testing Slashing Latency by >90%**: Running targeted tests (`npm test --workspace=client -- <target-test-path>`) executes in only 1–5 seconds compared to 96+ seconds for the full 43-suite run.
2. **Two-Tier Verification Strategy**:
   - **Tier 1 (Iteration / Fast-Path)**: Execute targeted test suites covering the modified files (e.g. `npm test --workspace=client -- src/pages/projects/CreateProjectPage.test.jsx`).
   - **Tier 2 (Closure / Comprehensive Gate)**: Run full batteries (`npm test --workspace=client`, server workflows, `check:endpoints`, `validate:governance`, `workspace_guardrail.py`) only before final task sign-off.
3. **Dedicated NPM Workspace Shortcuts**: Adding `"test:client": "npm test --workspace=client --"` and `"test:server": "npm test --workspace=server --"` in root `package.json` makes targeted test execution ergonomic from anywhere in the repository.

## Prevention Guidelines
- **Avoid Monolithic Suite Invocation During Debugging**: Never invoke `npm test --workspace=client` to verify a 2-line styling or logic change in a single component.
- **Pass Arguments Across Workspace Boundary**: Use `--` to forward path arguments to Vitest (e.g. `npm test --workspace=client -- src/components/projects/`).

## Runbook for Fast-Path Verification
1. **Identify Modified Scope**: Determine which page, component, or service was updated.
2. **Execute Targeted Test**:
   ```bash
   # Client:
   npm test --workspace=client -- src/pages/projects/CreateProjectPage.test.jsx
   # Or using shortcut:
   npm run test:client -- src/components/projects/AlignmentSelectorDialog.test.jsx

   # Server:
   npm test --workspace=server -- tests/unit/<module>.test.js
   ```
3. **Iterate Rapidly**: Keep development loops within 1–5 second cycle times.
4. **Final Gate Verification**: When all targeted tests pass and work is complete, trigger the full quality verification battery.

## Verification Checklist
- [x] `AGENTS.md` Section 5 updated with Fast-Path Targeted Testing Protocol.
- [x] `AGENTS.md` Section 9 updated with Directive 7: Targeted Testing First.
- [x] `AGENTS.md` Section 10 annotated with Fast-Path vs Full Gate options.
- [x] `GEMINI.md` updated with Targeted Testing First rule under Operational Directives.
- [x] `.agents/rules/workspace-rules.md` Section 4 updated with Fast-Path commands.
- [x] `verification-loop` skill updated with targeted testing focus area and triggers.
- [x] Root `package.json` enhanced with `test:client` and `test:server` scripts.
- [x] `memories/repo/CMS-V2-Technical-Context.md` updated with Rule 39.
