# Milestone 1 Exploration Report: Test Mock Cleanup for Deleted Document Viewers (Task 2)

**Author:** `m1_explorer_2`  
**Date:** 2026-09-28T06:35:00Z  
**Target:** Milestone 1, Feature 3 ("Clean Test Mocks")  
**Handoff Type:** Hard (Exploration Phase Complete)  

---

## 1. Observation

### 1.1 Target 1: `client/src/pages/submissions/PlagiarismReportPage.test.jsx`
- **Location:** Lines 23–40 of `client/src/pages/submissions/PlagiarismReportPage.test.jsx`.
- **Verbatim Code Content:**
  ```javascript
  23: vi.mock('@/components/documents/SophisticatedDocumentViewer', () => ({
  24:   default: ({ open, embedded }) => {
  25:     if (embedded) {
  26:       return (
  27:         <div data-testid="sophisticated-document-viewer-embedded">Embedded Document Viewer</div>
  28:       );
  29:     }
  30:     return open ? (
  31:       <div data-testid="sophisticated-document-viewer">Document Viewer Modal</div>
  32:     ) : null;
  33:   },
  34:   DocxPreviewRenderer: () => <div data-testid="docx-preview-renderer">Docx Embedded Preview</div>,
  35: }));
  36: 
  37: vi.mock('@/components/documents/PaginatedDocumentViewer', () => ({
  38:   default: () => <div data-testid="docx-preview-renderer">Paginated Document Preview</div>,
  39: }));
  40: 
  41: const mockScanMutate = vi.fn();
  ```
- **Subject Code Usage:** In `client/src/pages/submissions/PlagiarismReportPage.jsx`, line 35:
  ```javascript
  35: import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';
  ```
  `PaginatedDocumentViewer` is **not imported** or referenced anywhere in `PlagiarismReportPage.jsx`.
- **Test Assertions in `PlagiarismReportPage.test.jsx`:**
  - Lines 120–121 & 133–134 assert `sophisticated-document-viewer-embedded`.
  - Line 163 asserts `sophisticated-document-viewer`.
  - Line 295 asserts `sophisticated-document-viewer-embedded`.
  - Zero assertions query or rely on `Paginated Document Preview` or `PaginatedDocumentViewer`.
- **Baseline Test Result:**
  Command: `npm test --workspace=client -- src/pages/submissions/PlagiarismReportPage.test.jsx`
  Output: `✓ src/pages/submissions/PlagiarismReportPage.test.jsx (10 tests) 2266ms - Test Files 1 passed (1), Tests 10 passed (10)`.

---

### 1.2 Target 2: `client/src/pages/projects/ProjectDetailPage.back-nav.test.jsx`
- **Location:** Lines 77–83 of `client/src/pages/projects/ProjectDetailPage.back-nav.test.jsx`.
- **Verbatim Code Content:**
  ```javascript
  77: vi.mock('@/components/projects/PrototypeGallery', () => ({ default: () => null }));
  78: vi.mock('@/components/projects/DeadlineWarning', () => ({ default: () => null }));
  79: vi.mock('@/components/projects/EvaluationPanel', () => ({ default: () => null }));
  80: vi.mock('@/components/submissions/FinalPaperUpload', () => ({ default: () => null }));
  81: vi.mock('@/components/projects/ReadonlyPDFViewer', () => ({ default: () => null }));
  82: vi.mock('@/components/submissions/ChapterProgressWithRounds', () => ({ default: () => null }));
  83: 
  84: vi.mock('sonner', () => ({
  ```
- **Subject Code Usage:** In `client/src/pages/projects/ProjectDetailPage.jsx`, there are **zero imports or usages** of `ReadonlyPDFViewer` or `SophisticatedDocumentViewer`.
- **Test Assertions in `ProjectDetailPage.back-nav.test.jsx`:**
  - Line 139: tests `shows Back to Search Results and navigates to returnTo when opened from archive`.
  - Line 162: tests `shows Back to Projects and navigates to /projects by default`.
  - The tests only interact with the back navigation button and assert `mockNavigate` arguments. No document viewer is rendered or asserted.
