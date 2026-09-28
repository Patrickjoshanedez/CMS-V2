# Technical Survey & Forensic Exploration Report: Phase 1 & Phase 2 Remediation

**Explorer**: `survey_explorer_1`  
**Working Directory**: `c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\survey_explorer_1`  
**Parent Agent**: `orchestrator_1` (Conversation ID: `1714716d-2fa0-43f0-bb45-4ec063aeb453`)  
**Scope**: 
- **Phase 1**: Document Viewer Consolidation & Dead Code Pruning (`PaginatedDocumentViewer`, `ReadonlyPDFViewer`, `SophisticatedDocumentViewer`, Auth inline colors)
- **Phase 2**: Mobile Ergonomics & Touch Target Normalization (`GoogleScholarSidebar`, `PrototypeGallery`, `TeamCommitteeAssignmentsView`)

---

## 1. Observation

### 1.1 Phase 1: Document Viewer Consolidation & Dead Code Analysis
Through exhaustive filesystem grep and static AST inspections:

1. **`PaginatedDocumentViewer.jsx`**:
   - **Path**: `client/src/components/documents/PaginatedDocumentViewer.jsx` (377 lines, 13,609 bytes).
   - **Test File**: `client/src/components/documents/PaginatedDocumentViewer.test.jsx` (105 lines, 3,042 bytes).
   - **Codebase Usages**: 
     - **Active Runtime Imports**: `0` (Zero runtime components in `client/src` import or mount `PaginatedDocumentViewer`).
     - **Test References**:
       - `client/src/pages/submissions/PlagiarismReportPage.test.jsx:37-39`:
         ```javascript
         37: vi.mock('@/components/documents/PaginatedDocumentViewer', () => ({
         38:   default: () => <div data-testid="docx-preview-renderer">Paginated Document Preview</div>,
         39: }));
         ```
         *(Note: `PlagiarismReportPage.jsx` does not import `PaginatedDocumentViewer`; it uses `SophisticatedDocumentViewer` exclusively at line 35, 1545, 2079).*
       - `client/src/components/documents/PaginatedDocumentViewer.test.jsx:5`:
         ```javascript
         5: import PaginatedDocumentViewer from './PaginatedDocumentViewer';
         ```

2. **`ReadonlyPDFViewer.jsx`**:
   - **Path**: `client/src/components/projects/ReadonlyPDFViewer.jsx` (52 lines, 2,109 bytes).
   - **Test File**: None dedicated.
   - **Codebase Usages**:
     - **Active Runtime Imports**: `0` (Zero runtime components in `client/src` import or mount `ReadonlyPDFViewer`).
     - **Test References**:
       - `client/src/pages/projects/ProjectDetailPage.back-nav.test.jsx:81`:
         ```javascript
         81: vi.mock('@/components/projects/ReadonlyPDFViewer', () => ({ default: () => null }));
         ```
         *(Note: Neither `ProjectDetailPage.jsx` nor any of its tabs import `ReadonlyPDFViewer`).*

3. **`SophisticatedDocumentViewer.jsx` Architecture & Contract**:
   - **Path**: `client/src/components/documents/SophisticatedDocumentViewer.jsx` (1660 lines, 66,158 bytes).
   - **Export**: Single default export (`export default function SophisticatedDocumentViewer({ ... })`).
   - **Dual Presentation Standard**:
     - **Embedded Inline Mode**: `embedded={true}` renders seamlessly within page flow (used in `PlagiarismReportPage.jsx:1545`, `SubmissionReviewPage.jsx:954`, `SubmissionDetailPage.jsx`).
     - **Modal Dialog Mode**: `open={true}` / `onOpenChange={...}` renders in full-featured Radix dialog modal.
   - **Core Props Contract**:
     - File input: `file` (File/Blob), `fileBlob` (Blob), `fileUrl` (string), `fileName` (string), `chapterTitle` (string), `submission` (object).
     - Interactivity: `zoom`, `viewMode` ('manuscript' | 'diff'), `layerFilter` ('all' | 'comments' | 'plagiarism'), `commentsOpacity`, `plagiarismOpacity`, `highlights`, `plagiarismMatches`, `activeHighlightId`.
     - Event callbacks: `onSelectionFinished`, `onHighlightClick`, `onAddReply`, `onResolveComment`, `onAddToAdm`, `onOpenChange`.
     - Contextual flags: `isPlagiarismReport`, `isArchive`, `hideIdentity`, `showRevisionDiff`, `showComments`, `canComment`, `userRole`.

