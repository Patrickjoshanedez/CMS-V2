# Milestone 1 Exploration Report: Document Viewer File Deletion Safety Analysis (Task 1)

**Author:** `m1_explorer_1`  
**Date:** 2026-09-28T06:38:00Z  
**Target:** Milestone 1, Features 1 & 2 ("Prune PaginatedDocumentViewer" & "Prune ReadonlyPDFViewer")  
**Handoff Type:** Hard (Milestone 1 Task 1 Investigation Complete)  

---

## 1. Observation

### 1.1 Target File Profiles & Line Counts
1. **`client/src/components/documents/PaginatedDocumentViewer.jsx`**
   - **File Size:** 13,609 bytes, 377 lines.
   - **Primary Export:** `export default function PaginatedDocumentViewer(...)` (line 30).
   - **Dependencies Used:** `react`, `prop-types`, `lucide-react`, `@/components/ui/Button`, `@/components/ui/Badge`, `docx-preview`, `@/lib/utils`.
   - **Purpose:** Legacy paginated viewer rendering 8.5" x 11" Letter sheets via `docx-preview` and `iframe` for PDFs.

2. **`client/src/components/documents/PaginatedDocumentViewer.test.jsx`**
   - **File Size:** 3,042 bytes, 105 lines.
   - **Test Suite:** `describe('PaginatedDocumentViewer', ...)` containing 3 unit tests.
   - **Baseline Test Run:**
     ```
     Command: npm test --workspace=client -- src/components/documents/PaginatedDocumentViewer.test.jsx
     Output: Test Files 1 passed (1), Tests 3 passed (3), Duration 13.03s
     Warning: Emits React act(...) warnings during async docx rendering
     ```

3. **`client/src/components/projects/ReadonlyPDFViewer.jsx`**
   - **File Size:** 2,109 bytes, 52 lines.
   - **Primary Export:** `export default function ReadonlyPDFViewer(...)` (line 8).
   - **Dependencies Used:** `react`, `lucide-react`.
   - **Purpose:** Simple card wrapping `<iframe src={`${fileUrl}#toolbar=0`}>` with an anti-right-click overlay.

---

### 1.2 Barrel Files & Re-Export Verification
- **Search Method:** `find_by_name` for `index.*` in `client/src/`.
- **Observation Result:** Exactly 1 file found:
  `client/src/index.css`
- **Confirmation:** There are **zero** barrel files (`index.js`, `index.jsx`, `index.ts`) in `client/src/components/documents/`, `client/src/components/projects/`, or anywhere in the `client/src/` tree. No intermediate re-exports exist.

---

### 1.3 Dynamic Import & Build Configuration Verification
- **Dynamic Imports (`import(`):**
  - All 44 dynamic imports in `client/src/App.jsx` load route-level page components (e.g. `LoginPage`, `DashboardPage`, `SubmissionReviewPage`).
  - Search across all `client/src/` files for dynamic imports confirmed **zero** dynamic imports targeting `PaginatedDocumentViewer` or `ReadonlyPDFViewer`.
- **Vite Configuration (`client/vite.config.js`):**
  - Analyzed rollup chunking under `build.rollupOptions.output.manualChunks`:
    - `engine-docx` bundles `docx-preview` and `jszip`.
    - `engine-pdf` bundles `pdfjs-dist` and `react-pdf-highlighter-plus`.
  - Zero explicit references or aliases map to `PaginatedDocumentViewer` or `ReadonlyPDFViewer`.
- **Package Configuration (`client/package.json`):**
  - Zero scripts or custom exports reference either file.

---

