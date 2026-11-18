# Investigation Report & Handoff: Feature 1 & Feature 2 (Milestone 1)

**Investigator**: `teamwork_explorer_m1_1`  
**Milestone**: Milestone 1 — Paper Deliverables & Printing Format Integration  
**Scope**: 
- **Feature 1**: Expose Final Approval Sheet in UI (`useProjects.js`, `CertificatePage.jsx`, `ActionDoneMatrixTab.jsx`, `ProjectSubmissionsPage.jsx`)
- **Feature 2**: Document Reader Print Handling (`SophisticatedDocumentViewer.jsx`, `index.css`)

---

## 1. Observation

Direct observations from targeted inspection of the CMS-V2 codebase:

### 1.1 Backend Endpoint & Service Contract
- **Route Definition**: `server/modules/projects/project.routes.js:530`
  ```javascript
  router.get('/:id/certificate', projectController.getCertificateUrl);
  router.get('/:id/approval-sheet', projectController.getApprovalSheetUrl);
  ```
  The route requires authentication (`router.use(authenticate)` at line 63). Any authenticated project participant can access it.
- **Controller Implementation**: `server/modules/projects/project.controller.js:661-664`
  ```javascript
  export const getApprovalSheetUrl = catchAsync(async (req, res) => {
    const approvalSheet = await projectService.getApprovalSheetUrl(req.params.id, req.user);
    res.status(HTTP_STATUS.OK).json({ success: true, data: approvalSheet });
  });
  ```
- **Service Implementation**: `server/modules/projects/services/projectArchive.service.js:1099-1132`
  - Validates requester: If the user is a `student`, verifies team membership or returns HTTP 403 `FORBIDDEN`.
  - Validates document availability: If `!project.approvalSheetStorageKey`, returns HTTP 404 with error code `'APPROVAL_SHEET_NOT_FOUND'` and message `'The final approval sheet is not available yet.'`.
  - When present, signs the S3/MinIO storage key for 3600 seconds and returns:
    ```javascript
    return {
      url, // Pre-signed S3/MinIO download URL (application/pdf)
      generatedAt: project.approvalSheetGeneratedAt,
      verificationHash: project.approvalSheetVerificationHash,
    };
    ```
- **Generation Trigger**: `server/modules/projects/services/projectArchive.service.js:709-714`
  The approval sheet is automatically generated during project archival (`archiveProject`) when Phase 4 final committee signatures (Adviser, Panelists, Chair, Dean) are verified.

### 1.2 Client API Service Layer
- **Client Service**: `client/src/services/authService.js:241`
  ```javascript
  getApprovalSheetUrl: (id) => api.get(`/projects/${id}/approval-sheet`),
  ```
  The raw HTTP client call is already implemented on `projectService`.

### 1.3 React Query Hooks
- **File**: `client/src/hooks/useProjects.js`
  - `projectKeys` (lines 21-34) defines keys for `all`, `lists`, `details`, `my`, `prototypes`, `archive`, `certificate`, `reports`, and `titleCheck`. **`approvalSheet` query key is currently missing.**
  - Query hooks (lines 378-390) contain `useCertificateUrl(projectId)`, but **no hook `useApprovalSheetUrl` exists.**

### 1.4 Feature 1 UI Targets
1. **Certificate Page**:
   - Actual path: `client/src/pages/projects/CertificatePage.jsx` (Note: SCOPE.md listed `client/src/pages/CertificatePage.jsx`, but actual location is under `pages/projects/CertificatePage.jsx`).
   - Lines 25-38: Calls `useCertificateUrl(projectId)`.
   - Lines 124-236: Renders a single `<Card>` for "Completion Certificate" with Preview (opens `SophisticatedDocumentViewer`), Download, and Upload (if instructor).
   - Currently, there is **no Card, section, or action for the Final Approval Sheet** on this page.