4. **Authentication Components Inline Color Style Tags**:
   - Component: `client/src/components/auth/BukSULoginSidePanel.jsx`
   - Verified 11 redundant inline `style={{ color }}` tags duplicating existing Tailwind classes:
     - Line 101: `style={{ color: '#e2e8f0' }}` on `<p className="... text-slate-200 ...">`
     - Line 126: `style={{ color: '#e2e8f0' }}` on `<p className="... text-slate-200 ...">`
     - Line 151: `style={{ color: '#e2e8f0' }}` on `<span className="... text-slate-200 ...">`
     - Line 158: `style={{ color: '#F5C253' }}` on `<span className="... text-[#F5C253] ...">`
     - Line 175: `style={{ color: '#F5C253' }}` on `<span className="... text-[#F5C253] ...">`
     - Line 179: `style={{ color: '#cbd5e1' }}` on `<Icon className="... text-slate-300" ...>`
     - Line 183: `style={{ color: '#ffffff' }}` on `<h3 className="... text-white ...">`
     - Line 189: `style={{ color: '#cbd5e1' }}` on `<p className="... text-slate-300 ...">`
     - Line 202: `style={{ color: '#e2e8f0' }}` on `<span className="... text-slate-200 ...">`
     - Line 208: `style={{ color: '#F5C253' }}` on `<span className="... text-[#F5C253] ...">`
     - Line 220: `style={{ color: '#e2e8f0' }}` on `<span className="text-slate-200 font-medium" ...>`
   - All other auth components (`LoginPage.jsx`, `RegisterPage.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`, `VerifyOtpPage.jsx`, `AuthStatusAlert.jsx`, `AuthSubmitButton.jsx`) have zero redundant `style={{ color }}` tags.

---

### 1.2 Phase 2: Mobile Ergonomics & Touch Target Normalization
1. **Critical Path & Location Verification**:
   - `GoogleScholarSidebar.jsx`: Located at **`client/src/components/archive/GoogleScholarSidebar.jsx`** (NOT `client/src/components/projects/`).
   - `PrototypeGallery.jsx`: Located at **`client/src/components/projects/PrototypeGallery.jsx`**.
   - `TeamCommitteeAssignmentsView.jsx`: Located at **`client/src/components/users/TeamCommitteeAssignmentsView.jsx`** (NOT `client/src/components/dashboard/`).

2. **`GoogleScholarSidebar.jsx` (312 lines)** Interactive Controls:
   - Line 78-86: Filter Reset button (`<button onClick={onResetFilters}>Reset</button>`).
     - Current classes: `text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors ...`
     - Current height: ~16px height, 0 padding.
   - Line 97-111: Date preset buttons (`datePresets.map(...)`).
     - Current classes: `w-full text-left px-2 py-1 rounded-md text-xs ...`
     - Current height: ~24px height (`py-1`).
   - Line 127, 137: Custom date range number inputs (`<input type="number" ... />`).
     - Current classes: `w-1/2 h-8 px-2 text-xs ...`
     - Current height: 32px (`h-8`).
   - Line 140-142 (Static Audit Hit): "Apply Range" button (`<Button type="submit" size="sm" variant="secondary" className="w-full h-7 text-xs">`).
     - Current classes: `w-full h-7 text-xs`
     - Current height: **28px (`h-7`)** — Direct violation of 44x44px touch target.
   - Line 159-173: Academic Program facet buttons (`resolvedProgramOptions.map(...)`).
     - Current classes: `w-full text-left px-2 py-1 rounded-md text-xs ...`
     - Current height: ~24px height (`py-1`).
   - Line 185-214: "Sort By" buttons (`Sort by relevance`, `Sort by date`).
     - Current classes: `w-full text-left px-2 py-1 rounded-md text-xs ...`
     - Current height: ~24px height (`py-1`).
   - Line 223-241: Checkbox rows (`Include citations`, `Include capstone filings`).
     - Current classes: `flex items-center gap-2 cursor-pointer text-xs ...`
     - Current height: ~18px height, 0 vertical touch padding.
   - Line 262-269: Mobile slide-out drawer dismiss button (`<button onClick={onCloseMobile} ... aria-label="Close filters">`).
     - Current classes: `p-1 rounded-md text-muted-foreground ...`
     - Current dimensions: **28x28px (`p-1` + 20px icon)**.

