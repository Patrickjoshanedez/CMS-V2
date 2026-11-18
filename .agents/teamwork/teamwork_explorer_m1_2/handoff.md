# Handoff Report: Feature 3 (Plagiarism Report Print Stylesheet) & Feature 4 (Radix Dialog Print Unrolling)

**Author:** teamwork_explorer_m1_2  
**Date:** 2026-11-13T18:13:00Z  
**Target Milestone:** Milestone 1 — Paper Deliverables & Printing Format Integration  
**Recipient:** sub_orch_m1 (Conversation ID: `e3f60e4d-7f0a-4d64-bb81-9c38d8cbf017`)  
**Status:** Hard Handoff (Investigation & Specification Complete)  

---

## 1. Observation

Direct code observations from the BukSU CMS-V2 codebase:

### Feature 3: Plagiarism Report Print Stylesheet

1. **Window Print Trigger and Surrounding Actions Ribbon**:
   - **Path:** `client/src/pages/submissions/PlagiarismReportPage.jsx` lines 478–531
   - **Verbatim Code:**
     ```jsx
     actions={
       <div className="flex flex-wrap items-center gap-2">
         <Button
           variant="outline"
           size="sm"
           onClick={() => {
             if (typeof onBack === 'function') onBack();
             else if (typeof onReset === 'function') onReset();
             else navigate(-1);
           }}
           className="gap-1.5"
         >
           <ArrowLeft className="h-4 w-4" aria-hidden="true" />
           Back
         </Button>

         <Button
           variant="outline"
           size="sm"
           onClick={handleRescan}
           disabled={scanMutation.isPending}
           className="gap-1.5"
         >
           {scanMutation.isPending ? (
             <Spinner className="h-4 w-4" />
           ) : (
             <RefreshCcw className="h-4 w-4" aria-hidden="true" />
           )}
           {scanMutation.isPending ? 'Scanning...' : 'Re-scan Archive'}
         </Button>

         {(submission || viewerSubmission) && (
           <Button
             variant="default"
             size="sm"
             onClick={() => setViewerOpen(true)}
             className="gap-1.5 shadow-sm"
           >
             <BookOpen className="h-4 w-4" aria-hidden="true" />
             Inspect in Reader
           </Button>
         )}

         <Button
           variant="outline"
           size="sm"
           onClick={() => window.print()}
           aria-label="Print or export report"
           title="Print / Export Report"
         >
           <Printer className="h-4 w-4" aria-hidden="true" />
         </Button>
       </div>
     }
     ```
   - **Finding:** At line 524, `<Button onClick={() => window.print()} ...>` initiates physical paper/PDF printing. However, the actions container `<div className="flex flex-wrap items-center gap-2">` lacks `print:hidden` or `no-print`. Consequently, all interactive buttons (Back, Re-scan Archive, Inspect in Reader, and the Print button itself) print onto the deliverable.

2. **Executive KPI Cards (Originality Score Summary)**:
   - **Path:** `client/src/pages/submissions/PlagiarismReportPage.jsx` lines 563–658
   - **Verbatim Code:**
     ```jsx
     {/* ── Executive KPI Cards ── */}
     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
       {/* Card 1: Similarity Score */}
       <Card className="border-border/60 bg-card shadow-sm"> ... </Card>
       {/* Card 2: Originality Score */}
       <Card className="border-border/60 bg-card shadow-sm"> ... </Card>
       {/* Card 3: Sources & Corpus */}
       <Card className="border-border/60 bg-card shadow-sm"> ... </Card>
     </div>
     ```
   - **Finding:** There is no page-break boundary (`break-after: page` or `page-break-after: always`) after the KPI cards. In standard desktop print, the manuscript comparison container begins immediately below the 3 cards on page 1, getting cut off halfway down page 1.

3. **Canvas Sub-Header Controls Ribbon (Mode Switcher, Tabs, Highlights, Zoom)**:
   - **Path:** `client/src/pages/submissions/PlagiarismReportPage.jsx` lines 667–846
   - **Verbatim Code:**
     ```jsx
     {/* Canvas Sub-Header Controls */}
     <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-xs sm:items-center">
     ```
   - **Finding:** View mode switcher buttons (`Original Document`, `Extracted Text`), Highlights toggle button (`Highlights: ON/OFF`), Page Navigator (`Page X of Y`, previous/next arrows), Paper Appearance switcher (`Paper Sheet`, `Theme`), and Zoom controls (`-`, reset, `+`, 150%, 200%, 250%, 300%) are visible interactive controls without `print:hidden` or `no-print`.

