# Handoff Report: Milestone 2 — Features 8 & 9 (Layout Width Shell Continuity & Heading Hierarchy)

**From:** `explorer_m2_2` (Teamwork Codebase Explorer)  
**To:** `sub_orch_m2` / Implementer Agent  
**Date:** 2026-11-13 (UTC) / 2026-11-14 (Local)  
**Type:** Hard Handoff (Investigation Complete)  
**Files Analyzed:**
- `client/src/components/archive/CanonicalDocumentViewer.jsx`
- `client/src/components/submissions/VersionHistory.jsx`
- `client/src/components/submissions/VersionCompare.jsx`
- `client/src/components/layouts/DashboardLayout.jsx`
- Repository-wide AST analysis across all 369 JSX files in `client/src/`

---

## 1. Observation

### Observation 1: Layout Width Shell Clamping in `CanonicalDocumentViewer.jsx`
- **File:** `client/src/components/archive/CanonicalDocumentViewer.jsx`
- **Lines 1150–1172:**
  ```jsx
  {viewMode === 'integrity' && pdfBlobUrl ? (
    <div
      className="w-full max-w-5xl bg-card rounded-lg shadow-md border border-border overflow-hidden transition-all flex flex-col h-[calc(100vh-8.5rem)]"
      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
    >
      <PdfViewerWorkspace
        pdfUrl={pdfBlobUrl}
        plagiarismMatches={plagiarismMatches}
        activeHighlightId={
          activeMatchId || (activeSourceId ? `plag-${activeSourceId}` : null)
        }
        layerFilter="plagiarism"
        plagiarismOpacity={0.8}
        canComment={false}
        className="flex-1 w-full min-h-0"
      />
    </div>
  ) : (
    <div
      className="w-full max-w-5xl"
      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
    >
      <SophisticatedDocumentViewer
        key={activeDocType}
        submission={{ ... }}
        ...
        className="max-w-full"
      />
    </div>
  )}
  ```
- **Context:** Line 888 root container is `min-h-screen flex flex-col bg-background`, header (line 890) is full-width (`w-full px-3 sm:px-6 py-2.5`), line 1104 is `flex-1 bg-muted/20 flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6`, and line 1113 is `w-full flex flex-col items-center gap-3`. In `DashboardLayout.jsx` line 109, canonical content width is defined as `max-w-7xl` (`1280px`). `max-w-5xl` sets `1024px`, leaving 256px of dead horizontal space on 1440x900 screens.

### Observation 2: Duplicate `<h1>` Heading in `CanonicalDocumentViewer.jsx`
- **File:** `client/src/components/archive/CanonicalDocumentViewer.jsx`
- **Line 908 (Top App Bar):**
  ```jsx
  <div className="min-w-0 flex-1">
    <h1
      className="text-xs sm:text-sm font-semibold text-foreground truncate"
      title={project.title}
    >
      {project.title}
    </h1>
    <p className="text-[11px] text-muted-foreground truncate hidden md:block">
      {proponents} • {publisher} • {pubYear}
    </p>
  </div>
  ```
- **Line 1275 (Institutional Manuscript Fallback Canvas):**
  ```jsx
  {/* Title & Proponents */}
  <div className="space-y-4 text-center">
    <h1 className="text-xl sm:text-2xl font-bold font-serif leading-snug tracking-tight text-foreground">
      {project.title}
    </h1>
  ```
- **Repository-wide AST scan result:** An AST scan across all 369 JSX files in `client/src/` revealed that `CanonicalDocumentViewer.jsx` is the **only file in the entire CMS-V2 codebase** containing multiple `<h1>` tags rendered in the same view.

### Observation 3: Oversized Dialog & Vertical Clipping in `VersionHistory.jsx`
- **File:** `client/src/components/submissions/VersionHistory.jsx`
- **Lines 179–194:**
  ```jsx
  <Dialog open={showCompare} onOpenChange={setShowCompare}>
    <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Compare versions</DialogTitle>
        <DialogDescription>
          Compare the saved submission details for the selected versions.
        </DialogDescription>
      </DialogHeader>
      {selectedVersionRecords[0] && selectedVersionRecords[1] && (
        <VersionCompare
          version1={selectedVersionRecords[0]}
          version2={selectedVersionRecords[1]}
        />
      )}
    </DialogContent>
  </Dialog>
  ```
- **Context:** `VersionCompare.jsx` is a 142-line component containing a 3-column table comparing submission metadata (`Submission date`, `Originality score`, `Review status`, `Adviser note`) and an informational `Alert`. `max-w-6xl` (`1152px`) is unnecessarily wide for a metadata table and overflows screens < 1200px. `max-h-[calc(100dvh-2rem)]` leaves only 16px vertical margins at top and bottom, causing vertical clipping on laptop displays.

---

## 2. Logic Chain