- **Baseline Test Result:**
  Command: `npm test --workspace=client -- src/pages/projects/ProjectDetailPage.back-nav.test.jsx`
  Output: `✓ src/pages/projects/ProjectDetailPage.back-nav.test.jsx (2 tests) 1055ms - Test Files 1 passed (1), Tests 2 passed (2)`.

---

### 1.3 System-Wide Scan for Viewer References across `client/`
- **Search Query 1 (`PaginatedDocumentViewer` & `PaginatedDocument`):**
  Only 3 files exist across `client/`:
  1. `client/src/components/documents/PaginatedDocumentViewer.jsx` (Legacy component — scheduled for deletion under Feature 1).
  2. `client/src/components/documents/PaginatedDocumentViewer.test.jsx` (Legacy unit test — scheduled for deletion under Feature 1).
  3. `client/src/pages/submissions/PlagiarismReportPage.test.jsx:37` (Dead mock — Target 1 above).
  **Zero other files** in `client/` reference `PaginatedDocumentViewer`.
- **Search Query 2 (`ReadonlyPDFViewer` & `ReadonlyPDF`):**
  Only 2 files exist across `client/`:
  1. `client/src/components/projects/ReadonlyPDFViewer.jsx` (Legacy component — scheduled for deletion under Feature 2).
  2. `client/src/pages/projects/ProjectDetailPage.back-nav.test.jsx:81` (Dead mock — Target 2 above).
  **Zero other files** in `client/` reference `ReadonlyPDFViewer`.
- **Search Query 3 (`SophisticatedDocumentViewer` in Test Files):**
  All active test files that require document preview already mock or test `SophisticatedDocumentViewer` directly:
  1. `client/src/pages/archive/ArchiveSearchPage.test.jsx`
  2. `client/src/components/projects/Capstone1CollapsibleSections.test.jsx`
  3. `client/src/components/projects/Capstone3CollapsibleSections.test.jsx`
  4. `client/src/components/documents/SophisticatedDocumentViewer.test.jsx` (12/12 passed)
  5. `client/src/pages/submissions/PlagiarismReportPage.test.jsx` (10/10 passed)
  6. `client/src/components/submissions/ChapterProgressWithRounds.test.jsx`
  7. `client/src/pages/submissions/SubmissionDetailPage.test.jsx`
  8. `client/src/components/submissions/ChapterReviewPanel.test.jsx`
  9. `client/src/pages/projects/CertificatePage.test.jsx`
  10. `client/src/pages/submissions/SubmissionReviewPage.test.jsx`

---

## 2. Logic Chain

1. **Step 1 — Verification of Redundancy in `PlagiarismReportPage.test.jsx`:**
   - Observation 1.1 demonstrates that `PlagiarismReportPage.jsx` does not import `PaginatedDocumentViewer`; it imports `SophisticatedDocumentViewer`.
   - Observation 1.1 also shows that lines 23–35 of `PlagiarismReportPage.test.jsx` already construct an active mock of `SophisticatedDocumentViewer` with `data-testid="sophisticated-document-viewer"` and `data-testid="sophisticated-document-viewer-embedded"`.
   - Lines 37–39 mock `PaginatedDocumentViewer`, but no component in the rendered hierarchy imports `PaginatedDocumentViewer`, and no test assertion queries for it.
   - Therefore, deleting lines 37–39 removes dead mock code without altering test semantics or component behavior.

2. **Step 2 — Verification of Redundancy in `ProjectDetailPage.back-nav.test.jsx`:**
   - Observation 1.2 demonstrates that `ProjectDetailPage.jsx` has no imports or references to `ReadonlyPDFViewer`.
   - Observation 1.2 also confirms the back navigation tests only exercise routing state and back button clicks.
   - Line 81 mocks `@/components/projects/ReadonlyPDFViewer`. When `ReadonlyPDFViewer.jsx` is deleted under Feature 2, keeping this mock would reference a nonexistent module path (or remain an orphaned mock).
   - Therefore, deleting line 81 is necessary and sufficient to keep test mocks synchronized with the codebase.

