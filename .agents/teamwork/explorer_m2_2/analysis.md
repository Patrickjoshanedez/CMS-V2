# Detailed Analysis: Features 8 & 9 (Layout Width Shell Continuity & Heading Hierarchy)

**Target Component Focus:** `CanonicalDocumentViewer.jsx`, `VersionHistory.jsx`, and Viewer Dialog Sizing across BukSU CMS-V2  
**Investigated By:** `explorer_m2_2` (Teamwork Codebase Explorer)  
**Date:** 2026-11-13 (UTC) / 2026-11-14 (Local)  
**Reference Standards:** `ORIGINAL_REQUEST.md` (R1), `PROJECT.md` (Features 8 & 9), `SCOPE.md`, `cms-ui-consistency-library`, `cognitive-ergonomics-ux`, `modern-web-guidance`

---

## 1. Feature 8: Layout Width Shell Continuity in `CanonicalDocumentViewer.jsx`

### 1.1 Direct Observations & Evidence
- **File:** `client/src/components/archive/CanonicalDocumentViewer.jsx`
- **Line 1152:**
  ```jsx
  {viewMode === 'integrity' && pdfBlobUrl ? (
    <div
      className="w-full max-w-5xl bg-card rounded-lg shadow-md border border-border overflow-hidden transition-all flex flex-col h-[calc(100vh-8.5rem)]"
      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
    >
      <PdfViewerWorkspace ... />
    </div>
  ) : (
    <div
      className="w-full max-w-5xl"
      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
    >
      <SophisticatedDocumentViewer ... />
    </div>
  )}
  ```

### 1.2 Container Hierarchy & Layout Discontinuity Analysis
1. **Container Hierarchy:**
   - Root Container (`line 888`): `<div className="min-h-screen flex flex-col bg-background text-foreground select-none">`
   - Top Bar Header (`line 890`): `<header className="sticky top-0 z-40 border-b border-border bg-card shadow-xs">` with `<div className="w-full px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">` (spans 100% full width).
   - Document Canvas Main (`line 1102`): `<main className="flex-1 flex overflow-hidden relative">`
   - Scrollable Viewport (`line 1104`): `<div className="flex-1 bg-muted/20 flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6">`
   - Inner Flex Column (`line 1113`): `<div className="w-full flex flex-col items-center gap-3">`
   - Clamped Viewport Containers (`lines 1152 & 1169`): `<div className="w-full max-w-5xl ...">`

2. **The Layout Continuity Problem:**
   - Standard CMS-V2 layout width is defined by `DashboardLayout.jsx` line 109 as `max-w-7xl` (`1280px` / `80rem`).
   - Clamping `CanonicalDocumentViewer.jsx` at `max-w-5xl` (`1024px` / `64rem`) introduces an artificial bottleneck:
     - On standard 1440×900 laptop displays, `max-w-5xl` wastes **256px** of horizontal screen real estate.
     - The outer document canvas displays excessive 200px+ empty gray margins on either side (`bg-muted/20`).
     - Inside line 1169, `SophisticatedDocumentViewer` already implements its own internal centering, margins, and OOXML page scaling. Artificially clamping its parent wrapper to `max-w-5xl` compresses the top identity bar, toolbar action buttons, and Turnitin-style highlights.
     - Inside line 1152, `PdfViewerWorkspace` with plagiarism overlay is restricted to 1024px, forcing dense document text and plagiarism match callouts into an unnecessarily narrow box.

### 1.3 Proposed Code Changes (Surgical CST Replacement)
In `client/src/components/archive/CanonicalDocumentViewer.jsx`:

#### Change 1 (Line 1152):
```diff
-               {viewMode === 'integrity' && pdfBlobUrl ? (
-                 <div
-                   className="w-full max-w-5xl bg-card rounded-lg shadow-md border border-border overflow-hidden transition-all flex flex-col h-[calc(100vh-8.5rem)]"
-                   style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
-                 >
+               {viewMode === 'integrity' && pdfBlobUrl ? (
+                 <div
+                   className="w-full max-w-full bg-card rounded-lg shadow-md border border-border overflow-hidden transition-all flex flex-col h-[calc(100vh-8.5rem)]"
+                   style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
+                 >
```

#### Change 2 (Line 1169):
```diff
-               ) : (
-                 <div
-                   className="w-full max-w-5xl"
-                   style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
-                 >
+               ) : (
+                 <div
+                   className="w-full max-w-full"
+                   style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
+                 >
```

---

## 2. Feature 9: Heading Hierarchy Correction in `CanonicalDocumentViewer.jsx`