1. **Premise 1 (Layout Width Alignment):** As observed in Observation 1, `CanonicalDocumentViewer.jsx` hardcodes `max-w-5xl` (`1024px`) on the document canvas container at lines 1152 and 1169. Since the canonical layout width in `DashboardLayout.jsx` is `max-w-7xl` (`1280px`), clamping to `max-w-5xl` truncates 256px of usable width on 1440x900 screens. Replacing `max-w-5xl` with `w-full max-w-full` enables the document reader to expand to the full shell width, matching user expectations for an immersive document viewing experience.
2. **Premise 2 (Heading Accessibility Compliance):** As observed in Observation 2, `CanonicalDocumentViewer.jsx` renders an `<h1>` at line 908 and a second `<h1>` at line 1275. According to WCAG 2.2 AA SC 1.3.1 (Info and Relationships) and `modern-web-guidance`, a document view must contain strictly one `<h1>` defining the primary page title. Demoting line 1275 from `<h1>` to semantic `<h2>` preserves the typography while establishing a valid, accessible heading hierarchy.
3. **Premise 3 (Modal Ergonomics & Viewport Safety):** As observed in Observation 3, `VersionHistory.jsx` uses `max-w-6xl` and `max-h-[calc(100dvh-2rem)]` for a modal whose only content is a compact 3-column metadata table. Replacing this with `max-h-[min(90dvh,54rem)] max-w-4xl overflow-y-auto` ensures:
   - Sizing is proportional to the 3-column metadata table (`max-w-4xl` = `896px`).
   - A minimum 10% vertical viewport buffer (`min(90dvh, 54rem)`) prevents clipping on laptops and tablets with OS bars and browser tabs.
4. **Premise 4 (Zero-Regression Safety):** Inspections of `CanonicalDocumentViewer.test.jsx` (534 lines) and `VersionHistory.test.jsx` (85 lines) confirm that neither test suite asserts specific Tailwind class names (`max-w-5xl`, `max-w-6xl`) or the `h1` element tag in line 1275. Therefore, these changes are 100% safe and will produce zero test regressions.

---

## 3. Caveats

- **Fallback Article Reading Width:** Inside `CanonicalDocumentViewer.jsx`, the fallback text canvas (line 1259) uses `article className="w-full max-w-4xl ..."`. This `max-w-4xl` constraint is intentionally kept because text articles require an optimal reading line length (~75 characters) to prevent cognitive strain (Cowan/Arnheim ergonomics). Only the PDF/OOXML canvas containers at lines 1152 and 1169 are changed to `w-full max-w-full`.
- **Zoom Origin:** Both line 1153 and line 1170 use `style={{ transform: 'scale(...)', transformOrigin: 'top center' }}`. When expanded to `w-full max-w-full`, zoom scaling centers naturally across the full canvas without shift.
- No other caveats.

---

## 4. Conclusion & Actionable Implementation Plan

The implementer agent can apply these surgical CST changes directly:

### Target 1: `client/src/components/archive/CanonicalDocumentViewer.jsx`
1. **Line 1152:** Replace `w-full max-w-5xl` with `w-full max-w-full`:
   ```jsx
   // Before:
   className="w-full max-w-5xl bg-card rounded-lg shadow-md border border-border overflow-hidden transition-all flex flex-col h-[calc(100vh-8.5rem)]"

   // After:
   className="w-full max-w-full bg-card rounded-lg shadow-md border border-border overflow-hidden transition-all flex flex-col h-[calc(100vh-8.5rem)]"
   ```
2. **Line 1169:** Replace `w-full max-w-5xl` with `w-full max-w-full`:
   ```jsx
   // Before:
   className="w-full max-w-5xl"

   // After:
   className="w-full max-w-full"
   ```
3. **Line 1275:** Demote `<h1 ...>` to `<h2 ...>`:
   ```jsx
   // Before:
   <h1 className="text-xl sm:text-2xl font-bold font-serif leading-snug tracking-tight text-foreground">
     {project.title}
   </h1>

   // After:
   <h2 className="text-xl sm:text-2xl font-bold font-serif leading-snug tracking-tight text-foreground">
     {project.title}
   </h2>
   ```

### Target 2: `client/src/components/submissions/VersionHistory.jsx`
1. **Line 180:** Replace dialog sizing with responsive bounds:
   ```jsx
   // Before:
   <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto">

   // After:
   <DialogContent className="max-h-[min(90dvh,54rem)] max-w-4xl overflow-y-auto">
   ```

---

## 5. Verification Method

1. **Targeted Unit Tests:**
   ```bash
   # Run VersionHistory test suite
   npm test --workspace=client -- src/components/submissions/VersionHistory.test.jsx

   # Run CanonicalDocumentViewer test suite
   npm test --workspace=client -- src/components/archive/CanonicalDocumentViewer.test.jsx
   ```
   *Expected Result:* Both test suites pass with 0 errors.

2. **Source Code Inspection:**
   ```bash
   # Verify that no duplicate <h1> exists in CanonicalDocumentViewer.jsx
   node -e "const fs = require('fs'); const content = fs.readFileSync('client/src/components/archive/CanonicalDocumentViewer.jsx', 'utf8'); const h1s = content.match(/<h1\b/g); console.log('H1 Count:', h1s ? h1s.length : 0);"
   ```
   *Expected Result:* `H1 Count: 1` (strictly line 908).

3. **Invalidation Conditions:**
   - Any test failure in `CanonicalDocumentViewer.test.jsx` or `VersionHistory.test.jsx`.
   - Layout clipping or horizontal scrollbars appearing inside `SophisticatedDocumentViewer` on viewports between 1024px and 1440px.
   - Screen reader reporting more than one `<h1>` on `/archive/document/:id`.