2. **Action Done Matrix (ADM) Tab**:
   - Path: `client/src/components/projects/ActionDoneMatrixTab.jsx`.
   - Top action bar (lines 743-841) houses buttons for "Upload Hearing Defense Minutes", "Submit for Secretary Endorsement", "Sign & Endorse Matrix", "Balance Pages", "Add Continuation Page", "Add Row", and "Print / Export Document".
   - Final Sign-off Sheet (lines 1260-1288) renders Tier 3 Committee Chair signature card.
   - Currently, there is **no link or button to view or download the generated Approval Sheet** once Tier 3 digital signatures are completed and the sheet is compiled.
3. **Project Submissions Page**:
   - Path: `client/src/pages/submissions/ProjectSubmissionsPage.jsx`.
   - Lines 733-787: Renders Phase 4 ("Capstone 3: Final Defense & Manuscript Archival") with `FinalPaperUpload` and `ActionDoneMatrixSection` (`milestone="CAPSTONE_3"`).
   - Currently, there is **no UI component or button exposing the Final Approval Sheet** for student or faculty verification.

### 1.5 Feature 2: SophisticatedDocumentViewer & Print Handling
- **File**: `client/src/components/documents/SophisticatedDocumentViewer.jsx`
  - **Imports** (lines 3-22): Imports icons `X, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Download, FileText, BookOpen, Info, CheckCircle2, Clock, AlertCircle, ShieldCheck, GitCommit, Sliders, MessageSquare, ShieldAlert`. **`Printer` is not imported.**
  - **Header Actions** (lines 889-946): Action group contains `Details` button (opens Sheet drawer), `Download` button (`onClick={handleDownload}`), Fullscreen toggle, and Close button. **No Print button is present.**
  - **Layout & Overflow Clipping**:
    - Outer container (line 526): `className="relative flex flex-col h-full w-full bg-background text-foreground border border-border/60 rounded-xl overflow-hidden shadow-2xl ..."`
    - Toolbar `<header>` (line 533): Lacks `no-print print:hidden`, meaning the toolbar, zoom controls, and details button print on top of the document.
    - Canvas root (line 950): `<div className="relative flex-1 flex overflow-hidden bg-muted/20">`
    - Content canvas (line 952): `<main className="min-w-0 flex-1 flex flex-col overflow-hidden">`
    - DOCX render container (line 1727): `<div className="flex-1 overflow-auto bg-muted">`
    - DOCX zoom wrapper (line 1729): `<div className="docx-zoom-wrapper w-max min-w-full origin-top-left" style={{ zoom: zoom / 100, width: 'max-content', minWidth: '100%' }}>`
      - Under print, `overflow-auto`, `overflow-hidden`, and `zoom: zoom / 100` cause severe clipping: only the first page's viewport height is printed, scrollbars appear, and pages are shrunk or cut off.
- **Global Print Stylesheet**: `client/src/index.css`
  - Lines 953-1072 define `@media print` rules for `.adm-document-page`, `.secretary-minutes-page`, and general `.no-print`.
  - **Missing**: Rules to unroll `.docx-outer-container`, `.docx-wrapper`, `.docx-zoom-wrapper`, and Radix Dialog containers (`[role='dialog']`) wrapping `SophisticatedDocumentViewer`.

---

## 2. Logic Chain

1. **Backend Readiness**:
   - The backend route `GET /api/projects/:id/approval-sheet` and client service `projectService.getApprovalSheetUrl` already exist and return `{ url, generatedAt, verificationHash }`.
   - Therefore, no backend changes or endpoint additions are needed. All work is client-side.

2. **React Query State Management**:
   - Because `useCertificateUrl` is the established pattern for signed PDF deliverables, creating `useApprovalSheetUrl` in `client/src/hooks/useProjects.js` following the identical pattern provides idiomatic caching, background revalidation, and error handling.
   - Setting `retry: (failureCount, error) => error?.response?.status !== 404 && failureCount < 2` prevents noisy continuous retries when a project has not yet reached archival.

3. **UI Integration Scope (Feature 1)**:
   - **`CertificatePage.jsx`**: Should present a two-card layout or secondary card for "Final Approval Sheet". If available, it renders document metadata (QR verification hash, generated date), with "Preview" (opens `SophisticatedDocumentViewer`), "Download" (direct PDF link), and "Print" actions.
   - **`ActionDoneMatrixTab.jsx`**: In the top action bar and beneath Tier 3 sign-offs on the final sheet, an "Approval Sheet" trigger allows reviewers and students to immediately review and verify the signed approval sheet.
   - **`ProjectSubmissionsPage.jsx`**: In Phase 4, an institutional card for "Final Approval Sheet" provides direct access to view, download, or print the signed approval sheet once archival is complete.

