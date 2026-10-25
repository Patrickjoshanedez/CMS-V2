import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { projectService, userService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import buksuLogo from '@/assets/buksu-logo.png';
import SecretaryMinutesDocumentSheet from '@/components/secretary/SecretaryMinutesDocumentSheet';
import SignaturePad from '@/components/ui/SignaturePad';
import {
  Printer,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  PenTool,
  Lock,
  Send,
  FileText,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

import useActionDoneMatrix, {
  formatFullName,
  consolidateADMRowsByPanel,
  ADM_PAGE_CAPACITIES,
  estimateADMRowWeight,
  extractSuggestionItems,
  splitADMRowIfOversized,
  autoAllocateADMSheets,
} from './adm/useActionDoneMatrix';
import ADMRemarkRow, { AutoResizeTextarea } from './adm/ADMRemarkRow';
import ADMTableView from './adm/ADMTableView';
import { ADM_MILESTONES } from './adm/admWorkflow';

export {
  formatFullName,
  consolidateADMRowsByPanel,
  ADM_PAGE_CAPACITIES,
  estimateADMRowWeight,
  extractSuggestionItems,
  splitADMRowIfOversized,
  autoAllocateADMSheets,
  AutoResizeTextarea,
  ADMRemarkRow,
  ADMTableView,
};

export default function ActionDoneMatrixTab({
  project,
  isFaculty: isFacultyProp = false,
  isStudent: isStudentProp = false,
  user: userProp,
  onRefresh,
  initialMilestone,
  initialView = 'adm',
}) {
  const {
    activeViewTab,
    setActiveViewTab,
    selectedMilestone,
    setSelectedMilestone,
    targetMilestone,
    displayedRows,
    docMeta,
    handleDocMetaChange,
    reviewType,
    projectTitle,
    setProjectTitle,
    setSignaturesState,
    setMilestoneSignatures,
    totalPages,
    rowsByPage,
    handleBalancePages,
    handleAddContinuationPage,
    handleRemovePage,
    handleMoveRowUp,
    handleMoveRowDown,
    handleCellChange,
    handleCellBlur,
    handleToggleReviewType,
    handleTitleBlur,
    handleAddRow,
    handleAddRowToPage,
    handleToggleFulfillment,
    handleDeleteRow,
    // Committee & Signatures
    chair,
    regularPanelists,
    adviser,
    secretary,
    instructor,
    admSignatures,
    panelist1Signature,
    panelist2Signature,
    // Permissions
    user,
    isFaculty,
    isStudent,
    isUserChair,
    isUserPanelist,
    isUserPanelist1,
    isUserPanelist2,
    isUserSecretary,
    isUserAdviser,
    isUserInstructor,
    isCurrentUserStudent,
    isUserDesignatedInstructor,
    canUploadMinutes,
    isSecretaryEndorsed,
    canEndorse,
    canAddRow,
    canManageReviewType,
    allRowsAddressed,
    allRowsVerified,
  } = useActionDoneMatrix({
    project,
    user: userProp,
    isFaculty: isFacultyProp,
    isStudent: isStudentProp,
    initialMilestone,
    initialView,
    onRefresh,
  });

  const projectId = project?._id;
  const isProjectArchived = project?.isArchived === true || project?.projectStatus === 'archived';

  // Modals & Uploads
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingMinutes, setIsUploadingMinutes] = useState(false);

  // Secretary Endorsement Modal
  const [isEndorsementModalOpen, setIsEndorsementModalOpen] = useState(false);
  const [endorsementNotes, setEndorsementNotes] = useState('');
  const [endorsementTypedName, setEndorsementTypedName] = useState('');
  const [isSubmittingEndorsement, setIsSubmittingEndorsement] = useState(false);
  const [isSubmittingForEndorsement, setIsSubmittingForEndorsement] = useState(false);

  const authState = useAuthStore((s) => s?.fetchUser);
  const fetchUser =
    typeof authState === 'function' ? authState : (authState?.fetchUser ?? (() => {}));

  // Digital Signature Modal
  const [signingSignatory, setSigningSignatory] = useState(null); // { tier, role, defaultName }
  const [signatoryTypedName, setSignatoryTypedName] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [isDrawingNewSignature, setIsDrawingNewSignature] = useState(false);
  const [saveSignatureForFuture, setSaveSignatureForFuture] = useState(true);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);

  // Lock background body scroll when digital signature or endorsement modal is open
  useEffect(() => {
    const isModalActive = Boolean(signingSignatory || isEndorsementModalOpen || isUploadModalOpen);
    if (!isModalActive || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [signingSignatory, isEndorsementModalOpen, isUploadModalOpen]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (signingSignatory && !isSubmittingSignature) setSigningSignatory(null);
        if (isEndorsementModalOpen && !isSubmittingEndorsement) setIsEndorsementModalOpen(false);
        if (isUploadModalOpen && !isUploadingMinutes) setIsUploadModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    signingSignatory,
    isEndorsementModalOpen,
    isUploadModalOpen,
    isSubmittingSignature,
    isSubmittingEndorsement,
    isUploadingMinutes,
  ]);

  // Upload Minutes (Secretary only)
  const handleUploadMinutes = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a defense minutes PDF file.');
      return;
    }

    try {
      setIsUploadingMinutes(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', project._id);
      formData.append('milestone', targetMilestone);

      const res = await projectService.uploadSecretaryMinutes(formData);
      toast.success(
        res?.data?.message || 'Defense minutes processed! Action Done Matrix populated.',
      );
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to process minutes PDF.');
    } finally {
      setIsUploadingMinutes(false);
    }
  };

  // Open digital signature modal with intelligent profile prefilling
  const handleOpenSignModal = useCallback(
    (signatory) => {
      setSigningSignatory(signatory);
      const initialName =
        signatory.defaultName && signatory.defaultName !== 'Pending Appointment'
          ? signatory.defaultName
          : formatFullName(user);
      setSignatoryTypedName(initialName);
      if (user?.digitalSignature) {
        setSignatureDataUrl(user.digitalSignature);
        setIsDrawingNewSignature(false);
      } else {
        setSignatureDataUrl(null);
        setIsDrawingNewSignature(true);
      }
      setSaveSignatureForFuture(true);
    },
    [user],
  );

  // Digital Signature Submit (milestone-isolated)
  const handleConfirmSignature = async () => {
    const finalName = (
      signatoryTypedName ||
      signingSignatory?.defaultName ||
      formatFullName(user)
    ).trim();

    if (!finalName) {
      toast.error('Please type your legal full name.');
      return;
    }

    const sigToUse = signatureDataUrl || user?.digitalSignature;
    if (!sigToUse) {
      toast.error('Please draw, type, or configure your signature.');
      return;
    }

    try {
      setIsSubmittingSignature(true);
      const res = await projectService.signTieredADM(project._id, {
        tier: signingSignatory.tier,
        role: signingSignatory.role,
        signatoryName: finalName,
        signatureDataUrl: sigToUse,
        milestone: targetMilestone,
      });

      if (res?.data?.data?.admSignatures) {
        setSignaturesState(res.data.data.admSignatures);
      }
      if (res?.data?.data?.admSignaturesByMilestone) {
        setMilestoneSignatures(res.data.data.admSignaturesByMilestone);
      }

      // Persist signature to user profile if user opted to save and doesn't already have one or updated
      if (saveSignatureForFuture && (!user?.digitalSignature || isDrawingNewSignature)) {
        try {
          await userService.updateMe({ digitalSignature: sigToUse });
          await fetchUser?.();
        } catch {
          // Non-blocking
        }
      }

      toast.success(`Recorded digital signature for ${finalName}.`);
      setSigningSignatory(null);
      setSignatoryTypedName('');
      setSignatureDataUrl(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record signature.');
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  // Student submit for Secretary Endorsement (milestone-isolated)
  const handleSubmitForEndorsement = async () => {
    if (!projectId) return;
    if (!allRowsAddressed) {
      toast.error('Please address all revision items before submitting for Secretary endorsement.');
      return;
    }
    setIsSubmittingForEndorsement(true);
    try {
      await projectService.submitADMForEndorsement(projectId, {
        milestone: targetMilestone,
      });
      toast.success('Action Done Matrix submitted for Secretary review.');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit for endorsement.');
    } finally {
      setIsSubmittingForEndorsement(false);
    }
  };

  // Secretary confirm Endorsement (milestone-isolated)
  const handleConfirmEndorsement = async () => {
    if (!projectId) return;
    if (!allRowsVerified) {
      toast.error('Verify every panel recommendation before endorsing the Action Done Matrix.');
      return;
    }
    const name = (endorsementTypedName || formatFullName(user, 'Committee Secretary')).trim();
    const sigToUse = signatureDataUrl || user?.digitalSignature;
    if (!name) {
      toast.error('Please type your legal full name.');
      return;
    }
    if (!sigToUse) {
      toast.error('Please draw or configure your digital signature.');
      return;
    }
    setIsSubmittingEndorsement(true);
    try {
      const res = await projectService.endorseADM(projectId, {
        notes: endorsementNotes,
        signatoryName: name,
        signatureDataUrl: sigToUse,
        milestone: targetMilestone,
      });
      if (res?.data?.data?.admSignatures) {
        setSignaturesState(res.data.data.admSignatures);
      }
      if (res?.data?.data?.admSignaturesByMilestone) {
        setMilestoneSignatures(res.data.data.admSignaturesByMilestone);
      }
      if (saveSignatureForFuture && (!user?.digitalSignature || isDrawingNewSignature)) {
        try {
          await userService.updateMe({ digitalSignature: sigToUse });
          await fetchUser?.();
        } catch {
          // Non-blocking
        }
      }
      toast.success('Action Done Matrix successfully endorsed by Committee Secretary.');
      setIsEndorsementModalOpen(false);
      setEndorsementNotes('');
      setSignatureDataUrl(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to endorse Action Done Matrix.');
    } finally {
      setIsSubmittingEndorsement(false);
    }
  };

  const handleOpenEndorsementModal = () => {
    if (!allRowsVerified) {
      toast.error('Verify every panel recommendation before endorsing the Action Done Matrix.');
      return;
    }
    setEndorsementTypedName(formatFullName(user, 'Committee Secretary'));
    if (user?.digitalSignature) {
      setSignatureDataUrl(user.digitalSignature);
      setIsDrawingNewSignature(false);
    } else {
      setSignatureDataUrl(null);
      setIsDrawingNewSignature(true);
    }
    setSaveSignatureForFuture(true);
    setIsEndorsementModalOpen(true);
  };

  const handlePrint = () => {
    const oldTitle = document.title;
    const cleanTitle = (projectTitle || project?.title || 'Capstone_Project')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    document.title = `Action_Done_Matrix_RU-F-033_${cleanTitle}`;
    window.print();
    setTimeout(() => {
      document.title = oldTitle;
    }, 1500);
  };

  // Shared by the committee signing and secretary endorsement dialogs
  const renderSignatureSelector = (typedName) => (
    <div className="space-y-2 pt-1" data-testid="adm-signature-selector">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Official Digital Signature</Label>
        {user?.digitalSignature && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              setIsDrawingNewSignature((prev) => {
                const next = !prev;
                setSignatureDataUrl(next ? null : user.digitalSignature);
                return next;
              });
            }}
            className="h-auto p-0 text-xs font-medium"
          >
            {isDrawingNewSignature ? 'Use Saved Signature' : 'Draw New / Custom Signature'}
          </Button>
        )}
      </div>

      {user?.digitalSignature && !isDrawingNewSignature ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col items-center justify-center space-y-2">
          <div className="h-14 flex items-center justify-center">
            <img
              src={user.digitalSignature}
              alt="Saved Signature"
              className="max-h-12 max-w-[240px] object-contain filter drop-shadow-xs"
            />
          </div>
          <p className="text-xs font-bold uppercase text-foreground">
            {typedName || formatFullName(user)}
          </p>
          <Badge variant="success" className="text-[10px] gap-1">
            <CheckCircle2 className="h-3 w-3" /> Configured in Account Settings
          </Badge>
        </div>
      ) : (
        <div className="space-y-3">
          <SignaturePad
            defaultSignatoryName={typedName || formatFullName(user)}
            onChange={(dataUrl) => setSignatureDataUrl(dataUrl)}
            onClear={() => setSignatureDataUrl(null)}
            height={140}
          />

          <Label className="flex cursor-pointer items-start gap-2 pt-0.5 font-normal">
            <Checkbox
              checked={saveSignatureForFuture}
              onCheckedChange={(checked) => setSaveSignatureForFuture(checked === true)}
              aria-label="Save signature to account settings"
            />
            <span className="text-xs text-muted-foreground">
              Save this signature to my account settings for future one-click endorsements
            </span>
          </Label>
        </div>
      )}
    </div>
  );

  return (
    <Tabs value={activeViewTab} onValueChange={setActiveViewTab} className="space-y-6">
      {/* ── View Switcher: Action Done Matrix vs Secretary Minutes ── */}
      <TabsList
        aria-label="Action Done Matrix and secretary minutes views"
        className="no-print grid h-auto w-full grid-cols-1 gap-2 overflow-visible rounded-none border-b border-border/80 bg-transparent p-0 pb-3 text-foreground sm:grid-cols-2"
      >
        <TabsTrigger
          value="adm"
          data-testid="adm-view-tab-adm"
          className="min-h-11 w-full min-w-0 shrink whitespace-normal rounded-lg px-3 py-2 text-left text-xs font-semibold leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/30 data-[state=inactive]:hover:text-foreground sm:justify-center sm:text-center"
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">Action Done Matrix (ADM)</span>
        </TabsTrigger>
        <TabsTrigger
          value="minutes"
          data-testid="adm-view-tab-minutes"
          className="min-h-11 w-full min-w-0 shrink whitespace-normal rounded-lg px-3 py-2 text-left text-xs font-semibold leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/30 data-[state=inactive]:hover:text-foreground sm:justify-center sm:text-center"
        >
          <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">Secretary Minutes (OVPAA-F-INS-032)</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeViewTab} className="mt-0 space-y-6">
        {activeViewTab === 'minutes' ? (
          <SecretaryMinutesDocumentSheet
            project={project}
            user={user}
            milestone={targetMilestone}
            onMinutesSynced={() => {
              if (onRefresh) onRefresh();
            }}
          />
        ) : (
          <>
            {/* Dedicated Print Stylesheet (100% Page Isolation & Full Paper Margin Control matching Secretary Minutes) */}
            <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 0 !important;
              }
              html, body, #root, main, .main-content {
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .h-screen, .overflow-hidden, .overflow-y-auto {
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
              }
              aside, nav, header, footer, [role="navigation"], [role="status"], [role="region"], .no-print, [class*="print:hidden"], [data-sonner-toaster], .toaster, #toast-container, button:not(.print-preserve) {
                display: none !important;
              }
              /* Strip all outer layout margins/paddings from ancestors so sheets start at top y = 0 */
              #root *:not(.adm-document-page, .adm-document-page *) {
                margin-top: 0 !important;
                padding-top: 0 !important;
              }
              #root .cms-route-enter,
              #root .space-y-6,
              #root .space-y-10,
              #root .grid,
              #root [class*="col-span"] {
                margin: 0 !important;
                padding: 0 !important;
                gap: 0 !important;
              }
              #root .adm-sheet-paper-container,
              .adm-sheet-paper-container {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                display: block !important;
              }
              .adm-sheet-paper-container > * {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
              }
              .adm-sheet-paper-container > :not([hidden]) ~ :not([hidden]) {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
              }
              .adm-sheet-paper-container > .no-print,
              .adm-sheet-paper-container > [class*="print:hidden"] {
                display: none !important;
                margin: 0 !important;
                padding: 0 !important;
                height: 0 !important;
              }
              #root .adm-document-page,
              #root div.adm-document-page,
              .adm-sheet-paper-container .adm-document-page,
              .adm-document-page {
                position: relative !important;
                width: 210mm !important;
                min-width: 210mm !important;
                max-width: 210mm !important;
                height: 296mm !important;
                min-height: 296mm !important;
                max-height: 296mm !important;
                margin: 0 auto !important;
                padding: 16mm 18mm 20mm 18mm !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                color: black !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                font-size: 8.5pt !important;
                line-height: 1.15 !important;
              }
              #root .adm-document-page:not(:last-child),
              #root div.adm-document-page:not(:last-child),
              .adm-sheet-paper-container .adm-document-page:not(:last-child),
              .adm-document-page:not(:last-child) {
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              #root .adm-document-page:last-child,
              #root div.adm-document-page:last-child,
              .adm-sheet-paper-container .adm-document-page:last-child,
              .adm-document-page:last-child,
              #root .adm-document-page.is-last-page,
              #root div.adm-document-page.is-last-page,
              .adm-sheet-paper-container .adm-document-page.is-last-page,
              .adm-document-page.is-last-page,
              [data-last-page="true"] {
                page-break-after: avoid !important;
                break-after: avoid !important;
                page-break-after: auto !important;
                break-after: auto !important;
                margin-bottom: 0 !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              #root .adm-document-footer,
              .adm-document-page .adm-document-footer,
              .adm-document-footer {
                position: relative !important;
                bottom: auto !important;
                left: auto !important;
                right: auto !important;
                width: 100% !important;
                width: calc(210mm - 36mm) !important;
                margin: 0 !important;
                margin-top: auto !important;
                padding-top: 1.5mm !important;
                background: white !important;
                flex-shrink: 0 !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .adm-document-page .adm-page-content-wrapper {
                flex: 1 1 auto !important;
                min-height: 0 !important;
                display: flex !important;
                flex-direction: column !important;
              }
              .adm-document-page table {
                font-size: 8.5pt !important;
                line-height: 1.15 !important;
                border-collapse: collapse !important;
                width: 100% !important;
                margin: 0 !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              .adm-document-page tr {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              .adm-document-page td, .adm-document-page th {
                padding: 2.5px 4px !important;
              }
              .adm-document-page textarea,
              .adm-document-page input {
                border: none !important;
                outline: none !important;
                box-shadow: none !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
              }
              .adm-document-page input,
              .adm-document-page textarea,
              .adm-document-page button,
              .adm-document-page [role="button"],
              .adm-document-page .no-print,
              .adm-document-page [class*="print:hidden"] {
                display: none !important;
              }
              .adm-document-page a {
                color: black !important;
                text-decoration: underline !important;
              }
              .adm-document-page textarea::-webkit-scrollbar,
              .adm-document-page input::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
              }
              [class*="group/row"] {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>

            {/* Non-Printing Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 no-print bg-card/60 border rounded-xl p-4 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Action Done Matrix (ADM)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Official institutional form for panel revisions, actions taken, and committee
                      endorsements.
                    </p>
                  </div>
                </div>

                {/* The shared labels distinguish the proposal review from Capstone 2 ADM v1 and Capstone 3 ADM v2. */}
                <div
                  role="group"
                  aria-label="Action Done Matrix milestone"
                  className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs"
                >
                  {Object.values(ADM_MILESTONES).map((m) => (
                    <Button
                      key={m.id}
                      type="button"
                      variant={selectedMilestone === m.id ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedMilestone(m.id)}
                      aria-pressed={selectedMilestone === m.id}
                      className={cn(
                        'h-9 px-2.5 text-xs font-medium transition-colors',
                        selectedMilestone === m.id
                          ? 'font-semibold text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {m.pillLabel}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Only Secretary can upload minutes */}
                {canUploadMinutes && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="gap-1.5 text-xs h-8"
                    title="Upload Hearing Defense Minutes (PDF)"
                  >
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    Upload Hearing Defense Minutes
                  </Button>
                )}

                {/* Student Submit for Endorsement */}
                {isStudent && displayedRows.length > 0 && !isSecretaryEndorsed && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSubmitForEndorsement}
                    disabled={isSubmittingForEndorsement || !allRowsAddressed}
                    className="gap-1.5 text-xs h-8 font-semibold"
                  >
                    {isSubmittingForEndorsement ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Submit for Secretary Endorsement
                  </Button>
                )}

                {/* Secretary Endorse Matrix */}
                {canEndorse && !isSecretaryEndorsed && displayedRows.length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleOpenEndorsementModal}
                    disabled={!allRowsVerified}
                    title={
                      allRowsVerified
                        ? undefined
                        : 'Every panel recommendation must be verified before secretary endorsement.'
                    }
                    className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Sign & Endorse Matrix
                  </Button>
                )}

                {/* Automatically Balance Pages Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBalancePages}
                  disabled={isProjectArchived}
                  className="gap-1.5 text-xs h-8 text-primary border-primary/40 hover:bg-primary/5"
                  title="Automatically balance committee remarks across authentic A4 sheets without print overflow"
                  data-testid="adm-balance-pages-btn"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Balance Pages
                </Button>

                {/* Add Continuation Page Button in Action Bar */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddContinuationPage()}
                  disabled={isProjectArchived}
                  className="gap-1.5 text-xs h-8 text-primary border-primary/40 hover:bg-primary/5"
                  title="Insert a continuation page before the final sign-off sheet"
                  data-testid="adm-add-page-btn"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Continuation Page
                </Button>

                {canAddRow && (
                  <Button size="sm" onClick={handleAddRow} className="gap-1.5 text-xs h-8">
                    <Plus className="h-3.5 w-3.5" />
                    Add Row
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-1.5 text-xs h-8"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Export Document
                </Button>
              </div>
            </div>

            {/* Main Multi-Page Document Container (matching Secretary Minutes) */}
            <div
              id="adm-printable-paper"
              className="adm-sheet-paper-container max-w-4xl mx-auto space-y-10"
            >
              {rowsByPage.map((pageRows, pageIdx) => {
                const isFirstPage = pageIdx === 0;
                const isLastPage = pageIdx === totalPages - 1;
                const pageNumber = pageIdx + 1;

                return (
                  <React.Fragment key={pageIdx}>
                    <div
                      className={cn(
                        'adm-document-page bg-white text-black font-serif shadow-lg border border-neutral-300 dark:border-neutral-700 min-h-[1050px] p-8 sm:p-12 relative flex flex-col justify-between rounded-xs',
                        isLastPage && 'is-last-page',
                      )}
                      data-testid={`adm-document-page-${pageNumber}`}
                      data-page={isFirstPage ? '1' : isLastPage ? 'final' : 'continuation'}
                      data-last-page={isLastPage ? 'true' : undefined}
                    >
                      <div className="adm-page-content-wrapper space-y-3 sm:space-y-4 flex-1 flex flex-col min-h-0">
                        {/* Authentic BukSU Header */}
                        <BuksuAdmDocumentHeader />

                        {/* Document Title */}
                        {isFirstPage ? (
                          <div className="text-center pt-2 pb-1">
                            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black">
                              ACTION DONE MATRIX
                            </h2>
                          </div>
                        ) : (
                          <div className="pt-2 pb-1 relative text-center border-b border-neutral-300 print:border-b-0 pb-2">
                            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
                              ACTION DONE MATRIX
                            </h2>
                            {!isLastPage && totalPages > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePage(pageIdx)}
                                disabled={isProjectArchived}
                                className="absolute right-0 top-2 h-auto gap-1 p-1 text-xs font-sans text-destructive hover:text-destructive/90 no-print print:hidden"
                                title="Remove this continuation page"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Remove Page {pageNumber}
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Page 1 Metadata: Project Title & Note to Researchers */}
                        {isFirstPage && (
                          <div className="text-xs sm:text-sm space-y-1.5 pt-1 font-serif text-black">
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              <span className="font-bold text-black shrink-0 font-serif">
                                Capstone Project Title:
                              </span>
                              <div className="flex-1 min-w-[280px]">
                                <Input
                                  type="text"
                                  value={projectTitle}
                                  onChange={(e) => setProjectTitle(e.target.value)}
                                  onBlur={handleTitleBlur}
                                  disabled={isProjectArchived || (!isFaculty && !isStudent)}
                                  className="h-auto min-h-0 w-full rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-1 py-0.5 text-xs font-bold text-black shadow-none hover:border-neutral-400 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-sm print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent"
                                  placeholder="Enter Capstone Project Title..."
                                />
                                <span className="hidden print:inline font-bold underline text-black text-xs sm:text-sm font-serif">
                                  {projectTitle || project?.title || ''}
                                </span>
                              </div>
                            </div>

                            <p className="text-[11px] sm:text-xs text-neutral-800 italic font-serif">
                              Note to the Researchers: Please submit this form with the revised
                              paper that shall be forwarded to the Capstone Committee/Instructor)
                            </p>
                          </div>
                        )}

                        {/* Table Scaffolding & Review Classification (Rendered on Page 1, Continuation Pages, and on Final Page if pageRows.length > 0) */}
                        {(isFirstPage || !isLastPage || pageRows.length > 0) && (
                          <div className="mt-2 font-serif text-black">
                            {/* Top Bar: Review Classification */}
                            <div className="flex flex-wrap items-center justify-between border-t border-x border-b-0 border-black px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 print:bg-transparent font-serif">
                              <div className="flex items-center gap-2 font-semibold text-black">
                                <span>Type of Review:</span>
                                <span className="text-neutral-600 text-xs italic">
                                  _(Please tick)
                                </span>
                              </div>

                              <div className="flex items-center gap-6 text-xs sm:text-sm">
                                <div
                                  className={cn(
                                    'flex items-center gap-2 select-none text-black font-serif',
                                    canManageReviewType
                                      ? 'cursor-pointer'
                                      : 'cursor-default opacity-85',
                                  )}
                                >
                                  <Checkbox
                                    id={
                                      pageIdx === 0
                                        ? 'review-internal'
                                        : `review-internal-${pageIdx}`
                                    }
                                    checked={reviewType === 'internal'}
                                    disabled={!canManageReviewType}
                                    onCheckedChange={() =>
                                      canManageReviewType && handleToggleReviewType('internal')
                                    }
                                    className={cn(
                                      'h-4 w-4 rounded-sm border-black print:hidden',
                                      !canManageReviewType && 'cursor-default',
                                    )}
                                  />
                                  <span className="hidden print:inline font-bold text-black text-xs font-serif">
                                    {reviewType === 'internal' ? '[✓]' : '[  ]'}
                                  </span>
                                  <Label
                                    htmlFor={
                                      pageIdx === 0
                                        ? 'review-internal'
                                        : `review-internal-${pageIdx}`
                                    }
                                    className="text-xs font-medium leading-normal text-black"
                                  >
                                    Internal Review
                                  </Label>
                                </div>

                                <div
                                  className={cn(
                                    'flex items-center gap-2 select-none text-black font-serif',
                                    canManageReviewType
                                      ? 'cursor-pointer'
                                      : 'cursor-default opacity-85',
                                  )}
                                >
                                  <Checkbox
                                    id={
                                      pageIdx === 0
                                        ? 'review-external'
                                        : `review-external-${pageIdx}`
                                    }
                                    checked={reviewType === 'external'}
                                    disabled={!canManageReviewType}
                                    onCheckedChange={() =>
                                      canManageReviewType && handleToggleReviewType('external')
                                    }
                                    className={cn(
                                      'h-4 w-4 rounded-sm border-black print:hidden',
                                      !canManageReviewType && 'cursor-default',
                                    )}
                                  />
                                  <span className="hidden print:inline font-bold text-black text-xs font-serif">
                                    {reviewType === 'external' ? '[✓]' : '[  ]'}
                                  </span>
                                  <Label
                                    htmlFor={
                                      pageIdx === 0
                                        ? 'review-external'
                                        : `review-external-${pageIdx}`
                                    }
                                    className="text-xs font-medium leading-normal text-black"
                                  >
                                    External Review
                                  </Label>
                                </div>
                              </div>
                            </div>

                            {/* Authentic Table matching Secretary Minutes */}
                            <ADMTableView
                              pageRows={pageRows}
                              pageIdx={pageIdx}
                              totalPages={totalPages}
                              displayedRows={displayedRows}
                              isFirstPage={isFirstPage}
                              isLastPage={isLastPage}
                              isReadOnly={isProjectArchived}
                              isCurrentUserStudent={isCurrentUserStudent}
                              isFaculty={isFaculty}
                              isStudent={isStudent}
                              isUserPanelist={isUserPanelist}
                              isUserInstructor={isUserInstructor}
                              isUserSecretary={isUserSecretary}
                              isUserAdviser={isUserAdviser}
                              canAddRow={canAddRow}
                              handleCellChange={handleCellChange}
                              handleCellBlur={handleCellBlur}
                              handleToggleFulfillment={handleToggleFulfillment}
                              handleMoveRowUp={handleMoveRowUp}
                              handleMoveRowDown={handleMoveRowDown}
                              handleDeleteRow={handleDeleteRow}
                              handleAddRowToPage={handleAddRowToPage}
                            />
                          </div>
                        )}

                        {/* Last Page: Secretary Compliance Gate & Signatories Board */}
                        {isLastPage && (
                          <div
                            data-testid="adm-signatories-board"
                            className="mt-6 space-y-8 font-sans text-xs sm:text-sm text-black"
                          >
                            {/* Secretary Compliance Endorsement Verification Banner */}
                            <Alert
                              variant={isSecretaryEndorsed ? 'success' : 'warning'}
                              className="paper-ui space-y-2.5 p-4 font-sans text-left no-print print:hidden"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck
                                    className={`h-5 w-5 ${
                                      isSecretaryEndorsed
                                        ? 'text-success-foreground'
                                        : 'text-warning-foreground'
                                    }`}
                                  />
                                  <div>
                                    <AlertTitle className="mb-0 text-xs font-bold uppercase tracking-wider text-foreground">
                                      Secretary Compliance Verification Gate
                                    </AlertTitle>
                                    <AlertDescription className="text-[11px] text-muted-foreground">
                                      {isSecretaryEndorsed
                                        ? 'Action Done Matrix Endorsed by Committee Secretary. Committee signatures are unlocked.'
                                        : allRowsVerified
                                          ? 'All Panel Recommendations Verified — Ready for Secretary Endorsement'
                                          : 'Prerequisite compliance audit: Every panel recommendation must be verified before the Committee Secretary can endorse student revision fulfillments.'}
                                    </AlertDescription>
                                  </div>
                                </div>
                                <Badge
                                  variant={isSecretaryEndorsed ? 'success' : 'warning'}
                                  className="text-[10px] uppercase font-semibold tracking-wider"
                                >
                                  {isSecretaryEndorsed
                                    ? 'Endorsed & Unlocked'
                                    : 'Endorsement Pending'}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground">
                                    Designated Secretary:{' '}
                                  </span>
                                  <span className="font-bold text-foreground">
                                    {admSignatures.secretary?.signatoryName ||
                                      formatFullName(
                                        secretary?.user || secretary,
                                        'Committee Secretary',
                                      )}
                                  </span>
                                  {admSignatures.secretary?.endorsedAt && (
                                    <span className="text-muted-foreground text-[11px] ml-2">
                                      (Endorsed on{' '}
                                      {new Date(
                                        admSignatures.secretary.endorsedAt,
                                      ).toLocaleDateString()}
                                      )
                                    </span>
                                  )}
                                  {admSignatures.secretary?.notes && (
                                    <p className="text-[11px] italic text-muted-foreground mt-1">
                                      Remarks: &ldquo;{admSignatures.secretary.notes}&rdquo;
                                    </p>
                                  )}
                                  {isSecretaryEndorsed &&
                                    admSignatures.secretary?.signatureDataUrl && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <img
                                          src={admSignatures.secretary.signatureDataUrl}
                                          alt="Secretary Signature"
                                          className="max-h-8 max-w-[160px] object-contain filter drop-shadow-xs"
                                        />
                                      </div>
                                    )}
                                </div>

                                {canEndorse && !isSecretaryEndorsed && (
                                  <Button
                                    size="sm"
                                    onClick={handleOpenEndorsementModal}
                                    disabled={!allRowsVerified}
                                    title={
                                      allRowsVerified
                                        ? undefined
                                        : 'Every panel recommendation must be verified before secretary endorsement.'
                                    }
                                    className="gap-1.5 text-xs h-7 font-medium no-print print:hidden"
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Sign Secretary Endorsement
                                  </Button>
                                )}
                              </div>
                            </Alert>

                            {/* TIER 1: Adviser & Course Instructor */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
                              {/* Capstone Adviser */}
                              <SignatoryCard
                                name={
                                  admSignatures.adviser?.signatoryName ||
                                  formatFullName(adviser, 'Pending Appointment')
                                }
                                designation="Signature over Printed Name of Adviser"
                                signatureState={admSignatures.adviser}
                                canSign={isSecretaryEndorsed && isUserAdviser}
                                isLockedBySecretary={!isSecretaryEndorsed && isUserAdviser}
                                onSign={() =>
                                  handleOpenSignModal({
                                    tier: 1,
                                    role: 'adviser',
                                    defaultName: formatFullName(adviser, 'Pending Appointment'),
                                  })
                                }
                              />

                              {/* Course Instructor */}
                              <SignatoryCard
                                name={
                                  admSignatures.instructor?.signatoryName ||
                                  formatFullName(instructor, 'Pending Appointment')
                                }
                                designation="Signature over Printed Name of Instructor"
                                signatureState={admSignatures.instructor}
                                canSign={
                                  isUserDesignatedInstructor &&
                                  allRowsVerified &&
                                  isSecretaryEndorsed
                                }
                                isLockedBySecretary={!isSecretaryEndorsed}
                                onSign={() =>
                                  handleOpenSignModal({
                                    tier: 1,
                                    role: 'instructor',
                                    defaultName: formatFullName(instructor, 'Pending Appointment'),
                                  })
                                }
                              />
                            </div>

                            {/* Approved by Section Header */}
                            <div className="pt-2">
                              <p className="font-semibold text-xs sm:text-sm text-black text-left">
                                Approved by:
                              </p>
                            </div>

                            {/* TIER 2: Panel Members (Dual Endorsements) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
                              {/* Panel Member 1 */}
                              <SignatoryCard
                                name={
                                  panelist1Signature?.signatoryName ||
                                  formatFullName(
                                    regularPanelists[0]?.userId ||
                                      regularPanelists[0]?.user ||
                                      regularPanelists[0],
                                    'Pending Appointment',
                                  )
                                }
                                designation="Panel Member"
                                signatureState={panelist1Signature}
                                canSign={isSecretaryEndorsed && isUserPanelist1}
                                isLockedBySecretary={!isSecretaryEndorsed && isUserPanelist1}
                                onSign={() =>
                                  handleOpenSignModal({
                                    tier: 2,
                                    role: 'panelist',
                                    defaultName: formatFullName(
                                      regularPanelists[0]?.userId ||
                                        regularPanelists[0]?.user ||
                                        regularPanelists[0],
                                      'Pending Appointment',
                                    ),
                                  })
                                }
                              />

                              {/* Panel Member 2 */}
                              <SignatoryCard
                                name={
                                  panelist2Signature?.signatoryName ||
                                  formatFullName(
                                    regularPanelists[1]?.userId ||
                                      regularPanelists[1]?.user ||
                                      regularPanelists[1],
                                    'Pending Appointment',
                                  )
                                }
                                designation="Panel Member"
                                signatureState={panelist2Signature}
                                canSign={isSecretaryEndorsed && isUserPanelist2}
                                isLockedBySecretary={!isSecretaryEndorsed && isUserPanelist2}
                                onSign={() =>
                                  handleOpenSignModal({
                                    tier: 2,
                                    role: 'panelist',
                                    defaultName: formatFullName(
                                      regularPanelists[1]?.userId ||
                                        regularPanelists[1]?.user ||
                                        regularPanelists[1],
                                    ),
                                  })
                                }
                              />
                            </div>

                            {/* TIER 3: Centered REC / Committee Chair */}
                            <div className="flex justify-center text-center pt-2">
                              <div className="w-full max-w-sm">
                                <SignatoryCard
                                  name={
                                    admSignatures.chair?.signatoryName ||
                                    formatFullName(
                                      chair?.userId || chair?.user || chair,
                                      'Pending Appointment',
                                    )
                                  }
                                  designation="REC / Chair"
                                  signatureState={admSignatures.chair}
                                  canSign={isSecretaryEndorsed && isUserChair}
                                  isLockedBySecretary={!isSecretaryEndorsed && isUserChair}
                                  onSign={() =>
                                    handleOpenSignModal({
                                      tier: 3,
                                      role: 'chair',
                                      defaultName: formatFullName(
                                        chair?.userId || chair?.user || chair,
                                        'Pending Appointment',
                                      ),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Pinned Institutional Document Footer */}
                      <AdmDocumentFooter
                        pageNumber={pageNumber}
                        totalPages={totalPages}
                        documentCode={docMeta.documentCode}
                        revisionNo={docMeta.revisionNo}
                        issueNo={docMeta.issueNo}
                        issueDate={docMeta.issueDate}
                        onDocMetaChange={handleDocMetaChange}
                        isReadOnly={isProjectArchived}
                      />
                    </div>

                    {/* Continuation Page Insertion Button placed strictly on the bottom outside of Page 1 and continuation sheets (never after final sheet) */}
                    {!isLastPage && (
                      <div className="flex justify-center my-4 no-print print:hidden">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddContinuationPage(pageIdx + 1)}
                          disabled={isProjectArchived}
                          className="gap-2 border-primary/50 bg-background text-xs font-semibold text-primary shadow-xs hover:bg-primary/10 no-print print:hidden"
                          data-testid={`add-continuation-page-btn-${pageNumber}`}
                          title="Insert a continuation page before the final sign-off sheet"
                        >
                          <Plus className="h-4 w-4" /> Add Continuation Page (Insert before Final
                          Sheet)
                        </Button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* ============================================================ */}
            {/* 5. MODALS & DIALOGS */}
            {/* ============================================================ */}

            {/* Upload Defense Minutes Modal */}
            <Dialog
              open={isUploadModalOpen}
              onOpenChange={(open) => {
                if (!isUploadingMinutes) setIsUploadModalOpen(open);
              }}
            >
              <DialogContent className="no-print">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Upload Defense Minutes PDF
                  </DialogTitle>
                  <DialogDescription>
                    Upload the official defense minutes PDF. The system will automatically parse
                    panelist recommendations and populate the Action Done Matrix rows.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUploadMinutes} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="minutes-file">Defense Minutes (.pdf)</Label>
                    <Input
                      id="minutes-file"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      disabled={isUploadingMinutes}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsUploadModalOpen(false)}
                      disabled={isUploadingMinutes}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isUploadingMinutes || !selectedFile}>
                      {isUploadingMinutes ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" /> Processing...
                        </>
                      ) : (
                        'Extract to Matrix'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Digital Signature Confirmation Modal */}
            <Dialog
              open={Boolean(signingSignatory)}
              onOpenChange={(open) => {
                if (!open && !isSubmittingSignature) setSigningSignatory(null);
              }}
            >
              <DialogContent className="no-print max-w-lg space-y-4 p-6" showClose={false}>
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <PenTool className="h-4 w-4" />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-semibold">
                        Official Committee Endorsement
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground">
                        Signatory Role:{' '}
                        <strong className="text-foreground capitalize">
                          {signingSignatory?.role}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSigningSignatory(null)}
                    disabled={isSubmittingSignature}
                    className="h-7 w-7 p-0 rounded-md"
                  >
                    ✕
                  </Button>
                </div>

                <DialogDescription className="text-xs leading-relaxed">
                  Applying your digital signature confirms that the revisions and action items
                  recorded across this Action Done Matrix have been verified against institutional
                  criteria.
                </DialogDescription>

                {/* Signatory Legal Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="sig-name" className="text-xs font-medium">
                    Signatory Legal Full Name
                  </Label>
                  <Input
                    id="sig-name"
                    value={signatoryTypedName}
                    onChange={(e) => setSignatoryTypedName(e.target.value)}
                    placeholder="Full Legal Name"
                    disabled={isSubmittingSignature}
                    className="h-9 text-xs"
                  />
                </div>

                {renderSignatureSelector(signatoryTypedName)}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSigningSignatory(null)}
                    disabled={isSubmittingSignature}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmSignature}
                    disabled={
                      isSubmittingSignature || (!signatureDataUrl && !user?.digitalSignature)
                    }
                    className="gap-1.5 h-8 text-xs font-medium"
                  >
                    {isSubmittingSignature ? (
                      <>
                        <Spinner className="h-3.5 w-3.5" /> Recording Endorsement...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" /> Sign & Endorse
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Secretary Endorsement Confirmation Modal */}
            <Dialog
              open={isEndorsementModalOpen}
              onOpenChange={(open) => {
                if (!open && !isSubmittingEndorsement) setIsEndorsementModalOpen(false);
              }}
            >
              <DialogContent className="no-print max-w-md space-y-4 p-6" showClose={false}>
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-semibold">
                        Grant Committee Secretary Endorsement
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground">Compliance Verification Gate</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEndorsementModalOpen(false)}
                    disabled={isSubmittingEndorsement}
                    className="h-7 w-7 p-0 rounded-md"
                  >
                    ✕
                  </Button>
                </div>

                <DialogDescription className="text-xs leading-relaxed">
                  As the Committee Secretary, your endorsement certifies that the proponent team has
                  satisfactorily addressed all panel recommendations in accordance with the defense
                  proceedings. This will unlock digital signatures for the panel members and
                  adviser.
                </DialogDescription>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sec-name" className="text-xs font-medium">
                      Secretary Signatory Full Name
                    </Label>
                    <Input
                      id="sec-name"
                      value={endorsementTypedName || formatFullName(user, 'Committee Secretary')}
                      onChange={(e) => setEndorsementTypedName(e.target.value)}
                      placeholder="Secretary Full Name"
                      disabled={isSubmittingEndorsement}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sec-notes" className="text-xs font-medium">
                      Compliance Remarks / Notes (Optional)
                    </Label>
                    <Textarea
                      id="sec-notes"
                      value={endorsementNotes}
                      onChange={(e) => setEndorsementNotes(e.target.value)}
                      placeholder="e.g., All revisions verified against manuscript and source code."
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isSubmittingEndorsement}
                    />
                  </div>
                </div>

                {renderSignatureSelector(endorsementTypedName)}

                <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEndorsementModalOpen(false)}
                    disabled={isSubmittingEndorsement}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmEndorsement}
                    disabled={
                      isSubmittingEndorsement || (!signatureDataUrl && !user?.digitalSignature)
                    }
                    className="gap-1.5 h-8 text-xs font-medium"
                  >
                    {isSubmittingEndorsement ? (
                      <>
                        <Spinner className="h-3.5 w-3.5" /> Endorsing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" /> Confirm & Sign Endorsement
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

/**
 * Authentic BukSU Institutional Document Header matching official template
 */
function BuksuAdmDocumentHeader() {
  return (
    <div className="relative pb-2 text-center min-h-[76px] flex flex-col justify-center">
      {/* BukSU Official Seal on Left */}
      <div className="absolute left-0 top-0 flex items-center justify-center">
        <img
          src={buksuLogo}
          alt="BukSU Official Seal"
          className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-none print:h-20 print:w-20"
        />
      </div>

      <div className="space-y-0.5 px-20 sm:px-24 print:px-24">
        <h1 className="font-bold text-sm sm:text-base tracking-wide text-black uppercase">
          Bukidnon State University
        </h1>
        <p className="text-xs text-black font-normal">Malaybalay City, Bukidnon 8700</p>
        <p className="text-xs text-black">
          Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717,{' '}
          <a
            href="https://www.buksu.edu.ph"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline print:text-black"
          >
            www.buksu.edu.ph
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Authentic BukSU Document Code Footer matching RU-F-033
 * Dynamic revision number, issue number, and issue date.
 */
function AdmDocumentFooter({
  pageNumber = 1,
  totalPages = 2,
  documentCode = 'RU- F-033',
  revisionNo = '002',
  issueNo = '002',
  issueDate = 'May 15, 2018',
  onDocMetaChange,
  isReadOnly = false,
  className = '',
}) {
  return (
    <div
      className={cn(
        'adm-document-footer border-t border-black pt-1.5 mt-auto text-[10px] sm:text-[11px] text-black font-sans shrink-0',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-1 text-black">
        <span>Document Code: {documentCode}</span>
        <span className="inline-flex items-center gap-0.5">
          Revision No. : <span className="hidden print:inline font-medium">{revisionNo}</span>
          <Input
            type="text"
            value={revisionNo}
            onChange={(e) => onDocMetaChange?.('revisionNo', e.target.value)}
            disabled={isReadOnly}
            className="print:hidden h-auto min-h-0 w-7 rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent p-0 text-center text-[10px] text-black shadow-none hover:border-neutral-400 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-[11px] font-sans font-medium"
            title="Edit Revision No"
          />
        </span>
        <span className="inline-flex items-center gap-0.5">
          Issue No. : <span className="hidden print:inline font-medium">{issueNo}</span>
          <Input
            type="text"
            value={issueNo}
            onChange={(e) => onDocMetaChange?.('issueNo', e.target.value)}
            disabled={isReadOnly}
            className="print:hidden h-auto min-h-0 w-7 rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent p-0 text-center text-[10px] text-black shadow-none hover:border-neutral-400 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-[11px] font-sans font-medium"
            title="Edit Issue No"
          />
        </span>
        <span className="inline-flex items-center gap-0.5">
          Issue Date: <span className="hidden print:inline font-medium">{issueDate}</span>
          <Input
            type="text"
            value={issueDate}
            onChange={(e) => onDocMetaChange?.('issueDate', e.target.value)}
            disabled={isReadOnly}
            className="print:hidden h-auto min-h-0 w-24 rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent p-0 text-center text-[10px] text-black shadow-none hover:border-neutral-400 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-[11px] font-sans font-medium"
            title="Edit Issue Date"
          />
        </span>
        <span className="font-medium">
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    </div>
  );
}

/**
 * SignatoryCard component displaying signature image/action, printed name, underline, designation, and verified badge.
 * Strictly adheres to institutional academic hierarchy:
 * 1. Top: Digital Signature image + micro audit trail stamp (or "Sign Digitally" action when pending)
 * 2. Middle: Bold printed legal name
 * 3. Bottom: Horizontal underline, official role subtitle below the line, and Verified badge
 */
function SignatoryCard({
  name,
  designation,
  signatureState,
  canSign,
  onSign,
  isLockedBySecretary,
}) {
  const isSigned = Boolean(
    signatureState?.signed || signatureState?.signatureDataUrl || signatureState?.signedAt,
  );
  const signatureDataUrl = signatureState?.signatureDataUrl;
  const signedAt = signatureState?.signedAt ? new Date(signatureState.signedAt) : null;
  const formattedDate = signedAt
    ? signedAt.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const auditId = signatureState?.userId
    ? String(signatureState.userId).slice(-6).toUpperCase()
    : 'SIG-OFFICIAL';

  return (
    <div className="flex flex-col items-center justify-end space-y-1 min-h-[110px] font-serif">
      {/* 1. TOP: Digital Signature Image + Micro Audit Trail Stamp (or Sign Action) */}
      <div className="h-14 flex flex-col items-center justify-center w-full max-w-[280px]">
        {isSigned ? (
          <div className="flex flex-col items-center justify-center space-y-0.5">
            {signatureDataUrl &&
            (signatureDataUrl.startsWith('data:') ||
              signatureDataUrl.startsWith('http') ||
              signatureDataUrl.startsWith('/')) ? (
              <img
                src={signatureDataUrl}
                alt={`Digital Signature of ${name}`}
                className="max-h-10 max-w-[220px] object-contain filter drop-shadow-xs"
              />
            ) : (
              <span className="font-serif italic text-base text-black">
                {signatureState?.signatoryName || name}
              </span>
            )}
            <span className="text-[9px] text-neutral-600 font-mono tracking-tight print:hidden">
              Digitally signed on {formattedDate} | Ref: {auditId}
            </span>
          </div>
        ) : canSign ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onSign}
              className="h-7 text-xs px-3 text-primary border-primary/50 hover:bg-primary/10 gap-1.5 shadow-xs no-print print:hidden font-sans"
            >
              <PenTool className="h-3 w-3" /> Sign Digitally
            </Button>
            <div className="hidden print:block print:h-12" />
          </>
        ) : (
          <div className="h-7 print:h-12" />
        )}
      </div>

      {/* 2. MIDDLE: Bold Printed Legal Name */}
      <p className="font-bold text-xs sm:text-sm uppercase tracking-wide text-black font-serif">
        {name ? String(name).toUpperCase() : ''}
      </p>

      {/* 3. BOTTOM: Horizontal Underline */}
      <div className="w-full max-w-[280px] border-b border-black my-1" />

      {/* Subtitle / Official Designation Below Underline */}
      <p className="text-[11px] sm:text-xs text-neutral-700 font-serif">{designation}</p>

      {/* Status Badges (Hidden on print) */}
      <div className="pt-0.5 no-print print:hidden">
        {isSigned ? (
          <Badge variant="success" className="text-[10px] h-5 gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Verified
          </Badge>
        ) : isLockedBySecretary ? (
          <span className="text-[10px] text-warning-foreground font-medium flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" /> Awaiting Secretary Endorsement
          </span>
        ) : !canSign ? (
          <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> Pending Signature
          </span>
        ) : null}
      </div>
    </div>
  );
}
