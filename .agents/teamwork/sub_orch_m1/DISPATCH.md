# DISPATCH — sub_orch_m1

## Mission: Milestone 1 — Paper Deliverables & Printing Format Integration (R3)

- **Role**: Milestone 1 Sub-Orchestrator (`self`)
- **Parent Conversation ID**: ed92d340-7260-43d5-8952-0ac19a527b4f
- **State Folder**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m1\
- **Working Directory**: c:\Users\patri\dev\CMS-V2
- **Original Request File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- **Relevant Survey Findings**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_1\survey_report.md

## Scope & Target Deliverables:
1. **Expose Final Approval Sheet in UI (Feature 1)**:
   - Connect backend endpoint `GET /api/projects/:id/approval-sheet` (available via `authService.getApprovalSheetUrl` or direct API download) to `CertificatePage.jsx`, `ActionDoneMatrixTab.jsx`, and `ProjectSubmissionsPage.jsx`.
   - Provide clear button/card with Print, Download, and View actions.
2. **Document Reader Print Handling (Feature 2)**:
   - In `client/src/components/documents/SophisticatedDocumentViewer.jsx`, add a dedicated Print button in the toolbar.
   - Implement unrolled print styles so the document container resets `overflow: visible; height: auto; max-height: none; zoom: 1;` under `@media print`, allowing full multi-page document printing without gray background or UI chrome.
3. **Plagiarism Report Print Stylesheet (Feature 3)**:
   - In `client/src/pages/submissions/PlagiarismReportPage.jsx`, add `@media print` rules and `print:hidden` classes to hide action ribbons, filter bars, sliders, and navigation tabs.
   - Unroll the side-by-side manuscript container (`maxHeight: '76vh'` -> `maxHeight: 'none'`, `overflow: 'visible'`) for clean physical printing.
4. **Radix Dialog Print Unrolling (Feature 4)**:
   - In `client/src/components/ui/Dialog.jsx` and `client/src/index.css`, ensure `[role="dialog"]` and `DialogOverlay` do not dark-tint or clip at `90vh` on print.
   - In `client/src/components/defense/LiveDefenseMinutesModal.jsx`, ensure defense minutes print unrolled across multiple pages.
5. **Printable Evaluation Rubric Scoresheet (Feature 5)**:
   - In `client/src/components/projects/EvaluationPanel.jsx`, provide a printable scoresheet format for defense panel scoring records.
6. **Global Print Stylesheet Polish (Feature 6)**:
   - In `client/src/index.css`, configure standard `@page { margin: 1in; size: letter portrait; }`, unroll `.docx-outer-container`, and ensure black-on-white print contrast.

## Exclusive File Boundaries:
- `client/src/components/documents/SophisticatedDocumentViewer.jsx`
- `client/src/pages/submissions/PlagiarismReportPage.jsx`
- `client/src/components/ui/Dialog.jsx`
- `client/src/index.css`
- `client/src/pages/CertificatePage.jsx`
- `client/src/pages/projects/ProjectSubmissionsPage.jsx`
- `client/src/components/projects/EvaluationPanel.jsx`
- `client/src/components/defense/LiveDefenseMinutesModal.jsx`

## Procedure:
Follow the Sub-orchestrator procedure:
1. Initialize your `SCOPE.md`, `BRIEFING.md`, and `progress.md` in your state folder.
2. Execute the Iteration Loop (2B):
   - a. Spawn Explorer (`teamwork_explorer`) to analyze exact AST locations and diffs.
   - b. Spawn Worker (`teamwork_worker`) with the mandatory integrity warning to implement the changes and run targeted tests (`npm test --workspace=client -- <target>`).
   - c. Spawn 2 Reviewers (`teamwork_reviewer`) independently to inspect correctness and print fidelity.
   - d. Spawn 2 Challengers (`teamwork_challenger`) to empirically verify print rendering and tests.
   - e. Spawn Forensic Auditor (`teamwork_auditor`) for integrity verification.
   - f. Evaluate Gate in `GATE_STATUS.md`.
3. When gate passes, write your `handoff.md` and notify parent via `send_message`.


## 2026-11-13T17:48:35Z
You are sub_orch_m1. Read your instructions in c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m1\DISPATCH.md and c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md.
Execute Milestone 1 (Paper Deliverables & Printing Format Integration). Maintain your SCOPE.md, BRIEFING.md, and progress.md in c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m1\. Run the 2B iteration loop (Explorer -> Worker -> Reviewers -> Challengers -> Forensic Auditor). When the gate passes, send your completion handoff report to your parent orchestrator via send_message.