4. **Viewer Print Optimization (Feature 2)**:
   - Adding `<Button onClick={handlePrint}><Printer className="h-3.5 w-3.5" /> Print</Button>` to the toolbar action group gives users a 1-click print experience matching the existing Download button.
   - To prevent page clipping, `SophisticatedDocumentViewer` containers must toggle from `overflow-hidden` and `overflow-auto` to `overflow: visible; height: auto; max-height: none;` during `@media print`.
   - The toolbar `<header>` must be flagged `no-print print:hidden` so browser print output contains only the clean paper manuscript.
   - `.docx-zoom-wrapper` must force `zoom: 1 !important; transform: none !important; width: 100% !important;` during print so user zoom settings do not distort paper printing.
   - Global unrolling in `client/src/index.css` for `.docx-outer-container` and `[role='dialog']` ensures Radix modal presentation unrolls cleanly across physical pages without dark overlay bleeds.

---

## 3. Caveats

1. **Approval Sheet Availability Window**:
   - `project.approvalSheetStorageKey` is generated in backend `projectArchive.service.js` only upon project archival (`capstonePhase === 3` or Phase 4 with full digital signatures).
   - In earlier phases (Phase 1, 2, 3), `GET /api/projects/:id/approval-sheet` returns HTTP 404 (`APPROVAL_SHEET_NOT_FOUND`). UI components must handle 404 gracefully (displaying an informative alert or hiding the button until available) without throwing runtime errors or rendering broken states.
2. **PDF vs DOCX in Print**:
   - DOCX files rendered via `docx-preview` render directly into the DOM as HTML/CSS (`.docx-wrapper > .docx`). Unrolling these DOM nodes via CSS allows `window.print()` to print all pages natively.
   - When viewing PDF manuscripts via native `<iframe>`, some browsers isolate the iframe print context. Calling `iframe.contentWindow.print()` directly when `useLegacyIframe` is active ensures reliable printing, with fallback to `window.print()`.

---

## 4. Conclusion & Proposed AST Diffs

### 4.1 Changes to `client/src/hooks/useProjects.js`

#### Location: `client/src/hooks/useProjects.js` (Query Keys, lines 21-34)
```diff
--- a/client/src/hooks/useProjects.js
+++ b/client/src/hooks/useProjects.js
@@ -31,3 +31,4 @@ export const projectKeys = {
   certificate: (id) => [...projectKeys.detail(id), 'certificate'],
+  approvalSheet: (id) => [...projectKeys.detail(id), 'approval-sheet'],
   reports: (filters) => [...projectKeys.all, 'reports', filters],
```

#### Location: `client/src/hooks/useProjects.js` (Query Hooks, after line 390)
```diff
--- a/client/src/hooks/useProjects.js
+++ b/client/src/hooks/useProjects.js
@@ -390,3 +390,19 @@ export function useCertificateUrl(projectId, options = {}) {
   });
 }
+
+/** Get final approval sheet download/view URL */
+export function useApprovalSheetUrl(projectId, options = {}) {
+  return useQuery({
+    queryKey: projectKeys.approvalSheet(projectId),
+    queryFn: async () => {
+      const { data } = await projectService.getApprovalSheetUrl(projectId);
+      return data.data; // { url, verificationHash, generatedAt }
+    },
+    enabled: !!projectId,
+    staleTime: 30 * 60 * 1000, // 30 min — signed URLs last 1hr
+    retry: (failureCount, error) => {
+      const status = error?.response?.status;
+      if (status === 404 || status === 403) return false;
+      return failureCount < 2;
+    },
+    ...options,
+  });
+}
```

---

### 4.2 Changes to `client/src/pages/projects/CertificatePage.jsx`

