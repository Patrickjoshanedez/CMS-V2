# DISPATCH — sub_orch_m3

## Mission: Milestone 3 — Workflow Integrity, Role Exclusions & Test Fixture Hardening (R2)

- **Role**: Milestone 3 Sub-Orchestrator (`self`)
- **Parent Conversation ID**: ed92d340-7260-43d5-8952-0ac19a527b4f
- **State Folder**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m3\
- **Working Directory**: c:\Users\patri\dev\CMS-V2
- **Original Request File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- **Relevant Survey Findings**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_2\survey_report.md

## Scope & Target Deliverables:
1. **Fix `CreateProjectPage.test.jsx` Test Fixture (Feature 12)**:
   - In `client/src/pages/projects/CreateProjectPage.test.jsx:1071`, add missing `pitchDeck` fields (`objectives`, `technicalStack`) to the mock project state in edit mode.
   - Ensure the test's `fillRequiredProposalDetails` helper triggers React change events properly.
   - Verify that all 20 tests in `CreateProjectPage.test.jsx` pass (`npm test --workspace=client -- src/pages/projects/CreateProjectPage.test.jsx`).
2. **Workflow Integrity & Role Navigation Verification (Feature 13)**:
   - Verify that all role-specific navigation menus and pages (Student, Instructor, Faculty: Adviser, Secretary, Panelist, Chair, Dean) render cleanly without unhandled exceptions or 4xx/5xx API calls.
3. **Secretary ADM Gate UI Indicators (Feature 14)**:
   - Verify that the Secretary compliance verification banner and lock indicators in `ActionDoneMatrixTab.jsx` accurately reflect `project.admSignatures.secretary.endorsed`.

## Exclusive File Boundaries:
- `client/src/pages/projects/CreateProjectPage.test.jsx`
- `client/src/pages/projects/CreateProjectPage.jsx`

## Procedure:
Follow the Sub-orchestrator procedure:
1. Initialize your `SCOPE.md`, `BRIEFING.md`, and `progress.md` in your state folder.
2. Execute the Iteration Loop (2B):
   - a. Spawn Explorer (`teamwork_explorer`) to inspect `CreateProjectPage.test.jsx` failure.
   - b. Spawn Worker (`teamwork_worker`) with the mandatory integrity warning to apply the fixture fix and run targeted client tests.
   - c. Spawn 2 Reviewers (`teamwork_reviewer`) independently to inspect test validity.
   - d. Spawn 2 Challengers (`teamwork_challenger`) to verify tests.
   - e. Spawn Forensic Auditor (`teamwork_auditor`) for integrity verification.
   - f. Evaluate Gate in `GATE_STATUS.md`.
3. When gate passes, write your `handoff.md` and notify parent via `send_message`.


## 2026-11-13T17:48:53Z
You are sub_orch_m3. Read your instructions in c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m3\DISPATCH.md and c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md.
Execute Milestone 3 (Workflow Integrity, Role Exclusions & Test Fixture Hardening). Maintain your SCOPE.md, BRIEFING.md, and progress.md in c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m3\. Run the 2B iteration loop (Explorer -> Worker -> Reviewers -> Challengers -> Forensic Auditor). When the gate passes, send your completion handoff report to your parent orchestrator via send_message.