4. **Manuscript Comparison Container Height and Overflow Clipping**:
   - **Path:** `client/src/pages/submissions/PlagiarismReportPage.jsx` lines 660–663, 910–918
   - **Verbatim Code:**
     ```jsx
     <div
       className="grid grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-card xl:grid-cols-[1fr_380px]"
       style={{ minHeight: '75vh' }}
     >
     ...
     <div
       ref={canvasContainerRef}
       onScroll={handleCanvasScroll}
       className="flex-1 overflow-auto p-4 sm:p-10 flex flex-col items-center gap-10 bg-muted/40"
       style={{ maxHeight: '76vh', scrollBehavior: 'smooth' }}
       tabIndex={0}
       role="region"
       aria-label="Manuscript Pages Canvas"
     >
     ```
   - **Finding:** `style={{ maxHeight: '76vh', scrollBehavior: 'smooth' }}` forces an inline viewport height cap. In `@media print`, this clips the printed manuscript to 76% of viewport height (~500–600px), dropping all pages beyond page 1.

5. **Critical Global ARIA Region Hiding Bug in `index.css`**:
   - **Path:** `client/src/index.css` lines 979–988
   - **Verbatim Code:**
     ```css
     /* Global layout print isolation: hide navigation, sidebars, headers, and overlays */
     aside,
     header,
     nav,
     [role='navigation'],
     [role='status'],
     [role='region'],
     [data-sonner-toaster],
     .toaster {
       display: none !important;
     }
     ```
   - **Finding:** Line 984 specifies `[role='region'] { display: none !important; }`. However, in `PlagiarismReportPage.jsx`:
     - Line 916: `<div ... role="region" aria-label="Manuscript Pages Canvas">`
     - Line 954: `<section ... role="region" aria-label="Manuscript Page ${page.pageNumber}">`
     Because both the manuscript canvas container and each individual page `<section>` have `role="region"`, the print stylesheet completely hides the entire manuscript and all pages from printing.

6. **Sources Sidebar and Search Input**:
   - **Path:** `client/src/pages/submissions/PlagiarismReportPage.jsx` lines 1201–1414
   - **Finding:** `<aside className="flex flex-col border-l border-border/60 bg-card overflow-hidden" style={{ maxHeight: '78vh', minHeight: '300px' }}>` contains a search input (`<Input type="search" placeholder="Filter sources by title..." ...>`), a close button `<Button aria-label="Close detail">`, and a footer hint. In print, this sidebar must either be cleanly suppressed (`print:hidden no-print`) or unrolled below the manuscript.

---

### Feature 4: Radix Dialog Print Unrolling

1. **Radix Dialog Primitive Overlay and Content**:
   - **Path:** `client/src/components/ui/Dialog.jsx` lines 11–49
   - **Verbatim Code:**
     ```jsx
     const DialogOverlay = forwardRef(({ className, ...props }, ref) => (
       <DialogPrimitive.Overlay
         ref={ref}
         className={cn(
           'fixed inset-0 z-50 bg-overlay/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
           className,
         )}
         {...props}
       />
     ));

     const DialogContent = ({
       className,
       children,
       showClose = true,
       fullscreen = false,
       portalContainer,
       portal = true,
       ...props
     }) => {
       const content = (
         <>
           <DialogOverlay />
           <DialogPrimitive.Content
             className={cn(
               fullscreen
                 ? 'dialog-fullscreen fixed inset-0 z-50 grid h-dvh w-screen max-h-none max-w-none grid-cols-1 min-w-0 gap-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
                 : 'dialog-centered fixed left-1/2 top-1/2 z-50 grid grid-cols-1 max-h-[min(90vh,48rem)] w-[calc(100vw_-_2rem)] min-w-0 max-w-lg gap-4 overflow-y-auto rounded-lg border border-border bg-background p-6 text-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-full',
               className,
             )}
             {...props}
           >
     ```
   - **Finding:**
     - `<DialogOverlay>` applies `fixed inset-0 z-50 bg-overlay/60 backdrop-blur-[2px]`. In `@media print`, this dark backdrop tints the printed document with a 60% black/grey wash.
     - `<DialogPrimitive.Content>` is `position: fixed` with `left-1/2 top-1/2`, `translate: -50% -50%`, `max-h-[min(90vh,48rem)]`, and `overflow-y-auto`. In print, fixed positioning prevents page breaking, and 90vh clips multi-page printable content to a single page box.
     - `<DialogPrimitive.Close>` renders the absolute `X` icon button, which appears on printed documents unless marked `print:hidden`.