#### Location: `client/src/pages/projects/CertificatePage.jsx` (Imports & State)
```diff
--- a/client/src/pages/projects/CertificatePage.jsx
+++ b/client/src/pages/projects/CertificatePage.jsx
@@ -4,4 +4,4 @@ import { toast } from 'sonner';
-import { Upload, Download, FileText, Eye } from 'lucide-react';
+import { Upload, Download, FileText, Eye, Printer, FileCheck } from 'lucide-react';
 import { useAuthStore } from '@/stores/authStore';
-import { useUploadCertificate, useCertificateUrl } from '@/hooks/useProjects';
+import { useUploadCertificate, useCertificateUrl, useApprovalSheetUrl } from '@/hooks/useProjects';
 import { ROLES } from '@cms/shared';
@@ -23,3 +23,5 @@ export default function CertificatePage() {
   const [previewOpen, setPreviewOpen] = useState(false);
+  const [approvalPreviewOpen, setApprovalPreviewOpen] = useState(false);
 
   const { data: certData, isLoading, isError, error, refetch } = useCertificateUrl(projectId);
+  const { data: approvalData, isLoading: isApprovalLoading } = useApprovalSheetUrl(projectId);
   const uploadMutation = useUploadCertificate();
```

#### Location: `client/src/pages/projects/CertificatePage.jsx` (Content Rendering, after Card at line 236)
```diff
--- a/client/src/pages/projects/CertificatePage.jsx
+++ b/client/src/pages/projects/CertificatePage.jsx
@@ -236,3 +236,75 @@ export default function CertificatePage() {
         </Card>
+
+        {/* Final Approval Sheet Card */}
+        <Card className="max-w-3xl border-border/60">
+          <CardHeader>
+            <CardTitle className="text-lg flex items-center gap-2">
+              <FileCheck className="h-5 w-5 text-primary" />
+              Final Approval Sheet
+            </CardTitle>
+            <CardDescription>
+              Certified institutional approval sheet carrying digital endorsements from the Adviser,
+              Panelists, Committee Chair, and Dean.
+            </CardDescription>
+          </CardHeader>
+
+          <CardContent className="space-y-4">
+            {approvalData?.url ? (
+              <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
+                <div className="flex items-center gap-3">
+                  <FileText className="h-8 w-8 text-primary" />
+                  <div>
+                    <p className="font-medium text-foreground">Final Approval Sheet</p>
+                    <Badge variant="outline" className="mt-1 border-success/40 bg-success/10 text-success text-[10px] font-mono">
+                      Official Signed Sheet
+                    </Badge>
+                    {approvalData.verificationHash && (
+                      <p
+                        className="mt-2 max-w-[min(72vw,360px)] truncate font-mono text-xs text-muted-foreground"
+                        title={approvalData.verificationHash}
+                      >
+                        Verification: {approvalData.verificationHash}
+                      </p>
+                    )}
+                  </div>
+                </div>
+                <div className="flex flex-wrap items-center gap-2">
+                  <Button
+                    type="button"
+                    variant="outline"
+                    size="sm"
+                    className="min-h-[44px]"
+                    onClick={() => setApprovalPreviewOpen(true)}
+                    data-testid="preview-approval-sheet-btn"
+                  >
+                    <Eye className="h-4 w-4 mr-2" />
+                    Preview
+                  </Button>
+                  <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
+                    <a
+                      href={approvalData.url}
+                      target="_blank"
+                      rel="noopener noreferrer"
+                      download="Final_Approval_Sheet.pdf"
+                    >
+                      <Download className="h-4 w-4 mr-2" />
+                      Download
+                    </a>
+                  </Button>
+                </div>
+              </div>
+            ) : (
+              <Alert>
+                <AlertDescription>
+                  The final approval sheet has not been generated yet. It is automatically compiled upon
+                  manuscript archival after all committee digital signatures are completed.
+                </AlertDescription>
+              </Alert>
+            )}
+          </CardContent>
+        </Card>
       </div>
 
@@ -251,3 +323,17 @@ export default function CertificatePage() {
       )}
+
+      {approvalPreviewOpen && approvalData?.url && (
+        <SophisticatedDocumentViewer
+          open={approvalPreviewOpen}
+          onOpenChange={setApprovalPreviewOpen}
+          fileUrl={approvalData.url}
+          submission={{
+            title: 'Final Approval Sheet',
+            fileName: 'Final_Approval_Sheet.pdf',
+            fileType: 'application/pdf',
+            chapter: 'Approval Sheet',
+          }}
+        />
+      )}
     </DashboardLayout>
```

