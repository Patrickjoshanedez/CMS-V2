# DISPATCH — Explorer 1 (Milestone 1)

## Role & Mission
- Role: Codebase Researcher (`teamwork_explorer`)
- Working Directory: c:\Users\patri\dev\CMS-V2
- State Folder: c:\Users\patri\dev\CMS-V2\.agents\teamwork\teamwork_explorer_m1_1\
- Original Request File: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- Project Scope File: c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- Milestone Scope File: c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m1\SCOPE.md

## Target Investigation Tasks:
1. **Feature 1: Expose Final Approval Sheet in UI**
   - Investigate backend endpoint `GET /api/projects/:id/approval-sheet` and its client wrapper `authService.getApprovalSheetUrl` in `client/src/services/authService.js`.
   - Check if a hook `useApprovalSheetUrl` exists or should be added in `client/src/hooks/useProjects.js`.
   - Inspect `client/src/pages/CertificatePage.jsx`, `client/src/components/projects/ActionDoneMatrixTab.jsx`, and `client/src/pages/projects/ProjectSubmissionsPage.jsx`.
   - Determine exact AST insertion points, button/card UI presentation (View in `SophisticatedDocumentViewer`, Download, Print), and access conditions (e.g., when project is completed/archived or Tier 3 signatures complete).
2. **Feature 2: Document Reader Print Handling**
   - Inspect `client/src/components/documents/SophisticatedDocumentViewer.jsx`.
   - Find the exact location in the toolbar to add a Print button (`Printer` icon, tooltip, `onClick={() => window.print()}`).
   - Analyze the document containers (`overflow-auto`, `docx-zoom-wrapper`, `docx-outer-container`) and determine the exact CSS class changes and `@media print` styles needed so the multi-page document unrolls without scrollbars, clipping, or background tinting.

## Output Requirements:
Write your structured findings to `c:\Users\patri\dev\CMS-V2\.agents\teamwork\teamwork_explorer_m1_1\handoff.md`. Include exact file paths, line numbers, current code snippets, proposed replacement diffs, and verification steps.
Send a message back to sub_orch_m1 when done.


## 2026-11-13T17:51:03Z
[Message] sender=e3f60e4d-7f0a-4d64-bb81-9c38d8cbf017 priority=MESSAGE_PRIORITY_HIGH content=You are teamwork_explorer_m1_1. Read your instructions in c:\Users\patri\dev\CMS-V2\.agents\teamwork\teamwork_explorer_m1_1\DISPATCH.md.
Also read c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md and c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m1\SCOPE.md.
Your task is to investigate Feature 1 (Expose Final Approval Sheet in UI) and Feature 2 (SophisticatedDocumentViewer Print Handling).
Locate the exact files, line numbers, current implementations, and specify exact AST replacement code and diffs.
Write your complete findings and report to c:\Users\patri\dev\CMS-V2\.agents\teamwork\teamwork_explorer_m1_1\handoff.md.
When finished, send a message to sub_orch_m1 (conversation ID: e3f60e4d-7f0a-4d64-bb81-9c38d8cbf017).