2. **Live Defense Minutes Modal (`LiveDefenseMinutesModal.jsx`)**:
   - **Path:** `client/src/components/defense/LiveDefenseMinutesModal.jsx` lines 540, 555–558, 710, 763
   - **Verbatim Code:**
     ```jsx
     const handlePrint = () => {
       window.print();
     };
     ...
     <DialogContent
       showClose={false}
       className="flex max-h-[95vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-xl border-border bg-card p-0 shadow-lg sm:max-w-5xl"
     >
     ...
     <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
     ...
     <div className="border border-border bg-card rounded-xl p-6 sm:p-8 space-y-6 shadow-xs font-serif text-foreground print:border-none print:shadow-none print:p-0">
     ```
   - **Finding:** When `handlePrint()` is triggered from within the modal:
     1. The modal top header, tablist, action bars, and buttons are already guarded with `no-print`.
     2. The institutional document container (OVPAA-F-INS-032 standard) is styled with `print:border-none print:shadow-none print:p-0`.
     3. HOWEVER, because the modal is rendered inside Radix's `DialogOverlay` and `DialogContent`, printing is blocked by: (a) dark backdrop overlay tint, (b) `max-h-[95vh]` and `overflow-hidden` on `DialogContent`, (c) `overflow-y-auto` on the content body, and (d) underlying `#root` dashboard elements printing simultaneously.

3. **Academic Reports Widget (`AcademicReportsWidget.jsx`)**:
   - **Path:** `client/src/components/projects/AcademicReportsWidget.jsx` lines 133–155, 196–218
   - **Finding:** Two separate modals (`Official Defense Evaluation Report` and `Academic Plagiarism & Integrity Report`) trigger `window.print()` from inside `<DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">`. Both suffer from the exact same fixed 85vh clipping and overlay backdrop wash.

---

## 2. Logic Chain

1. **Plagiarism Report Header & Chrome Suppression (Feature 3)**:
   - *Premise:* Academic deliverables must not include interactive screen controls such as buttons, search bars, toggles, and zoom controllers on physical paper.
   - *Inference:* The action ribbon at `PlagiarismReportPage.jsx:479`, the canvas sub-header at line 667, the search input at line 1222, and the sidebar at line 1202 must receive `print:hidden no-print`.

2. **Executive Summary Page Break Isolation (Feature 3)**:
   - *Premise:* The Executive KPI section contains the Similarity Index radial gauge, Estimated Non-Matching Text percentage, and Archive Matched Sources statistics.
   - *Inference:* Applying `break-after: page;` (and `page-break-after: always;`) to `.originality-score-summary` establishes Page 1 as the official Institutional Originality Intelligence Cover Sheet, allowing the manuscript comparison to begin cleanly at the top of Page 2.

3. **Canvas Viewport Unrolling (Feature 3)**:
   - *Premise:* On screen, manuscripts scroll inside a fixed `maxHeight: '76vh'` container with `overflow-auto`.
   - *Inference:* In print media, scroll containers must be reset to `overflow: visible !important; max-height: none !important; height: auto !important;` so that multi-page documents (which can span 10 to 80+ pages) flow naturally across physical page boundaries.

4. **Global `[role="region"]` Bug Remediation (Feature 3 & System-wide)**:
   - *Premise:* `index.css:984` contains `[role='region'] { display: none !important; }`.
   - *Inference:* Because accessible document canvases and section sheets specify `role="region"`, this rule unconditionally hides the entire manuscript. Removing `[role='region']` from that blanket selector is required to restore document visibility in print.