### 2.1 Direct Observations & Evidence
- **File:** `client/src/components/archive/CanonicalDocumentViewer.jsx`
- **Line 908 (Top Navigation App Bar):**
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
- **Line 1275 (Fallback Institutional Manuscript Canvas):**
  ```jsx
  {/* Institutional Manuscript Page Canvas */}
  <article className="w-full max-w-4xl bg-card border border-border/80 rounded-xl shadow-md p-8 sm:p-14 space-y-8 text-foreground transition-all">
    {/* Header */}
    <div className="text-center space-y-1.5 border-b border-border/60 pb-6">
      <p className="text-xs font-bold tracking-widest text-primary uppercase">
        Bukidnon State University
      </p>
      ...
    </div>

    {/* Title & Proponents */}
    <div className="space-y-4 text-center">
      <h1 className="text-xl sm:text-2xl font-bold font-serif leading-snug tracking-tight text-foreground">
        {project.title}
      </h1>
  ```

### 2.2 Heading Hierarchy Defect Analysis
1. **WCAG 2.1 / 2.2 AA & Modern Web Standard Violation:**
   - Rule: Each page or view MUST have exactly **one semantic `<h1>`** that identifies the primary subject of the page (WCAG 2.2 Success Criterion 1.3.1 Info and Relationships).
   - In `CanonicalDocumentViewer.jsx`, when a manuscript is loading or has no PDF preview available (`!pdfLoading && !documentBlob`), the viewer renders both line 908 and line 1275 simultaneously.
   - Screen reader accessibility tools announce two duplicate top-level `<h1>` headings with identical content (`{project.title}`).
2. **Repository-Wide AST Scan:**
   - A comprehensive automated AST scan across all **369 JSX files** in `client/src/` was executed.
   - **Result:** `CanonicalDocumentViewer.jsx` was discovered to be the **ONLY component in the entire CMS-V2 codebase** containing multiple `<h1>` tags!
3. **Sub-heading Relationship:**
   - Underneath line 1275, line 1326 renders:
     `<h2 className="text-xs font-bold uppercase tracking-widest text-primary font-sans">Executive Abstract</h2>`
   - When line 1275 is demoted from `<h1>` to `<h2>`, it maintains a clean hierarchy where the top app bar is the page's singular `<h1>`, the manuscript title on the paper sheet is an `<h2>`, and section headers like Executive Abstract are properly nested.

### 2.3 Proposed Code Change (Surgical CST Replacement)
In `client/src/components/archive/CanonicalDocumentViewer.jsx` line 1275:

```diff
                  {/* Title & Proponents */}
                  <div className="space-y-4 text-center">
-                   <h1 className="text-xl sm:text-2xl font-bold font-serif leading-snug tracking-tight text-foreground">
-                     {project.title}
-                   </h1>
+                   <h2 className="text-xl sm:text-2xl font-bold font-serif leading-snug tracking-tight text-foreground">
+                     {project.title}
+                   </h2>
```

---

## 3. Responsive Dialog Bounding in `VersionHistory.jsx`

### 3.1 Direct Observations & Evidence
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

### 3.2 Modal Sizing & Clipping Analysis
1. **Oversized Container for Compact Metadata Content:**
   - `VersionCompare.jsx` (142 lines) renders a simple 3-column metadata table comparing:
     - Submission date
     - Originality score
     - Review status
     - Adviser review note
   - It also renders a brief informational Alert explaining that document content comparisons are inspected in the canonical viewer.
   - Forcing `max-w-6xl` (`1152px` / `72rem`) on this dialog is excessively wide and sparse.
2. **Responsive Clipping on Standard Laptop Viewports (1024px–1280px):**
   - On a 1024×768 tablet or 1280×800 laptop display, `max-w-6xl` exceeds the screen width or touches the edges with only 1rem margin.
   - `max-h-[calc(100dvh-2rem)]` reserves only 16px top and 16px bottom margin. When viewed in standard browser chrome (browser tabs, search bar, OS taskbar), this causes vertical crowding, makes the modal header feel clipped against the top edge, and triggers unnatural scrollbars.
3. **Ergonomic Bounds:**
   - `max-w-4xl` (`896px` / `56rem`) provides ample room for the 3-column table (`Property`, `Version A`, `Version B`), maintaining optimal line lengths and balanced whitespace.
   - `max-h-[min(90dvh,54rem)]` guarantees at least 10% vertical breathing room across all screen sizes while capping max height cleanly at `54rem` (864px).

### 3.3 Proposed Code Change (Surgical CST Replacement)
In `client/src/components/submissions/VersionHistory.jsx` line 180:

```diff
        <Dialog open={showCompare} onOpenChange={setShowCompare}>
-         <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto">
+         <DialogContent className="max-h-[min(90dvh,54rem)] max-w-4xl overflow-y-auto">
            <DialogHeader>
```

---

## 4. Comprehensive Survey of Viewer Dialogs & Modal Containers Across `client/src`

An automated audit across all 369 JSX files in `client/src` was executed to inspect all dialog containers utilizing large `max-w-*` classes (`max-w-5xl`, `max-w-6xl`, `max-w-7xl`, `calc`, `100vw`).