### 1.4 Codebase Reference Census
1. **Occurrences of `PaginatedDocumentViewer` across entire repository:**
   - `client/src/components/documents/PaginatedDocumentViewer.jsx` (File itself)
   - `client/src/components/documents/PaginatedDocumentViewer.test.jsx` (Its dedicated test)
   - `client/src/pages/submissions/PlagiarismReportPage.test.jsx:37-39`:
     ```javascript
     vi.mock('@/components/documents/PaginatedDocumentViewer', () => ({
       default: () => <div data-testid="docx-preview-renderer">Paginated Document Preview</div>,
     }));
     ```
     *(Subject component `PlagiarismReportPage.jsx` imports `SophisticatedDocumentViewer`, not `PaginatedDocumentViewer`).*
   - `AGENTS.md` (lines 48, 188) & `GEMINI.md` (lines 65, 141): Governance rule defining `PaginatedDocumentViewer` as a prohibited ad-hoc viewer under Pile B Rule 18.
   - `memories/repo/CMS-V2-Technical-Context.md`: Architecture notes detailing the historical replacement of `PaginatedDocumentViewer` with `SophisticatedDocumentViewer`.
   - **Active Runtime Imports in `client/src`:** **0**

2. **Occurrences of `ReadonlyPDFViewer` across entire repository:**
   - `client/src/components/projects/ReadonlyPDFViewer.jsx` (File itself)
   - `client/src/pages/projects/ProjectDetailPage.back-nav.test.jsx:81`:
     ```javascript
     vi.mock('@/components/projects/ReadonlyPDFViewer', () => ({ default: () => null }));
     ```
     *(Subject component `ProjectDetailPage.jsx` imports neither `ReadonlyPDFViewer` nor `SophisticatedDocumentViewer`).*
   - `memories/repo/CMS-V2-Technical-Context.md`: Documented as a legacy ad-hoc viewer.
   - **Active Runtime Imports in `client/src`:** **0**

---

### 1.5 Canonical Document Viewer Usage Across Routes
A comprehensive audit of all document-viewing routes and surfaces confirmed that **`SophisticatedDocumentViewer.jsx`** is the sole canonical document reader in active production use:

| Route / Component Location | Hosting Component | Viewer Invocation Mode | Features Exercised |
| :--- | :--- | :--- | :--- |
| `/submissions/:id/review` | `SubmissionReviewPage.jsx:954` | `<SophisticatedDocumentViewer embedded={true} ... />` | Embedded Manuscript Reader tab, Letter margins, OOXML rendering, PDF streaming |
| `/submissions/:id/review` | `SubmissionReviewPage.jsx:1226` | `<SophisticatedDocumentViewer open={viewerOpen} ... />` | Modal Document Viewer dialog |
| `/submissions/:id/plagiarism` | `PlagiarismReportPage.jsx:35` | `<SophisticatedDocumentViewer embedded={true} ... />` | Embedded Original Document canvas, Turnitin-style marks, zoom presets |
| `/submissions/:id/plagiarism` | `PlagiarismReportPage.jsx:35` | `<SophisticatedDocumentViewer open={viewerOpen} ... />` | Fullscreen modal document inspector |
| `/submissions/:id` | `SubmissionDetailPage.jsx:418` | `<SophisticatedDocumentViewer open={readerOpen} ... />` | Student submission reader modal |
| `/projects/:id/certificate` | `CertificatePage.jsx:183` | `<SophisticatedDocumentViewer ... />` | Document review preview |
| Chapter Review Panel | `ChapterReviewPanel.jsx:661` | `<SophisticatedDocumentViewer open={isDocumentViewerOpen} ... />` | Faculty chapter evaluation modal |
| Chapter Rounds | `ChapterProgressWithRounds.jsx:334` | `<SophisticatedDocumentViewer open={isDocumentViewerOpen} ... />` | Progress iteration reader modal |
| Capstone 1 Sections | `Capstone1CollapsibleSections.jsx:707` | `<SophisticatedDocumentViewer open={previewOpen} ... />` | Title proposal manuscript modal |
| Capstone 3 Sections | `Capstone3CollapsibleSections.jsx:552` | `<SophisticatedDocumentViewer open={isViewerOpen} ... />` | Progress defense prototype & manuscript modal |
| `/archive` | `ArchiveSearchPage.jsx` | `<SophisticatedDocumentViewer open={previewOpen} ... />` | Public preview modal |
| `/archive/:id/read` | `ArchiveDocumentViewerPage.jsx:14` | `<CanonicalDocumentViewer project={project} ... />` | Specialized full-page repository reader with citation export |

---