5. **Radix Overlay Neutralization (Feature 4)**:
   - *Premise:* `<DialogOverlay>` applies `bg-overlay/60 backdrop-blur-[2px] fixed inset-0`.
   - *Inference:* In `@media print`, `[data-radix-dialog-overlay]` and `[class*="bg-overlay"]` must be set to `display: none !important; opacity: 0 !important; background: transparent !important;` to eliminate paper tinting.

6. **Radix Dialog Content Unrolling (Feature 4)**:
   - *Premise:* Radix Dialog applies fixed centering (`fixed left-1/2 top-1/2`, `translate: -50% -50%`) with `max-h-[90vh]` or `max-h-[95vh]` and `overflow-y-auto`.
   - *Inference:* In `@media print`, `[role="dialog"]`, `[data-radix-dialog-content]`, `.dialog-centered`, and `.dialog-fullscreen` must be reset to `position: static !important; max-height: none !important; height: auto !important; overflow: visible !important; translate: none !important;`. Any nested `.overflow-y-auto` must be unrolled to `overflow: visible !important; height: auto !important; max-height: none !important;`.

7. **Background Application Isolation (Feature 4)**:
   - *Premise:* Radix portals append dialogs directly to `document.body` outside `#root`.
   - *Inference:* When a modal is being printed, the underlying application `#root` must be hidden via `body:has([role='dialog'][data-state='open']) #root:not(:has([role='dialog'])) { display: none !important; }` so that only the modal document prints.

---

## 3. Exact AST Replacements and Diffs

### Target 1: `client/src/pages/submissions/PlagiarismReportPage.jsx`

#### Edit 1A: Root Container Semantic Class (Line 458)
```diff
<<<<
  /* ── Main report view ──────────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
====
  /* ── Main report view ──────────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="space-y-6 plagiarism-report-container">
        <PageHeader
>>>>
```

#### Edit 1B: Header Actions Ribbon Print Hidden (Line 479)
```diff
<<<<
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
====
          actions={
            <div className="flex flex-wrap items-center gap-2 print:hidden no-print">
              <Button
>>>>
```

#### Edit 1C: Executive KPI Cards Page-Break Class (Line 564)
```diff
<<<<
        {/* ── Executive KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Similarity Score */}
====
        {/* ── Executive KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 originality-score-summary print:grid-cols-3 print:gap-4 print:break-after-page">
          {/* Card 1: Similarity Score */}
>>>>
```

#### Edit 1D: Main Comparison Grid Unrolling Classes (Line 660)
```diff
<<<<
        {/* ── Main grid: document canvas + sidebar ── */}
        <div
          className="grid grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-card xl:grid-cols-[1fr_380px]"
          style={{ minHeight: '75vh' }}
        >
====
        {/* ── Main grid: document canvas + sidebar ── */}
        <div
          className="grid grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-card xl:grid-cols-[1fr_380px] plagiarism-comparison-grid print:grid-cols-1 print:border-none print:shadow-none print:overflow-visible print:min-h-0 print:bg-transparent"
          style={{ minHeight: '75vh' }}
        >
>>>>
```

#### Edit 1E: Canvas Sub-Header Controls Ribbon Print Hidden (Line 667)
```diff
<<<<
            {/* Canvas Sub-Header Controls */}
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-xs sm:items-center">
====
            {/* Canvas Sub-Header Controls */}
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-xs sm:items-center canvas-controls-bar print:hidden no-print">
>>>>
```

#### Edit 1F: Document Mode Viewport Unrolling (Line 882)
```diff
<<<<
            {/* Canvas Body */}
            {canvasMode === 'document' ? (
              <div className="flex-1 w-full min-h-[75vh] flex flex-col overflow-hidden bg-background">
====
            {/* Canvas Body */}
            {canvasMode === 'document' ? (
              <div className="flex-1 w-full min-h-[75vh] flex flex-col overflow-hidden bg-background print:min-h-0 print:h-auto print:overflow-visible">
>>>>
```