---

### 4.3 Changes to `client/src/components/projects/ActionDoneMatrixTab.jsx`

#### Location: `client/src/components/projects/ActionDoneMatrixTab.jsx` (Imports & Hook)
```diff
--- a/client/src/components/projects/ActionDoneMatrixTab.jsx
+++ b/client/src/components/projects/ActionDoneMatrixTab.jsx
@@ -24,3 +24,5 @@ import SignaturePad from '@/components/ui/SignaturePad';
+import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';
+import { useApprovalSheetUrl } from '@/hooks/useProjects';
 import {
@@ -37,3 +39,5 @@ import {
   FileText,
   Layers,
+  FileCheck,
+  Eye,
 } from 'lucide-react';
@@ -120,2 +124,7 @@ export default function ActionDoneMatrixTab({
+  const { data: approvalSheetData } = useApprovalSheetUrl(project?._id, {
+    enabled: Boolean(project?._id && (project?.isArchived || project?.approvalSheetStorageKey || admSignatures?.chair?.signedAt)),
+  });
+  const [isApprovalViewerOpen, setIsApprovalViewerOpen] = useState(false);
+
```

#### Location: `client/src/components/projects/ActionDoneMatrixTab.jsx` (Action Bar, line 841)
```diff
--- a/client/src/components/projects/ActionDoneMatrixTab.jsx
+++ b/client/src/components/projects/ActionDoneMatrixTab.jsx
@@ -840,3 +840,15 @@ export default function ActionDoneMatrixTab({
                   Print / Export Document
                 </Button>
+
+                {approvalSheetData?.url && (
+                  <Button
+                    type="button"
+                    variant="outline"
+                    size="sm"
+                    onClick={() => setIsApprovalViewerOpen(true)}
+                    className="gap-1.5 text-xs h-8 border-primary/40 text-primary hover:bg-primary/5"
+                    title="View Generated Final Approval Sheet"
+                    data-testid="adm-view-approval-sheet-btn"
+                  >
+                    <FileCheck className="h-3.5 w-3.5 text-primary" />
+                    Approval Sheet
+                  </Button>
+                )}
               </div>
             </div>
```

#### Location: `client/src/components/projects/ActionDoneMatrixTab.jsx` (Modal Mount, after line 1350)
```diff
--- a/client/src/components/projects/ActionDoneMatrixTab.jsx
+++ b/client/src/components/projects/ActionDoneMatrixTab.jsx
@@ -1350,3 +1350,17 @@ export default function ActionDoneMatrixTab({
+      {isApprovalViewerOpen && approvalSheetData?.url && (
+        <SophisticatedDocumentViewer
+          open={isApprovalViewerOpen}
+          onOpenChange={setIsApprovalViewerOpen}
+          fileUrl={approvalSheetData.url}
+          submission={{
+            title: 'Final Approval Sheet',
+            fileName: 'Final_Approval_Sheet.pdf',
+            fileType: 'application/pdf',
+            chapter: 'Approval Sheet',
+          }}
+        />
+      )}
```

---

### 4.4 Changes to `client/src/pages/submissions/ProjectSubmissionsPage.jsx`