### 1.6 Baseline Test Health Check
All affected test suites passed with zero errors:
- `npm test --workspace=client -- src/components/documents/SophisticatedDocumentViewer.test.jsx`  
  **Result:** 12 passed (12), Duration: 20.67s
- `npm test --workspace=client -- src/components/documents/RevisionDiffViewer.test.jsx`  
  **Result:** 7 passed (7), Duration: 19.66s
- `npm test --workspace=client -- src/pages/submissions/PlagiarismReportPage.test.jsx`  
  **Result:** 10 passed (10), Duration: 13.44s
- `npm test --workspace=client -- src/pages/projects/ProjectDetailPage.back-nav.test.jsx`  
  **Result:** 2 passed (2), Duration: 33.80s

---

## 2. Logic Chain

1. **Step 1 — Zero Runtime Dependency:**
   - Observations 1.2, 1.3, and 1.4 confirm that no runtime JavaScript/JSX module in `client/src/` imports `PaginatedDocumentViewer.jsx` or `ReadonlyPDFViewer.jsx`, either statically or dynamically.
   - Observation 1.2 confirms that no barrel index files re-export either component.
   - Observation 1.3 confirms that Vite and Rollup configurations have no aliases or references pointing to these files.
   - **Logical Inference:** Deleting both `.jsx` components will cause zero broken module imports or bundling failures at build time.

2. **Step 2 — Safe Deletion of Test File:**
   - Observation 1.1 confirms `PaginatedDocumentViewer.test.jsx` is a standalone unit test testing `PaginatedDocumentViewer.jsx`.
   - Observation 1.4 confirms no other test file imports or calls `PaginatedDocumentViewer.test.jsx`.
   - Observation 1.6 confirms `SophisticatedDocumentViewer.test.jsx` provides comprehensive coverage (12/12 passing) of the canonical viewer.
   - **Logical Inference:** Deleting `PaginatedDocumentViewer.test.jsx` alongside `PaginatedDocumentViewer.jsx` safely removes dead test execution and eliminates React act warnings without reducing test coverage on active code.

3. **Step 3 — Synchronization with Test Mock Cleanup:**
   - Observation 1.4 identifies that `PlagiarismReportPage.test.jsx` lines 37–39 and `ProjectDetailPage.back-nav.test.jsx` line 81 contain orphan mocks of the files to be deleted.
   - Removing the files while leaving those mocks would leave orphaned mocks referencing deleted files.
   - Deleting the files while removing those mocks (handled in Milestone 1 Feature 3 / Task 2) results in a 100% clean, synchronized codebase.

4. **Step 4 — Unified Viewer Contract Satisfaction:**
   - Observation 1.5 traces every document presentation in the application and proves `SophisticatedDocumentViewer.jsx` is universally utilized for all active document reading, meeting the strict requirements of Pile B Rule 18 in `AGENTS.md` and `GEMINI.md`.

---

## 3. Caveats