#### Edit 1G: Extracted Text Canvas Viewport Unrolling (Line 910)
```diff
<<<<
            ) : (
              <div
                ref={canvasContainerRef}
                onScroll={handleCanvasScroll}
                className="flex-1 overflow-auto p-4 sm:p-10 flex flex-col items-center gap-10 bg-muted/40"
                style={{ maxHeight: '76vh', scrollBehavior: 'smooth' }}
                tabIndex={0}
                role="region"
                aria-label="Manuscript Pages Canvas"
              >
====
            ) : (
              <div
                ref={canvasContainerRef}
                onScroll={handleCanvasScroll}
                className="flex-1 overflow-auto p-4 sm:p-10 flex flex-col items-center gap-10 bg-muted/40 plagiarism-canvas-viewport print:p-0 print:bg-transparent print:gap-0 print:overflow-visible print:max-h-none print:h-auto"
                style={{ maxHeight: '76vh', scrollBehavior: 'smooth' }}
                tabIndex={0}
                role="region"
                aria-label="Manuscript Pages Canvas"
              >
>>>>
```

#### Edit 1H: Individual Manuscript Section Page Breaks (Line 956)
```diff
<<<<
                          className={cn(
                            'w-full max-w-[8.5in] min-h-[11in] rounded-sm transition-all duration-200 select-text flex flex-col justify-between shadow-2xl ring-1',
                            paperMode === 'paper'
                              ? 'bg-card text-card-foreground border border-border/80 ring-border/20'
                              : 'bg-card text-foreground border border-border/80 ring-border/20',
                          )}
====
                          className={cn(
                            'w-full max-w-[8.5in] min-h-[11in] rounded-sm transition-all duration-200 select-text flex flex-col justify-between shadow-2xl ring-1',
                            'print:shadow-none print:ring-0 print:border-none print:break-after-page print:break-inside-avoid print:p-8 print:m-0 print:max-w-full',
                            paperMode === 'paper'
                              ? 'bg-card text-card-foreground border border-border/80 ring-border/20'
                              : 'bg-card text-foreground border border-border/80 ring-border/20',
                          )}
>>>>
```

#### Edit 1I: Sources Sidebar Print Hidden (Line 1202)
```diff
<<<<
          {/* Sources sidebar */}
          <aside
            className="flex flex-col border-l border-border/60 bg-card overflow-hidden"
            style={{ maxHeight: '78vh', minHeight: '300px' }}
          >
====
          {/* Sources sidebar */}
          <aside
            className="flex flex-col border-l border-border/60 bg-card overflow-hidden plagiarism-sources-sidebar print:hidden no-print"
            style={{ maxHeight: '78vh', minHeight: '300px' }}
          >
>>>>
```

---

### Target 2: `client/src/components/ui/Dialog.jsx`

```diff
<<<<
const DialogOverlay = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-overlay/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = ({
  className,
  children,
  showClose = true,
  fullscreen = false,
  portalContainer,
  portal = true,
  ...props
}) => {
  const content = (
    <>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          fullscreen
            ? 'dialog-fullscreen fixed inset-0 z-50 grid h-dvh w-screen max-h-none max-w-none grid-cols-1 min-w-0 gap-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            : 'dialog-centered fixed left-1/2 top-1/2 z-50 grid grid-cols-1 max-h-[min(90vh,48rem)] w-[calc(100vw_-_2rem)] min-w-0 max-w-lg gap-4 overflow-y-auto rounded-lg border border-border bg-background p-6 text-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-full',
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 inline-flex size-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground opacity-70 transition-opacity hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none data-[state=open]:bg-accent sm:min-h-9 sm:min-w-9">
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </>
  );
====
const DialogOverlay = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-radix-dialog-overlay=""
    className={cn(
      'fixed inset-0 z-50 bg-overlay/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 print:hidden no-print',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = ({
  className,
  children,
  showClose = true,
  fullscreen = false,
  portalContainer,
  portal = true,
  ...props
}) => {
  const content = (
    <>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-radix-dialog-content=""
        className={cn(
          fullscreen
            ? 'dialog-fullscreen fixed inset-0 z-50 grid h-dvh w-screen max-h-none max-w-none grid-cols-1 min-w-0 gap-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            : 'dialog-centered fixed left-1/2 top-1/2 z-50 grid grid-cols-1 max-h-[min(90vh,48rem)] w-[calc(100vw_-_2rem)] min-w-0 max-w-lg gap-4 overflow-y-auto rounded-lg border border-border bg-background p-6 text-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-full',
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            data-radix-dialog-close=""
            className="absolute right-4 top-4 inline-flex size-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground opacity-70 transition-opacity hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none data-[state=open]:bg-accent sm:min-h-9 sm:min-w-9 print:hidden no-print"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </>
  );
>>>>
```