3. **`PrototypeGallery.jsx` (403 lines)** Interactive Controls:
   - Line 101-109: External prototype link (`<a ... className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">`).
     - Current height: ~16px height.
   - Line 116-128: Prototype card delete button (`<Button variant="destructive" size="icon" className="h-7 w-7" ...>`).
     - Current dimensions: **28x28px (`h-7 w-7`)**; gated by `opacity-0 group-hover:opacity-100` (which fails on touch devices without hover).
   - Line 192-194 (Static Audit Hit): Add panel close button (`<Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>`).
     - Current dimensions: **24x24px (`h-6 w-6`)** — Direct violation of 44x44px touch target.
   - Line 199-219: Add mode toggle buttons ("File / Video", "Link") (`<Button ... className="gap-1.5 text-xs h-7">`).
     - Current height: **28px (`h-7`)**.
   - Line 226-273: Title, File, URL inputs (`<Input ... className="h-8 text-xs" />`).
     - Current height: 32px (`h-8`).
   - Line 277-295: Cancel & Upload/Add Link buttons (`<Button ... className="h-7 text-xs">`).
     - Current height: **28px (`h-7`)**.
   - Line 337-346: "Add" button in CardHeader (`<Button variant="outline" size="sm" className="gap-1.5 shrink-0" ...>`).
     - Current height: 36px (`size="sm"` is `h-9`).

4. **`TeamCommitteeAssignmentsView.jsx` (951 lines)** Interactive Controls:
   - Line 360-366: Search input (`<Input ... className="pl-8 h-9 text-xs ...">`).
     - Current height: 36px (`h-9`).
   - Lines 368, 384, 399, 413: Toolbar select dropdowns (Academic Year, Section, Status, Jump to Team) (`className="h-9 rounded-md ..."`).
     - Current height: 36px (`h-9`).
   - Line 581-589: "View Linked Project Workspace" anchor (`<a ... className="inline-flex items-center gap-1.5 text-xs ...">`).
     - Current height: ~16px height.
   - Lines 649, 710, 779: Adviser select, Secretary select, Add Panelist select dropdowns (`className="w-full h-9 rounded-md ..."`).
     - Current height: 36px (`h-9`).
   - Line 682-690: Clear Adviser button (`<Button variant="ghost" size="icon" onClick={() => setSelectedAdviserId('')} className="h-6 w-6 ...">`).
     - Current dimensions: **24x24px (`h-6 w-6`)**.
   - Line 743-751: Clear Secretary button (`<Button variant="ghost" size="icon" onClick={() => setSelectedSecretaryId('')} className="h-6 w-6 ...">`).
     - Current dimensions: **24x24px (`h-6 w-6`)**.
   - Line 825-833: Remove Panelist button (`<Button variant="ghost" size="icon" onClick={() => handleRemovePanelist(panId)} className="h-6 w-6 ...">`).
     - Current dimensions: **24x24px (`h-6 w-6`)**.
   - Line 851-863: Save & Broadcast Assignments button (`<Button size="sm" ...>`).
     - Current height: 36px (`size="sm"` is `h-9`).
   - Line 886-892 (Static Audit Hit): Milestones & Deadlines Accordion Chevron Trigger (`<Button variant="ghost" size="sm" className="h-7 w-7 p-0">`).
     - Current dimensions: **28x28px (`h-7 w-7`)**; lacks accessible name and state (`aria-label`, `aria-expanded`).
   - Line 914-926: Deadline date inputs (`className="h-8 text-xs bg-background"`).
     - Current height: 32px (`h-8`).
   - Line 931-939: "Save Deadlines" button (`className="text-xs h-8"`).
     - Current height: 32px (`h-8`).

---

## 2. Logic Chain