#### Location: `client/src/pages/submissions/ProjectSubmissionsPage.jsx` (Imports & Hook)
```diff
--- a/client/src/pages/submissions/ProjectSubmissionsPage.jsx
+++ b/client/src/pages/submissions/ProjectSubmissionsPage.jsx
@@ -28,3 +28,4 @@ import DeadlineWarning from '@/components/projects/DeadlineWarning';
-import { useMyProject, useProject } from '@/hooks/useProjects';
+import { useMyProject, useProject, useApprovalSheetUrl } from '@/hooks/useProjects';
 import { useProjectSubmissions } from '@/hooks/useSubmissions';
+import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';
@@ -42,3 +43,6 @@ import {
   Lock,
   X,
+  Eye,
+  Download,
+  FileCheck,
 } from 'lucide-react';
@@ -254,3 +258,6 @@ export default function ProjectSubmissionsPage() {
   const [openAdmMilestone, setOpenAdmMilestone] = useState(null);
   const [showGanttModal, setShowGanttModal] = useState(false);
+  const [showApprovalSheetViewer, setShowApprovalSheetViewer] = useState(false);
+  const { data: approvalSheetData } = useApprovalSheetUrl(activeProject?._id, {
+    enabled: Boolean(activeProject?._id && (activeProject?.isArchived || activeProject?.approvalSheetStorageKey || activeProject?.projectStatus === 'archived')),
+  });
```

#### Location: `client/src/pages/submissions/ProjectSubmissionsPage.jsx` (Phase 4 Section, line 773)
```diff
--- a/client/src/pages/submissions/ProjectSubmissionsPage.jsx
+++ b/client/src/pages/submissions/ProjectSubmissionsPage.jsx
@@ -772,3 +772,49 @@ export default function ProjectSubmissionsPage() {
           />
+
+          {/* Final Approval Sheet Deliverable Card */}
+          {approvalSheetData?.url && (
+            <Card className="border-primary/30 bg-primary/[0.03]">
+              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3">
+                <div className="flex items-center gap-3">
+                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
+                    <FileCheck className="h-5 w-5" />
+                  </div>
+                  <div>
+                    <div className="flex items-center gap-2">
+                      <h3 className="text-sm font-bold text-foreground">Final Approval Sheet</h3>
+                      <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[10px] font-mono">
+                        Official Document
+                      </Badge>
+                    </div>
+                    <p className="text-xs text-muted-foreground mt-0.5">
+                      Certified completion sheet with panel, adviser, chair, and dean signatures.
+                    </p>
+                  </div>
+                </div>
+                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
+                  <Button
+                    variant="outline"
+                    size="sm"
+                    onClick={() => setShowApprovalSheetViewer(true)}
+                    className="min-h-9 text-xs gap-1.5"
+                    data-testid="view-approval-sheet-btn"
+                  >
+                    <Eye className="h-3.5 w-3.5" />
+                    View
+                  </Button>
+                  <Button
+                    variant="outline"
+                    size="sm"
+                    asChild
+                    className="min-h-9 text-xs gap-1.5"
+                  >
+                    <a href={approvalSheetData.url} target="_blank" rel="noopener noreferrer" download="Final_Approval_Sheet.pdf">
+                      <Download className="h-3.5 w-3.5" />
+                      Download
+                    </a>
+                  </Button>
+                </div>
+              </CardContent>
+            </Card>
+          )}
           <ActionDoneMatrixSection
@@ -850,3 +896,17 @@ export default function ProjectSubmissionsPage() {
         />
+
+        {showApprovalSheetViewer && approvalSheetData?.url && (
+          <SophisticatedDocumentViewer
+            open={showApprovalSheetViewer}
+            onOpenChange={setShowApprovalSheetViewer}
+            fileUrl={approvalSheetData.url}
+            submission={{
+              title: 'Final Approval Sheet',
+              fileName: 'Final_Approval_Sheet.pdf',
+              fileType: 'application/pdf',
+              chapter: 'Approval Sheet',
+            }}
+          />
+        )}
       </div>
     </DashboardLayout>
```

---

### 4.5 Changes to `client/src/components/documents/SophisticatedDocumentViewer.jsx`

#### Location: `client/src/components/documents/SophisticatedDocumentViewer.jsx` (Imports & Print Handler)
```diff
--- a/client/src/components/documents/SophisticatedDocumentViewer.jsx
+++ b/client/src/components/documents/SophisticatedDocumentViewer.jsx
@@ -10,3 +10,4 @@ import {
   Download,
+  Printer,
   FileText,
@@ -516,3 +517,17 @@ export default function SophisticatedDocumentViewer({
   };
 
+  const handlePrint = useCallback(() => {
+    if (isPdf && useLegacyIframe) {
+      try {
+        const iframe = document.querySelector('iframe[title="Manuscript PDF Viewer"]');
+        if (iframe?.contentWindow) {
+          iframe.contentWindow.focus();
+          iframe.contentWindow.print();
+          return;
+        }
+      } catch {
+        // Fallback to window.print()
+      }
+    }
+    window.print();
+  }, [isPdf, useLegacyIframe]);
+
```