3. **Step 3 — Completeness of Scope:**
   - Observation 1.3 confirms through case-insensitive ripgrep searches that no other test files in `client/` contain references to `PaginatedDocumentViewer` or `ReadonlyPDFViewer`.
   - Therefore, the test mock cleanup scope for Milestone 1 is strictly confined to these two files.

---

## 3. Caveats

- **Prerequisite Sequencing:** Deleting `PaginatedDocumentViewer.test.jsx` is part of Task 1 / Feature 1. If running full client tests before Task 1 is complete, `PaginatedDocumentViewer.test.jsx` still tests the component locally. The changes to `PlagiarismReportPage.test.jsx` and `ProjectDetailPage.back-nav.test.jsx` are completely independent and can be executed either before or after Task 1.
- **No Mock Substitution Needed:** Neither file requires substituting a new mock for `SophisticatedDocumentViewer`:
  - `PlagiarismReportPage.test.jsx` already possesses a full, working mock of `SophisticatedDocumentViewer` (lines 23–35).
  - `ProjectDetailPage.back-nav.test.jsx` does not mount or render `SophisticatedDocumentViewer`.

---

## 4. Conclusion & Concrete Implementation Plan for Worker

### Exact Code Changes Required:

#### Action 1: Edit `client/src/pages/submissions/PlagiarismReportPage.test.jsx`
- **Target Lines:** 37–39.
- **Delete Block:**
  ```javascript
  vi.mock('@/components/documents/PaginatedDocumentViewer', () => ({
    default: () => <div data-testid="docx-preview-renderer">Paginated Document Preview</div>,
  }));
  ```
- **Preserve:** Keep lines 23–35 (`vi.mock('@/components/documents/SophisticatedDocumentViewer', ...)`) intact.

#### Action 2: Edit `client/src/pages/projects/ProjectDetailPage.back-nav.test.jsx`
- **Target Line:** Line 81.
- **Delete Line:**
  ```javascript
  vi.mock('@/components/projects/ReadonlyPDFViewer', () => ({ default: () => null }));
  ```
- **Preserve:** Keep all other mocks (`PrototypeGallery`, `DeadlineWarning`, `EvaluationPanel`, `FinalPaperUpload`, `ChapterProgressWithRounds`) intact.

---

## 5. Verification Method

To independently verify the implementation:

1. **Run Targeted Client Unit Tests:**
   ```bash
   # Test 1: Verify PlagiarismReportPage test suite passes (10/10)
   npm test --workspace=client -- src/pages/submissions/PlagiarismReportPage.test.jsx

   # Test 2: Verify ProjectDetailPage back-nav test suite passes (2/2)
   npm test --workspace=client -- src/pages/projects/ProjectDetailPage.back-nav.test.jsx

   # Test 3: Sanity check canonical viewer test suite (12/12)
   npm test --workspace=client -- src/components/documents/SophisticatedDocumentViewer.test.jsx
   ```

2. **Verify Zero Residual References:**
   ```bash
   # Confirm no references to PaginatedDocumentViewer remain in test files
   # (Excluding PaginatedDocumentViewer.test.jsx if not yet deleted by Task 1)
   git grep -n "PaginatedDocumentViewer" client/src/pages/

   # Confirm no references to ReadonlyPDFViewer remain in test files
   git grep -n "ReadonlyPDFViewer" client/src/pages/
   ```

3. **Invalidation Conditions:**
   - Any test failure in `PlagiarismReportPage.test.jsx` or `ProjectDetailPage.back-nav.test.jsx`.
   - Any surviving reference to `PaginatedDocumentViewer` or `ReadonlyPDFViewer` in `client/src/pages/`.