1. **Dead Code Identification**:
   - Grep search for `PaginatedDocumentViewer` across all `client/src` showed zero runtime component imports. The only references exist in its own source file, its unit test, and a residual mock in `PlagiarismReportPage.test.jsx:37`.
   - Grep search for `ReadonlyPDFViewer` across all `client/src` showed zero runtime component imports. The only reference exists in its own source file and a residual mock in `ProjectDetailPage.back-nav.test.jsx:81`.
   - AGENTS.md / GEMINI.md Rule 18 explicitly states: *"Ad-hoc or simplified viewers (PaginatedDocumentViewer, raw `<pre>`, isolated HTML dumps) are strictly banned. All document reading across BukSU CMS-V2 ... MUST universally use the canonical SophisticatedDocumentViewer format"*.
   - Removing `PaginatedDocumentViewer.jsx`, `PaginatedDocumentViewer.test.jsx`, `ReadonlyPDFViewer.jsx`, and their 2 dead mocks in `PlagiarismReportPage.test.jsx` and `ProjectDetailPage.back-nav.test.jsx` completely eliminates dead code without breaking any runtime dependency.

2. **Inline Color De-duplication**:
   - `BukSULoginSidePanel.jsx` contains 11 instances of `style={{ color: ... }}` where the element's `className` already contains the corresponding Tailwind class (`text-slate-200`, `text-slate-300`, `text-[#F5C253]`, `text-white`).
   - Deleting the `style={{ color: ... }}` attributes purifies the AST and adheres to the Pile A / Pile B zero-slop design token standards.

3. **File Location Normalization**:
   - The user dispatch referenced `client/src/components/projects/GoogleScholarSidebar.jsx` and `client/src/components/dashboard/TeamCommitteeAssignmentsView.jsx`.
   - Filesystem verification confirmed the actual locations are `client/src/components/archive/GoogleScholarSidebar.jsx` and `client/src/components/users/TeamCommitteeAssignmentsView.jsx`. Downstream implementers must target these true paths.

4. **Touch Target Normalization (WCAG 2.1 SC 2.5.5 / WCAG 2.2 SC 2.5.8)**:
   - Target criteria: Target size of at least $44 \times 44\text{px}$ on mobile/touch viewports.
   - For desktop responsive layouts, controls can maintain compact sizing (`sm:h-7`, `sm:w-7`, `sm:py-1`, `sm:h-9`), but on mobile viewports (`< 640px` or `< 768px`) or interactive buttons without surrounding clearance, touch target minimum bounding boxes must be enforced via `min-h-[44px] min-w-[44px]` (or touch-padded wrapper/target padding `p-2.5`).
   - Auxiliary controls like modal dismiss buttons (`X`), clear adviser/secretary/panelist buttons, accordion triggers, and filter submission buttons were explicitly configured with `h-6 w-6` (24px) or `h-7 w-7` (28px), falling far short of touch ergonomics.

---

## 3. Caveats