- **Test Mock Removal Pairing:** While deleting the files does not cause test failures (since Vitest `vi.mock` creates virtual module stubs even if a path doesn't exist on disk), the orphan mocks in `PlagiarismReportPage.test.jsx:37-39` and `ProjectDetailPage.back-nav.test.jsx:81` should be pruned in the same milestone (Task 2) to maintain strict hygiene.
- **`CanonicalDocumentViewer.jsx` in Archive:** Note that `CanonicalDocumentViewer.jsx` is located in `client/src/components/archive/` and is specifically designed for the public `/archive/:id/read` view with citation generation and metadata drawers. It is not an ad-hoc viewer and is not scheduled for deletion.
- **No Caveats Regarding Deletion Safety:** The deletion of the 3 specified files is completely safe and zero-regression.

---

## 4. Conclusion & Concrete Implementation Plan for Worker

### Conclusion:
`client/src/components/documents/PaginatedDocumentViewer.jsx`, `client/src/components/documents/PaginatedDocumentViewer.test.jsx`, and `client/src/components/projects/ReadonlyPDFViewer.jsx` are completely dead files with **zero active runtime consumers**. Deleting all 3 files is **100% safe**, aligns with the Mandatory Unified Sophisticated Document Reader Contract, and produces zero broken imports or build regressions.

---

### Concrete Implementation Steps for Worker:

#### Phase A: Delete Target Files
Delete the following 3 files from the workspace:
1. `client/src/components/documents/PaginatedDocumentViewer.jsx`
2. `client/src/components/documents/PaginatedDocumentViewer.test.jsx`
3. `client/src/components/projects/ReadonlyPDFViewer.jsx`

*PowerShell execution command:*
```powershell
Remove-Item -Path "client/src/components/documents/PaginatedDocumentViewer.jsx" -Force
Remove-Item -Path "client/src/components/documents/PaginatedDocumentViewer.test.jsx" -Force
Remove-Item -Path "client/src/components/projects/ReadonlyPDFViewer.jsx" -Force
```

#### Phase B: Clean Test Mocks (Feature 3)
1. In `client/src/pages/submissions/PlagiarismReportPage.test.jsx`, delete lines 37–39:
   ```javascript
   vi.mock('@/components/documents/PaginatedDocumentViewer', () => ({
     default: () => <div data-testid="docx-preview-renderer">Paginated Document Preview</div>,
   }));
   ```
2. In `client/src/pages/projects/ProjectDetailPage.back-nav.test.jsx`, delete line 81:
   ```javascript
   vi.mock('@/components/projects/ReadonlyPDFViewer', () => ({ default: () => null }));
   ```

#### Phase C: Clean Auth Inline Color Styles (Feature 5)
In `client/src/components/auth/BukSULoginSidePanel.jsx`, remove the 11 redundant inline `style={{ color: ... }}` tags that duplicate Tailwind utility classes:
- Line 101: `style={{ color: '#e2e8f0' }}`
- Line 126: `style={{ color: '#e2e8f0' }}`
- Line 151: `style={{ color: '#e2e8f0' }}`
- Line 158: `style={{ color: '#F5C253' }}`
- Line 175: `style={{ color: '#F5C253' }}`
- Line 179: `style={{ color: '#cbd5e1' }}`
- Line 183: `style={{ color: '#ffffff' }}`
- Line 189: `style={{ color: '#cbd5e1' }}`
- Line 202: `style={{ color: '#e2e8f0' }}`
- Line 208: `style={{ color: '#F5C253' }}`
- Line 220: `style={{ color: '#e2e8f0' }}`

---

## 5. Verification Method

To independently verify after worker execution:

1. **Verify Files Are Removed:**
   ```bash
   # Should return nothing (exit code 1 or empty)
   git status --short client/src/components/documents/PaginatedDocumentViewer*
   git status --short client/src/components/projects/ReadonlyPDFViewer*
   ```

2. **Verify Zero Residual References Across Client:**
   ```bash
   # Should return 0 matches
   git grep -n "PaginatedDocumentViewer" client/src/
   git grep -n "ReadonlyPDFViewer" client/src/
   ```

3. **Execute Fast-Path Targeted Testing:**
   ```bash
   # Canonical viewer tests (must pass 12/12)
   npm test --workspace=client -- src/components/documents/SophisticatedDocumentViewer.test.jsx

   # Revision diff tests (must pass 7/7)
   npm test --workspace=client -- src/components/documents/RevisionDiffViewer.test.jsx

   # Plagiarism report page tests (must pass 10/10)
   npm test --workspace=client -- src/pages/submissions/PlagiarismReportPage.test.jsx

   # Project detail back-nav tests (must pass 2/2)
   npm test --workspace=client -- src/pages/projects/ProjectDetailPage.back-nav.test.jsx
   ```

4. **Verify Frontend Build & Governance:**
   ```bash
   # Verify Vite build completes without module resolution errors
   npm run build --workspace=client

   # Verify Agentic Governance
   npm run validate:agentic
   ```

5. **Invalidation Conditions:**
   - Any broken import error during `npm run build --workspace=client` or test runs.
   - Any surviving reference to `PaginatedDocumentViewer` or `ReadonlyPDFViewer` in `client/src/`.
   - Any test regression in `SophisticatedDocumentViewer.test.jsx`, `PlagiarismReportPage.test.jsx`, or `ProjectDetailPage.back-nav.test.jsx`.