#### Location: `client/src/components/documents/SophisticatedDocumentViewer.jsx` (Toolbar Print Button & Print Utility Classes)
```diff
--- a/client/src/components/documents/SophisticatedDocumentViewer.jsx
+++ b/client/src/components/documents/SophisticatedDocumentViewer.jsx
@@ -526,3 +541,3 @@ export default function SophisticatedDocumentViewer({
       <div
-        className={`relative flex flex-col h-full w-full bg-background text-foreground border border-border/60 rounded-xl overflow-hidden shadow-2xl ${className} ${
+        className={`relative flex flex-col h-full w-full bg-background text-foreground border border-border/60 rounded-xl overflow-hidden shadow-2xl print:border-0 print:shadow-none print:rounded-none print:overflow-visible print:h-auto print:bg-white print:text-black ${className} ${
           isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : ''
@@ -533,3 +548,3 @@ export default function SophisticatedDocumentViewer({
         {/* ── Top Control Bar ── */}
-        <header className="shrink-0 flex flex-wrap items-center justify-between border-b border-border/60 bg-muted/30 px-3 sm:px-4 py-2 sm:py-2.5 gap-2 sm:gap-4 min-h-[48px] [&_button]:min-h-[44px] [&_button]:min-w-[44px] sm:[&_button]:min-h-0 sm:[&_button]:min-w-0">
+        <header className="shrink-0 flex flex-wrap items-center justify-between border-b border-border/60 bg-muted/30 px-3 sm:px-4 py-2 sm:py-2.5 gap-2 sm:gap-4 min-h-[48px] [&_button]:min-h-[44px] [&_button]:min-w-[44px] sm:[&_button]:min-h-0 sm:[&_button]:min-w-0 no-print print:hidden">
           {/* Left: Document Identity */}
@@ -920,3 +935,14 @@ export default function SophisticatedDocumentViewer({
             </Button>
 
+            <Button
+              type="button"
+              variant="outline"
+              size="sm"
+              onClick={handlePrint}
+              className="h-8 px-2.5 text-xs gap-1.5 border-border/60 hover:bg-muted text-foreground no-print print:hidden"
+              title="Print manuscript document"
+              aria-label="Print manuscript document"
+              data-testid="document-viewer-print-btn"
+            >
+              <Printer className="h-3.5 w-3.5" />
+              <span className="hidden md:inline">Print</span>
+            </Button>
+
             <Button
@@ -950,3 +976,3 @@ export default function SophisticatedDocumentViewer({
         {/* ── Main Canvas Area ── */}
-        <div className="relative flex-1 flex overflow-hidden bg-muted/20">
+        <div className="relative flex-1 flex overflow-hidden bg-muted/20 print:overflow-visible print:bg-white print:h-auto print:block">
           {/* Document Content Canvas */}
-          <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
+          <main className="min-w-0 flex-1 flex flex-col overflow-hidden print:overflow-visible print:h-auto print:block">
@@ -1727,3 +1753,3 @@ function DocxPreviewRenderer({
       {/* docx-preview render target — scrollable canvas with zoom */}
-      <div className="flex-1 overflow-auto bg-muted">
+      <div className="flex-1 overflow-auto bg-muted print:overflow-visible print:bg-white print:h-auto print:block">
         <div
-          className="docx-zoom-wrapper w-max min-w-full origin-top-left"
+          className="docx-zoom-wrapper w-max min-w-full origin-top-left print:w-full print:min-w-full print:transform-none"
```

---

### 4.6 Changes to `client/src/index.css`

#### Location: `client/src/index.css` (Inside `@media print`, after line 1050)
```diff
--- a/client/src/index.css
+++ b/client/src/index.css
@@ -1050,2 +1050,47 @@
   .adm-sheet-paper-container > *,
+
+  /* ─────────────────────────────────────────────────────────────────── */
+  /* SophisticatedDocumentViewer & docx-preview Print Unrolling          */
+  /* ─────────────────────────────────────────────────────────────────── */
+  .docx-zoom-wrapper {
+    zoom: 1 !important;
+    transform: none !important;
+    width: 100% !important;
+    min-width: 100% !important;
+    max-width: 100% !important;
+    overflow: visible !important;
+  }
+
+  .docx-outer-container,
+  .docx-outer-container .docx-wrapper {
+    background: transparent !important;
+    background-color: #ffffff !important;
+    padding: 0 !important;
+    margin: 0 !important;
+    overflow: visible !important;
+    width: 100% !important;
+    max-width: 100% !important;
+  }
+
+  .docx-outer-container .docx {
+    box-shadow: none !important;
+    margin: 0 auto !important;
+    margin-bottom: 0 !important;
+    background: #ffffff !important;
+    background-color: #ffffff !important;
+    color: #000000 !important;
+    page-break-after: always !important;
+    break-after: page !important;
+  }
+
+  .docx-outer-container .docx:last-child {
+    page-break-after: auto !important;
+    break-after: auto !important;
+  }
+
+  /* Radix Dialog unrolling for Document Viewer Modal under print */
+  [role='dialog']:has(.docx-outer-container),
+  [role='dialog']:has(#document-viewer-title) {
+    position: static !important;
+    inset: auto !important;
+    transform: none !important;
+    width: 100% !important;
+    max-width: 100% !important;
+    height: auto !important;
+    max-height: none !important;
+    overflow: visible !important;
+    background: #ffffff !important;
+    box-shadow: none !important;
+    border: none !important;
+    padding: 0 !important;
+  }
```

---

## 5. Verification Method

To independently verify these features during and after implementation:

1. **Unit Testing — Fast-Path Commands**:
   - Verify `useProjects.js` and `useApprovalSheetUrl`:
     ```bash
     npm test --workspace=client -- src/pages/projects/CertificatePage.test.jsx
     ```
   - Verify `SophisticatedDocumentViewer.jsx` Print button:
     ```bash
     npm test --workspace=client -- src/components/documents/SophisticatedDocumentViewer.test.jsx
     ```
   - Verify `ProjectSubmissionsPage.jsx`:
     ```bash
     npm test --workspace=client -- src/pages/submissions/ProjectSubmissionsPage.test.jsx
     ```
   - Verify `ActionDoneMatrixTab.jsx`:
     ```bash
     npm test --workspace=client -- src/components/projects/ActionDoneMatrixTab.test.jsx
     ```

2. **Visual Inspection & Print Simulation**:
   - In a Playwright visual script or browser session:
     - Open `SophisticatedDocumentViewer` on a sample DOCX/PDF file.
     - Inspect toolbar: verify the Print button renders with the `Printer` icon, tooltip "Print manuscript document", and `data-testid="document-viewer-print-btn"`.
     - Emulate media type `page.emulateMedia({ media: 'print' })`.
     - Assert that the toolbar `<header>` has computed style `display: none`.
     - Assert that `.docx-zoom-wrapper` has `zoom: 1` and `overflow: visible`.
     - Assert that multi-page manuscript pages are not clipped at 90vh/95vh.
     - Open `/projects/:id/certificate`: verify the "Final Approval Sheet" card renders with View and Download buttons.
     - Open `/project/submissions`: in Phase 4, verify the "Final Approval Sheet" card renders with View and Download triggers.
     - Open Action Done Matrix on an archived project: verify the "Approval Sheet" button in the action bar opens the viewer modal.

3. **Invalidation Conditions**:
   - If `GET /api/projects/:id/approval-sheet` returns 404 on an unarchived project, ensure UI cards do not throw unhandled promise rejections or white-screen errors.
   - If the dialog overlay `[data-radix-dialog-overlay]` is visible during print, verify the CSS selector `div[class*='bg-overlay'] { display: none !important; }` suppresses the dark backdrop.