- **No Caveats on Phase 1**: Both `PaginatedDocumentViewer` and `ReadonlyPDFViewer` have 0 runtime consumers. Their pruning is 100% safe.
- **Desktop Visual Density Consideration for Phase 2**: On desktop viewports ($1440 \times 900$), dense institutional UI requires compact table and list controls (e.g. `h-7` or `h-8` inside table cards). Normalization should use responsive classes such as `min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-7 sm:w-7` or touch padding pseudo-elements (`after:absolute after:inset-[-8px]`) so that desktop visual density is preserved while touch screens meet the $44 \times 44\text{px}$ standard.
- **Card Delete Button Hover on Touch Devices**: In `PrototypeGallery.jsx:115`, `opacity-0 group-hover:opacity-100` hides the delete button on mobile devices where `:hover` is not triggered. The delete button should be permanently visible on mobile (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`).

---

## 4. Conclusion & Actionable Execution Plan

### Specific List of Files to Delete:
1. `client/src/components/documents/PaginatedDocumentViewer.jsx` (Prune dead viewer)
2. `client/src/components/documents/PaginatedDocumentViewer.test.jsx` (Prune dead test)
3. `client/src/components/projects/ReadonlyPDFViewer.jsx` (Prune dead viewer)

### Specific List of Files to Modify:
1. `client/src/pages/submissions/PlagiarismReportPage.test.jsx`:
   - Delete dead mock of `PaginatedDocumentViewer` (lines 37-39).
2. `client/src/pages/projects/ProjectDetailPage.back-nav.test.jsx`:
   - Delete dead mock of `ReadonlyPDFViewer` (line 81).
3. `client/src/components/auth/BukSULoginSidePanel.jsx`:
   - Surgically remove 11 redundant inline `style={{ color: ... }}` attributes (lines 101, 126, 151, 158, 175, 179, 183, 189, 202, 208, 220).
4. `client/src/components/archive/GoogleScholarSidebar.jsx`:
   - Line 81: Reset filter button `min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2`.
   - Line 97-111, 159-173, 185-214: Preset/program/sort buttons add `min-h-[44px] sm:min-h-0 py-2.5 sm:py-1`.
   - Line 140: Apply Range button update `className="w-full min-h-[44px] sm:min-h-0 sm:h-7 text-xs"`.
   - Line 127, 137: Custom year inputs update to `min-h-[44px] sm:min-h-0 sm:h-8`.
   - Line 223, 232: Checkbox labels add `min-h-[44px] py-1`.
   - Line 265: Mobile drawer close button update to `min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5`.
5. `client/src/components/projects/PrototypeGallery.jsx`:
   - Line 101-109: Open Link anchor add `min-h-[44px] py-2 inline-flex items-center`.
   - Line 115-128: Card delete button update `className="min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 flex items-center justify-center"` and container `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`.
   - Line 192: Add panel dismiss button update `className="min-h-[44px] min-w-[44px] sm:h-6 sm:w-6 sm:min-h-0 sm:min-w-0 flex items-center justify-center"`.
   - Line 199, 209: Toggle buttons update `className="gap-1.5 text-xs min-h-[44px] sm:min-h-0 sm:h-7"`.
   - Line 226, 244, 264: Inputs update `className="min-h-[44px] sm:min-h-0 sm:h-8 text-xs"`.
   - Line 277, 286: Cancel/Upload buttons update `className="min-h-[44px] sm:min-h-0 sm:h-7 text-xs px-3"`.
6. `client/src/components/users/TeamCommitteeAssignmentsView.jsx`:
   - Line 364, 368, 384, 399, 413: Toolbar input and select dropdowns update to `min-h-[44px] sm:min-h-0 sm:h-9`.
   - Line 649, 710, 779: Committee select dropdowns update to `min-h-[44px] sm:min-h-0 sm:h-9`.
   - Line 685, 746, 828: Clear Adviser, Clear Secretary, Remove Panelist buttons update `className="min-h-[44px] min-w-[44px] sm:h-6 sm:w-6 sm:min-h-0 sm:min-w-0 flex items-center justify-center p-2 text-muted-foreground hover:text-destructive shrink-0"`. Add explicit `aria-label`.
   - Line 886: Milestones accordion chevron button update `className="min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 flex items-center justify-center p-0"` and add `aria-label={isDeadlinesOpen ? 'Collapse deadlines' : 'Expand deadlines'}` + `aria-expanded={isDeadlinesOpen}`.
   - Line 914-926: Deadline date inputs update to `min-h-[44px] sm:min-h-0 sm:h-8`.
   - Line 931-939: Save Deadlines button update to `min-h-[44px] sm:min-h-0 sm:h-8`.

---

## 5. Verification Method

To independently verify the proposed changes:

1. **Phase 1 Dead Code & Mock Removal Verification**:
   ```bash
   # Ensure deleted files are completely gone from git tracking
   git status --short client/src/components/documents/PaginatedDocumentViewer* client/src/components/projects/ReadonlyPDFViewer*

   # Run affected test suites to verify 0 regressions
   npm test --workspace=client -- src/pages/submissions/PlagiarismReportPage.test.jsx
   npm test --workspace=client -- src/pages/projects/ProjectDetailPage.back-nav.test.jsx
   npm test --workspace=client -- src/components/documents/SophisticatedDocumentViewer.test.jsx
   ```

2. **Phase 2 Touch Target & Accessibility Verification**:
   ```bash
   # Run targeted test suites
   npm test --workspace=client -- src/components/archive/archiveComponents.test.jsx
   npm test --workspace=client -- src/components/users/TeamCommitteeAssignmentsView.test.jsx
   ```

3. **System Governance & Invalidation Checks**:
   ```bash
   # Endpoint parity (UNMATCHED_COUNT = 0)
   npm run check:endpoints

   # Agentic governance (60/60 checks)
   npm run validate:agentic
   ```
   **Invalidation Conditions**:
   - Any residual import of `PaginatedDocumentViewer` or `ReadonlyPDFViewer` fails compilation.
   - Test suites fail or throw `vi.mock` errors.
   - Static audit flags any button with computed bounding box $< 44 \times 44\text{px}$ on 390x844 mobile viewport.