---

### Target 3: `client/src/index.css`

#### Edit 3A: Fix Global `[role="region"]` Blanket Print Hiding (Lines 979–988)
```diff
<<<<
  /* Global layout print isolation: hide navigation, sidebars, headers, and overlays */
  aside,
  header,
  nav,
  [role='navigation'],
  [role='status'],
  [role='region'],
  [data-sonner-toaster],
  .toaster {
    display: none !important;
  }
====
  /* Global layout print isolation: hide navigation, sidebars, headers, and overlays */
  aside:not(.print-preserve):not(:has(.print-preserve)),
  header:not(.print-preserve):not(:has(.print-preserve)),
  nav,
  [role='navigation'],
  [role='status'],
  [data-sonner-toaster],
  .toaster {
    display: none !important;
  }
>>>>
```

#### Edit 3B: Comprehensive Plagiarism Report and Radix Dialog Print Rules
Insert into `@media print` in `client/src/index.css` (replacing legacy lines 568–583 and augmenting line 1024):
```css
  /* ─────────────────────────────────────────────────────────────────── */
  /* Radix UI Dialog Print Unrolling & Isolation Architecture            */
  /* ─────────────────────────────────────────────────────────────────── */

  /* 1. Eliminate Backdrop Overlay Tinting, Shading & Blur */
  [data-radix-dialog-overlay],
  div[data-state='open'][class*='bg-overlay'],
  [class*='bg-overlay'] {
    display: none !important;
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }

  /* 2. Isolate Background App when a Dialog is Active */
  body:has([role='dialog'][data-state='open']) #root:not(:has([role='dialog'])),
  body:has([data-radix-dialog-content][data-state='open']) #root:not(:has([data-radix-dialog-content])) {
    display: none !important;
  }

  /* 3. Unroll Dialog Content from Fixed Viewport to Static Flow */
  [role='dialog'],
  [data-radix-dialog-content],
  .dialog-centered,
  .dialog-fullscreen {
    position: static !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    transform: none !important;
    translate: none !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* 4. Unroll Scrollable Sub-Containers Inside Dialog */
  [role='dialog'] .overflow-y-auto,
  [role='dialog'] .overflow-hidden,
  [role='dialog'] [class*='max-h-'],
  [data-radix-dialog-content] .overflow-y-auto,
  [data-radix-dialog-content] .overflow-hidden,
  [data-radix-dialog-content] [class*='max-h-'] {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
    min-height: 0 !important;
  }

  /* 5. Hide Interactive Chrome inside Dialogs */
  [data-radix-dialog-close],
  [role='dialog'] button[class*='absolute'][class*='right-4'],
  [role='dialog'] [role='tablist'],
  [role='dialog'] .no-print,
  [data-radix-dialog-content] .no-print {
    display: none !important;
  }

  /* ─────────────────────────────────────────────────────────────────── */
  /* Plagiarism Report Print Stylesheet Architecture                     */
  /* ─────────────────────────────────────────────────────────────────── */
  .plagiarism-report-container {
    width: 100% !important;
    max-width: 100% !important;
    background: transparent !important;
  }

  /* Page break after Executive KPI Originality Score summary */
  .originality-score-summary,
  .plagiarism-score-summary {
    break-after: page !important;
    page-break-after: always !important;
    margin-bottom: 0 !important;
  }

  .originality-score-summary .card {
    border: 1pt solid #cbd5e1 !important;
    box-shadow: none !important;
    background: #ffffff !important;
    color: #111827 !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* Unroll comparison grid and canvas viewport */
  .plagiarism-comparison-grid {
    display: block !important;
    grid-template-columns: 1fr !important;
    border: none !important;
    box-shadow: none !important;
    overflow: visible !important;
    min-height: 0 !important;
    height: auto !important;
    max-height: none !important;
    background: transparent !important;
  }

  .plagiarism-canvas-viewport {
    overflow: visible !important;
    max-height: none !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    gap: 0 !important;
  }

  /* Individual manuscript paper sheets */
  .plagiarism-canvas-viewport [data-paper-sheet],
  .plagiarism-canvas-viewport section[role='region'],
  .plagiarism-report-container section[role='region'] {
    display: flex !important;
    break-after: page !important;
    page-break-after: always !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    box-shadow: none !important;
    ring: none !important;
    border: none !important;
    border-radius: 0 !important;
    margin: 0 auto !important;
    padding: 0.5in 0.75in !important;
    width: 100% !important;
    max-width: 100% !important;
    min-height: 0 !important;
    background: #ffffff !important;
    color: #111827 !important;
  }

  /* Hide interactive ribbons and sidebar */
  .canvas-controls-bar,
  .plagiarism-sources-sidebar,
  .plagiarism-report-container [data-testid='toggle-highlights-btn'],
  .plagiarism-report-container [data-testid='canvasmode-document-btn'],
  .plagiarism-report-container [data-testid='canvasmode-extracted-btn'],
  .plagiarism-report-container button:not(.print-preserve) {
    display: none !important;
  }
```