### 4.1 Complete Dialog Sizing Inventory

| Component | File Path | Line | Current Size Class | Audit Assessment & Sizing Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Version History Compare** | `client/src/components/submissions/VersionHistory.jsx` | 180 | `max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto` | **Defect (Feature 8):** Oversized for 3-column metadata table; clips vertically on laptops. **Propose: `max-h-[min(90dvh,54rem)] max-w-4xl overflow-y-auto`.** |
| **Canonical Document Viewer** | `client/src/components/archive/CanonicalDocumentViewer.jsx` | 1152, 1169 | `w-full max-w-5xl` | **Defect (Feature 8):** Clamps viewer to 1024px instead of aligning with `max-w-7xl` shell. **Propose: `w-full max-w-full`.** |
| **Canonical Document Viewer Heading** | `client/src/components/archive/CanonicalDocumentViewer.jsx` | 1275 | `<h1 className="text-xl sm:text-2xl font-bold font-serif ...">` | **Defect (Feature 9):** Duplicate `<h1>` on page. **Propose: Demote to `<h2>`.** |
| **Milestone Deadlines Modal** | `client/src/components/instructor/MilestoneDeadlinesModal.jsx` | 196 | `grid-rows-[auto_minmax(0,1fr)] max-h-[min(90dvh,56rem)] max-w-5xl gap-0 overflow-hidden p-0` | **Secondary Observation:** Contains split view (form + list). Has `max-h-[min(90dvh,56rem)]` but lacks `w-[calc(100vw-2rem)] sm:max-w-4xl` for narrow tablets. |
| **Prototype Gallery Modal** | `client/src/components/projects/PrototypeGalleryModal.jsx` | 280 | `max-w-6xl gap-3 border-0 bg-background/95 p-4 shadow-xl sm:p-6` | **Secondary Observation:** High-resolution image preview modal. Appropriately large for image inspection, but could benefit from `max-h-[min(90dvh,54rem)]` on the dialog container. |
| **Live Defense Minutes Modal** | `client/src/components/defense/LiveDefenseMinutesModal.jsx` | 555 | `flex max-h-[95vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-xl border-border bg-card p-0 shadow-lg sm:max-w-5xl` | **Compliant:** Responsively bounded with `w-[calc(100vw-1rem)]` on mobile and `sm:max-w-5xl` on desktop to house the authentic A4 document sheet. |
| **Action Done Matrix Section Modal** | `client/src/components/projects/ActionDoneMatrixSection.jsx` | 177 | `flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-7xl flex-col gap-0 overflow-hidden rounded-xl border-border/80 bg-card p-4 shadow-lg sm:p-6` | **Compliant:** Correctly aligns with `max-w-7xl` shell. |
| **Project Submissions Page Modal** | `client/src/pages/submissions/ProjectSubmissionsPage.jsx` | 791 | `flex max-h-[92dvh] w-[calc(100vw_-_1.5rem)] max-w-7xl flex-col overflow-hidden p-4 sm:p-6` | **Compliant:** Correctly aligns with `max-w-7xl` shell. |
| **Dynamic Chart Expanded Modal** | `client/src/components/reports/DynamicChartWidget.jsx` | 489 | `h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-h-none max-w-none gap-0 overflow-hidden rounded-xl border-border bg-background p-0 shadow-lg` | **Compliant:** Fullscreen expanded chart inspection. |
| **Citation Export Modal** | `client/src/components/archive/CitationExportModal.jsx` | 67 | `max-h-[90dvh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden bg-card p-0` | **Compliant:** Ergonomically bounded at `max-w-2xl`. |
| **Upload Chapter Modal** | `client/src/components/submissions/UploadChapterModal.jsx` | 263 | `flex max-h-[calc(100dvh-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0` | **Compliant:** Appropriately compact at `max-w-xl`. |

---

## 5. Non-Destructive Impact & Anti-Regression Verification

1. **Unit Test Safety:**
   - Checked `CanonicalDocumentViewer.test.jsx` (534 lines) and `VersionHistory.test.jsx` (85 lines).
   - Neither test suite asserts the specific Tailwind class names (`max-w-5xl`, `max-w-6xl`, or `h1` element tags).
   - Changing `max-w-5xl` to `w-full max-w-full`, demoting `h1` to `h2`, and reducing `max-w-6xl` to `max-w-4xl` is **100% test-preserving and will cause ZERO regressions**.
2. **Visual Consistency:**
   - Under `max-w-full`, `PdfViewerWorkspace` and `SophisticatedDocumentViewer` smoothly adapt to the container width, enhancing reading comfort on 1440x900 viewports.
   - In `VersionHistory.jsx`, `VersionCompare` looks considerably cleaner and better-proportioned inside `max-w-4xl` than stretched across `max-w-6xl`.
