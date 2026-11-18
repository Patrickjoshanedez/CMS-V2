# Scope: Milestone 1 — Paper Deliverables & Printing Format Integration

## Architecture
- **Frontend SPA**: React 18, Vite, Tailwind CSS, Zustand Store, TanStack React Query (`client/src/`).
- **Document Viewer**: Canonical `SophisticatedDocumentViewer.jsx` format supporting inline (`embedded={true}`) and modal (`open={true}`) presentations with full OOXML and PDF streaming.
- **Printing Architecture**: `@media print` unrolling, zero-overlay Radix dialogs, standard `@page { margin: 1in; size: letter portrait; }`, hiding interactive chrome, and high-contrast styling.
- **Backend Endpoint**: `GET /api/projects/:id/approval-sheet` (exposed via `authService.getApprovalSheetUrl`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Expose Final Approval Sheet in UI | Connect backend endpoint `GET /api/projects/:id/approval-sheet` (via `authService.getApprovalSheetUrl`) to `CertificatePage.jsx`, `ActionDoneMatrixTab.jsx`, and `ProjectSubmissionsPage.jsx` with View in `SophisticatedDocumentViewer`, Download, and Print | M1 | Survey 1 / PROJECT.md |
| 2 | Document Reader Print Handling | Add dedicated Print button in toolbar and `@media print` unrolling styles to `SophisticatedDocumentViewer.jsx` (remove overflow scroll & zoom clipping on print) | M1 | Survey 1 / PROJECT.md |
| 3 | Plagiarism Report Print Stylesheet | Add `@media print` styles and `print:hidden` utility classes to `PlagiarismReportPage.jsx` to hide active UI controls and unroll comparison container | M1 | Survey 1 / PROJECT.md |
| 4 | Radix Dialog Print Unrolling | Add global print unrolling in `index.css` for `[role="dialog"]` and `LiveDefenseMinutesModal.jsx` to eliminate fixed 90vh clipping and dark backdrop bleed | M1 | Survey 1 / PROJECT.md |
| 5 | Printable Evaluation Rubric Scoresheet | Implement printable evaluation rubric scoresheet format in `EvaluationPanel.jsx` for defense panel scoring records | M1 | Survey 1 / PROJECT.md |
| 6 | Global Print Stylesheet Polish | Unroll `.docx-outer-container` in `index.css`, establish clean paper margins, and force high-contrast print typography | M1 | Survey 1 / PROJECT.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Paper Deliverables & Printing Format Integration | Features 1, 2, 3, 4, 5, 6 | none | IN_PROGRESS |

## Interface Contracts
### Deliverables & Printing Contract (M1)
- Endpoint: `GET /api/projects/:id/approval-sheet` returns binary `application/pdf`.
- Client consumption: `authService.getApprovalSheetUrl(projectId)` or direct blob download/view via `SophisticatedDocumentViewer`.
- Print CSS: `.print-only` visible only under `@media print`; `.no-print` / `print:hidden` hidden on print; scroll wrappers (`overflow-auto`) reset to `overflow: visible; height: auto; max-height: none;` during print.
- Radix Dialogs: `[role="dialog"]` positioned statically with zero overlay opacity under print.

## Code Layout (Exclusive Write Boundaries for M1)
- `client/src/components/documents/SophisticatedDocumentViewer.jsx`
- `client/src/pages/submissions/PlagiarismReportPage.jsx`
- `client/src/components/ui/Dialog.jsx`
- `client/src/index.css`
- `client/src/pages/CertificatePage.jsx`
- `client/src/pages/projects/ProjectSubmissionsPage.jsx`
- `client/src/components/projects/EvaluationPanel.jsx`
- `client/src/components/defense/LiveDefenseMinutesModal.jsx`
- `client/src/components/projects/ActionDoneMatrixTab.jsx`
- `client/src/hooks/useProjects.js`
