## 2026-09-28T06:38:39Z
You are m1_worker_1.
Your working directory is: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\m1_worker_1
Your parent is: orchestrator_1 (Conversation ID: 1714716d-2fa0-43f0-bb45-4ec063aeb453)
Original user request file: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan file: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\PROJECT.md

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md (specifically the section under timestamp ## 2026-09-28T06:10:21Z).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Read the 3 Explorer handoff reports before implementing:
- c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\m1_explorer_1\handoff.md
- c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\m1_explorer_2\handoff.md
- c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\m1_explorer_3\handoff.md

Your exclusive write ownership:
- `client/src/components/documents/PaginatedDocumentViewer.jsx` (delete)
- `client/src/components/documents/PaginatedDocumentViewer.test.jsx` (delete)
- `client/src/components/projects/ReadonlyPDFViewer.jsx` (delete)
- `client/src/pages/submissions/PlagiarismReportPage.test.jsx` (edit)
- `client/src/pages/projects/ProjectDetailPage.back-nav.test.jsx` (edit)
- `client/src/components/auth/BukSULoginSidePanel.jsx` (edit)

Tasks to execute:
1. Delete the 3 obsolete files:
   - `client/src/components/documents/PaginatedDocumentViewer.jsx`
   - `client/src/components/documents/PaginatedDocumentViewer.test.jsx`
   - `client/src/components/projects/ReadonlyPDFViewer.jsx`
2. In `client/src/pages/submissions/PlagiarismReportPage.test.jsx`:
   - Surgically delete lines 37-39 (the dead mock of `@/components/documents/PaginatedDocumentViewer`).
3. In `client/src/pages/projects/ProjectDetailPage.back-nav.test.jsx`:
   - Surgically delete line 81 (the dead mock of `@/components/projects/ReadonlyPDFViewer`).
4. In `client/src/components/auth/BukSULoginSidePanel.jsx`:
   - Surgically remove the 11 redundant inline `style={{ color: ... }}` attributes at lines 101, 126, 151, 158, 175, 179, 183, 189, 202, 208, 220 per the exact diff in m1_explorer_3 handoff. Preserve all existing Tailwind classes and the 4 functional/computational styles (`perspective`, `transform`, `getStyle`, `background`).
5. Run fast-path verification commands:
   - `npm test --workspace=client -- src/pages/submissions/PlagiarismReportPage.test.jsx`
   - `npm test --workspace=client -- src/pages/projects/ProjectDetailPage.back-nav.test.jsx`
   - `npm test --workspace=client -- src/components/documents/SophisticatedDocumentViewer.test.jsx`
   - `npm test --workspace=client -- src/components/documents/RevisionDiffViewer.test.jsx`
   - `npm run check:endpoints`
   - `npm run validate:agentic`

Deliver your completion report in:
`c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\m1_worker_1\handoff.md`
Include:
- Exact diffs and files modified/deleted
- Verification commands executed with exact output
When done, notify orchestrator_1 via `send_message`.