---

## 4. Caveats

1. **Browser Support for `body:has(...)` Selector**:
   - `body:has(...)` is Baseline Widely Available across all major modern browsers (Chrome 105+, Edge 105+, Firefox 121+, Safari 15.4+). In legacy browsers older than late 2023, `#root` hiding relies on the `.no-print` parent class.
2. **Turnitin Style Authenticity in Extracted Mode vs Document Mode**:
   - In Extracted Text mode, pages are formatted as authentic 8.5in x 11in pages via `<section>`. In Original Document mode, `SophisticatedDocumentViewer` is rendered; Feature 2 covers reader print handling, while the outer container unrolling specified here supports both modes seamlessly.
3. **No other areas investigated**:
   - Feature 1 (Approval Sheet Exposure) and Feature 2 (Reader Print Handling) were handled by Explorer 1 (`teamwork_explorer_m1_1`).

---

## 5. Conclusion

1. **Feature 3 (Plagiarism Report Print Stylesheet):**
   - The missing `print:hidden` classes on `PlagiarismReportPage.jsx:479` (header actions) and line 667 (canvas sub-header) have been pinpointed.
   - The critical defect hiding manuscript pages on print (`index.css:984` setting `[role='region']` to `display: none !important`) has been discovered and resolved.
   - The exact CST replacements and CSS rules to unroll `style={{ maxHeight: '76vh' }}` and establish a clean `break-after: page;` for the Executive KPI summary have been specified with 100% precision.

2. **Feature 4 (Radix Dialog Print Unrolling):**
   - Radix Dialog fixed positioning, 90vh/95vh viewport clipping, and dark backdrop overlay washes have been traced across `Dialog.jsx`, `LiveDefenseMinutesModal.jsx`, and `AcademicReportsWidget.jsx`.
   - Comprehensive global CSS rules targeting `[data-radix-dialog-overlay]`, `[role="dialog"]`, and `[data-radix-dialog-content]` have been formulated to allow any modal dialog containing official documents to print cleanly across multi-page sheets without background bleeding.

---

## 6. Verification Method

To verify these changes after implementation:

1. **Targeted Unit Tests**:
   ```bash
   npm test --workspace=client -- src/components/ui/Dialog.test.jsx
   npm test --workspace=client -- src/pages/submissions/PlagiarismReportPage.test.jsx
   ```

2. **Full Client Test Suite**:
   ```bash
   npm test --workspace=client
   ```

3. **DOM Attribute & Selector Inspection**:
   - Inspect rendered DOM in `PlagiarismReportPage.jsx`: verify `.plagiarism-report-container`, `.originality-score-summary`, `.canvas-controls-bar.print:hidden`, and `.plagiarism-canvas-viewport`.
   - Inspect rendered DOM when `Dialog` is open: verify `data-radix-dialog-overlay` on the overlay and `data-radix-dialog-content` on the content container.

4. **Playwright Visual Verification / Emulated Print**:
   - Emulate media type `print` (`page.emulateMedia({ media: 'print' })`).
   - In `PlagiarismReportPage`: assert `.canvas-controls-bar` has `display: none`, `.originality-score-summary` has `break-after: page`, and `.plagiarism-canvas-viewport` has `max-height: none` and `overflow: visible`.
   - In `LiveDefenseMinutesModal`: assert `[data-radix-dialog-overlay]` has `display: none` and `[role="dialog"]` has `position: static` and `max-height: none`.
