import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { projectService } from '@/services/authService';
import { ROLES, PANEL_ROLES } from '@cms/shared';
import AutoExpandingTextarea from '@/components/projects/AutoExpandingTextarea';
import buksuLogo from '@/assets/buksu-logo.png';
import {
  Printer,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Loader2,
  PenTool,
  Sparkles,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Format populated user full name
 */
function formatFullName(userObj, fallback = 'Unassigned') {
  if (!userObj) return fallback;
  const parts = [userObj.firstName, userObj.middleName, userObj.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : userObj.name || fallback;
}

export default function ActionDoneMatrixTab({
  project,
  isFaculty = false,
  isStudent = false,
  user,
  onRefresh,
}) {
  // Local state for immediate responsiveness & autosave
  const [rows, setRows] = useState([]);
  const [reviewType, setReviewType] = useState('internal');
  const [projectTitle, setProjectTitle] = useState('');
  const [savingCells, setSavingCells] = useState({}); // { [rowId_field]: 'saving' | 'saved' | 'error' }

  // Modals & Uploads
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingMinutes, setIsUploadingMinutes] = useState(false);
  const [isSeedingTemplate, setIsSeedingTemplate] = useState(false);

  // Digital Signature Modal
  const [signingSignatory, setSigningSignatory] = useState(null); // { tier, role, defaultName }
  const [signatoryTypedName, setSignatoryTypedName] = useState('');
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);

  // Debounce timers map
  const debounceTimers = useRef({});

  // Sync project props to local state
  useEffect(() => {
    if (project) {
      setRows(project.actionDoneMatrix || []);
      setReviewType(project.admReviewType || 'internal');
      setProjectTitle(project.title || '');
    }
  }, [project]);

  // Committee resolution
  const panelists = useMemo(() => project?.panelists || [], [project?.panelists]);
  const chair = useMemo(
    () => panelists.find((p) => p.role === PANEL_ROLES.CHAIR || p.role === 'chair'),
    [panelists],
  );
  const regularPanelists = useMemo(
    () =>
      panelists.filter(
        (p) =>
          p.role !== PANEL_ROLES.CHAIR &&
          p.role !== 'chair' &&
          p.role !== PANEL_ROLES.SECRETARY &&
          p.role !== 'secretary',
      ),
    [panelists],
  );

  const adviser = project?.adviserId || project?.teamId?.adviserId;
  const instructor =
    project?.teamId?.sectionId?.instructorId || (user?.role === ROLES.INSTRUCTOR ? user : null);

  const admSignatures = project?.admSignatures || {};

  // Permissions
  const isUserChair =
    user &&
    (chair?.userId === user._id ||
      chair?.userId?._id === user._id ||
      (user.role === ROLES.FACULTY && user.facultyRole === 'chair'));
  const isUserPanelist =
    user &&
    (isUserChair ||
      panelists.some(
        (p) => p.userId === user._id || p.userId?._id === user._id || p._id === user._id,
      ));
  const isUserAdviser = user && (adviser?._id === user._id || String(adviser) === String(user._id));
  const isUserInstructor = user && user.role === ROLES.INSTRUCTOR;
  const canUploadMinutes = isFaculty || isUserInstructor;

  const projectId = project?._id;

  // Auto-save cell debounced handler
  const saveCell = useCallback(
    async (rowId, field, value) => {
      if (!projectId) return;
      const cellKey = `${rowId}_${field}`;
      setSavingCells((prev) => ({ ...prev, [cellKey]: 'saving' }));

      try {
        await projectService.patchADMRow(projectId, rowId, { [field]: value });
        setSavingCells((prev) => ({ ...prev, [cellKey]: 'saved' }));

        setTimeout(() => {
          setSavingCells((prev) => {
            const next = { ...prev };
            delete next[cellKey];
            return next;
          });
        }, 2000);
      } catch (err) {
        setSavingCells((prev) => ({ ...prev, [cellKey]: 'error' }));
        toast.error(err?.response?.data?.message || 'Failed to save change');
      }
    },
    [projectId],
  );

  const handleCellChange = (rowId, field, value) => {
    // Update local state immediately
    setRows((prev) => prev.map((r) => ((r._id || r.id) === rowId ? { ...r, [field]: value } : r)));

    // Clear existing timer
    const timerKey = `${rowId}_${field}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }

    // Debounce network patch by 750ms
    debounceTimers.current[timerKey] = setTimeout(() => {
      saveCell(rowId, field, value);
    }, 750);
  };

  // Review type toggle
  const handleToggleReviewType = async (type) => {
    if (!isFaculty && !isStudent) return;
    setReviewType(type);
    try {
      await projectService.updateADMMetadata(project._id, { admReviewType: type });
      toast.success(`Review type set to ${type === 'internal' ? 'Internal' : 'External'} Review`);
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Failed to update review classification.');
    }
  };

  // Title edit
  const handleTitleBlur = async () => {
    if (!projectTitle.trim() || projectTitle === project?.title) return;
    try {
      await projectService.updateADMMetadata(project._id, { title: projectTitle.trim() });
      toast.success('Project title updated.');
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Failed to update project title.');
    }
  };

  // Add evaluation row
  const handleAddRow = async () => {
    const defaultPanelName = isUserChair
      ? formatFullName(user)
      : regularPanelists.length > 0
        ? formatFullName(regularPanelists[0].user || regularPanelists[0])
        : 'Panel Member';

    try {
      const res = await projectService.createActionDoneMatrixItem(project._id, {
        panelName: defaultPanelName,
        suggestion: '',
        actionDone: '',
        pageNumbers: '',
      });
      toast.success('Added new panel evaluation row.');
      if (res?.data?.data?.actionDoneMatrix) {
        setRows(res.data.data.actionDoneMatrix);
      }
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Failed to add ADM row.');
    }
  };

  // Delete row
  const handleDeleteRow = async (rowId) => {
    try {
      await projectService.deleteActionDoneMatrixItem(project._id, rowId);
      setRows((prev) => prev.filter((r) => (r._id || r.id) !== rowId));
      toast.success('Evaluation row removed.');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove row.');
    }
  };

  // Seed Institutional Template
  const handleSeedTemplate = async () => {
    try {
      setIsSeedingTemplate(true);
      const res = await projectService.seedInstitutionalADM(project._id);
      toast.success('Loaded institutional ADM template from official document.');
      if (res?.data?.data?.actionDoneMatrix) {
        setRows(res.data.data.actionDoneMatrix);
      }
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Failed to load institutional template.');
    } finally {
      setIsSeedingTemplate(false);
    }
  };

  // Upload Minutes
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

  // Digital Signature Submit
  const handleConfirmSignature = async () => {
    if (!signatoryTypedName.trim()) {
      toast.error('Please type your legal full name.');
      return;
    }

    try {
      setIsSubmittingSignature(true);
      await projectService.signTieredADM(project._id, {
        tier: signingSignatory.tier,
        role: signingSignatory.role,
        signatoryName: signatoryTypedName.trim(),
        signatureDataUrl: 'verified-digital-sign-off',
      });

      toast.success(`Recorded digital signature for ${signatoryTypedName.trim()}.`);
      setSigningSignatory(null);
      setSignatoryTypedName('');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record signature.');
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Non-Printing Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print bg-card/60 border rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Action Done Matrix (ADM)</h3>
            <p className="text-xs text-muted-foreground">
              Official institutional form for panel revisions, actions taken, and committee
              endorsements.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rows.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedTemplate}
              disabled={isSeedingTemplate}
              className="gap-1.5 text-xs h-8"
            >
              {isSeedingTemplate ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              )}
              Load Institutional Template
            </Button>
          )}

          {canUploadMinutes && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="gap-1.5 text-xs h-8"
            >
              <Upload className="h-3.5 w-3.5 text-primary" />
              Upload Minutes (PDF)
            </Button>
          )}

          <Button size="sm" onClick={handleAddRow} className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs h-8">
            <Printer className="h-3.5 w-3.5" />
            Print / Export Document
          </Button>
        </div>
      </div>

      {/* Main Document Sheet Container (max-w-5xl, paper-style) */}
      <div className="max-w-5xl mx-auto bg-card text-foreground print:bg-white print:text-black border border-border/80 print:border-none shadow-md print:shadow-none p-6 sm:p-12 rounded-xl print:rounded-none font-serif leading-normal transition-all">
        {/* ============================================================ */}
        {/* 1. INSTITUTIONAL HEADER & CLASSIFICATION */}
        {/* ============================================================ */}
        <div className="flex flex-col items-center text-center relative pb-4">
          {/* Circular BukSU Logo on Top Left */}
          <div className="absolute left-0 top-0 hidden sm:block">
            <img
              src={buksuLogo}
              alt="BukSU Official Seal"
              className="h-20 w-20 md:h-24 md:w-24 object-contain"
            />
          </div>

          <div className="space-y-0.5 sm:px-24">
            <h1 className="font-bold text-base sm:text-lg tracking-wide text-foreground print:text-black uppercase">
              Bukidnon State University
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground print:text-neutral-700">
              Malaybalay City, Bukidnon 8700
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground print:text-neutral-700">
              Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717,
            </p>
            <a
              href="https://www.buksu.edu.ph"
              target="_blank"
              rel="noreferrer"
              className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 print:text-blue-800 underline block"
            >
              www.buksu.edu.ph
            </a>
          </div>

          {/* Centered Document Title */}
          <div className="pt-6 pb-2 text-center w-full">
            <h2 className="font-bold text-lg sm:text-xl tracking-wider text-foreground print:text-black uppercase">
              ACTION DONE MATRIX
            </h2>
          </div>
        </div>

        {/* Dynamic Project Title Field */}
        <div className="text-xs sm:text-sm space-y-1.5 pt-2 font-sans">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="font-semibold text-foreground print:text-black shrink-0">
              Capstone Project Title:
            </span>
            <div className="flex-1 min-w-[280px]">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onBlur={handleTitleBlur}
                disabled={!isFaculty && !isStudent}
                className="w-full font-bold underline bg-transparent border-b border-transparent hover:border-border/60 focus:border-primary/60 focus:outline-none px-1 text-xs sm:text-sm text-foreground print:text-black"
                placeholder="Enter Capstone Project Title..."
              />
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-muted-foreground print:text-neutral-800 italic">
            Note to the Researchers: Please submit this form with the revised paper that shall be
            forwarded to the Capstone Committee/Instructor)
          </p>
        </div>

        {/* ============================================================ */}
        {/* 2. TABLE SCAFFOLDING & REVIEW CLASSIFICATION (4 COLUMNS) */}
        {/* ============================================================ */}
        <div className="mt-4 border border-black dark:border-border print:border-black font-sans">
          {/* Top Bar: Review Classification */}
          <div className="flex flex-wrap items-center justify-between border-b border-black dark:border-border print:border-black px-3 py-2 text-xs sm:text-sm bg-muted/10 print:bg-transparent">
            <div className="flex items-center gap-2 font-semibold">
              <span>Type of Review:</span>
              <span className="text-muted-foreground text-xs italic">_(Please tick)</span>
            </div>

            <div className="flex items-center gap-6 text-xs sm:text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reviewType === 'internal'}
                  onChange={() => handleToggleReviewType('internal')}
                  className="h-4 w-4 rounded border-black text-primary focus:ring-primary"
                />
                <span className="font-medium text-foreground print:text-black">
                  Internal Review
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reviewType === 'external'}
                  onChange={() => handleToggleReviewType('external')}
                  className="h-4 w-4 rounded border-black text-primary focus:ring-primary"
                />
                <span className="font-medium text-foreground print:text-black">
                  External Review
                </span>
              </label>
            </div>
          </div>

          {/* 4 Required Column Headers */}
          <div className="grid grid-cols-12 border-b border-black dark:border-border print:border-black text-center font-bold text-xs sm:text-sm bg-muted/20 print:bg-neutral-50 divide-x divide-black dark:divide-border print:divide-black">
            <div className="col-span-3 p-2.5 flex items-center justify-center">Name of Panel</div>
            <div className="col-span-4 p-2.5 flex items-center justify-center">
              Suggestion of the Panel(s)
            </div>
            <div className="col-span-4 p-2.5 flex items-center justify-center">Action Taken</div>
            <div className="col-span-1 p-2 flex items-center justify-center text-[11px] sm:text-xs">
              Page Number/s
            </div>
          </div>

          {/* Rows */}
          {rows.length === 0 ? (
            <div className="p-8 text-center text-xs sm:text-sm text-muted-foreground italic">
              No recommendations recorded yet. Click &quot;Add Row&quot; or &quot;Load Institutional
              Template&quot; to begin.
            </div>
          ) : (
            <div className="divide-y divide-black dark:divide-border print:divide-black">
              {rows.map((row, idx) => {
                const rowId = row._id || row.id || idx;
                const isLocked = Boolean(row.isLocked);

                // Permission rules:
                const canEditPanel = (isFaculty || isUserPanelist || isUserInstructor) && !isLocked;
                const canEditSuggestion =
                  (isFaculty || isUserPanelist || isUserInstructor) && !isLocked;
                const canEditAction = isStudent && !isLocked;

                return (
                  <div
                    key={rowId}
                    className="grid grid-cols-12 divide-x divide-black dark:divide-border print:divide-black relative group/row hover:bg-muted/5 transition-colors"
                  >
                    {/* Column 1: Name of Panel (Col span 3) */}
                    <div className="col-span-3 p-3 flex flex-col justify-start">
                      <AutoExpandingTextarea
                        value={row.panelName || ''}
                        onChange={(e) => handleCellChange(rowId, 'panelName', e.target.value)}
                        placeholder="Panel Member Name"
                        disabled={!canEditPanel}
                        savingStatus={savingCells[`${rowId}_panelName`]}
                        className="font-bold text-foreground print:text-black"
                        minRows={1}
                      />
                      {isLocked && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground font-sans print:hidden">
                          <Lock className="h-3 w-3 text-amber-500" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Suggestion of the Panel(s) (Col span 4) */}
                    <div className="col-span-4 p-3">
                      <AutoExpandingTextarea
                        value={row.suggestion || ''}
                        onChange={(e) => handleCellChange(rowId, 'suggestion', e.target.value)}
                        placeholder="- Specific suggestion / recommendation..."
                        disabled={!canEditSuggestion}
                        savingStatus={savingCells[`${rowId}_suggestion`]}
                        className="text-foreground print:text-black whitespace-pre-line"
                        minRows={3}
                      />
                    </div>

                    {/* Column 3: Action Taken (Col span 4) */}
                    <div className="col-span-4 p-3">
                      <AutoExpandingTextarea
                        value={row.actionDone || ''}
                        onChange={(e) => handleCellChange(rowId, 'actionDone', e.target.value)}
                        placeholder="- Description of modifications made..."
                        disabled={!canEditAction}
                        savingStatus={savingCells[`${rowId}_actionDone`]}
                        className="text-foreground print:text-black whitespace-pre-line"
                        minRows={3}
                      />
                    </div>

                    {/* Column 4: Page Number/s (Col span 1) */}
                    <div className="col-span-1 p-2 flex flex-col items-center justify-start text-center">
                      <AutoExpandingTextarea
                        value={row.pageNumbers || ''}
                        onChange={(e) => handleCellChange(rowId, 'pageNumbers', e.target.value)}
                        placeholder="p. #"
                        disabled={!canEditAction}
                        savingStatus={savingCells[`${rowId}_pageNumbers`]}
                        className="text-center text-xs text-foreground print:text-black"
                        minRows={1}
                      />

                      {/* Delete Row button (non-printing, visible on hover) */}
                      {!isLocked && (isFaculty || isStudent) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(rowId)}
                          title="Delete Row"
                          className="mt-2 text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity no-print"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 3. DEDICATED SIGNATORIES BOARD (3 TIERS) */}
        {/* ============================================================ */}
        <div className="mt-12 space-y-10 font-sans text-xs sm:text-sm">
          {/* TIER 1: Adviser & Course Instructor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
            {/* Capstone Adviser */}
            <SignatoryCard
              name={
                admSignatures.adviser?.signatoryName || formatFullName(adviser, 'GLAIZA MAE LIBE')
              }
              designation="Signature over Printed Name of Adviser"
              signatureState={admSignatures.adviser}
              canSign={isUserAdviser || isUserInstructor}
              onSign={() =>
                setSigningSignatory({
                  tier: 1,
                  role: 'adviser',
                  defaultName: formatFullName(adviser, 'GLAIZA MAE LIBE'),
                })
              }
            />

            {/* Course Instructor */}
            <SignatoryCard
              name={
                admSignatures.instructor?.signatoryName ||
                formatFullName(instructor, 'DR. SALES G. ARIBE JR.')
              }
              designation="Signature over Printed Name of Instructor"
              signatureState={admSignatures.instructor}
              canSign={isUserInstructor}
              onSign={() =>
                setSigningSignatory({
                  tier: 1,
                  role: 'instructor',
                  defaultName: formatFullName(instructor, 'DR. SALES G. ARIBE JR.'),
                })
              }
            />
          </div>

          {/* Approved by Section Header */}
          <div className="pt-2">
            <p className="font-semibold text-xs sm:text-sm text-foreground print:text-black text-left">
              Approved by:
            </p>
          </div>

          {/* TIER 2: Panel Members (Dual Endorsements) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
            {/* Panel Member 1 */}
            <SignatoryCard
              name={
                admSignatures.panelists?.[0]?.signatoryName ||
                formatFullName(regularPanelists[0]?.user || regularPanelists[0], 'RAUL D. LECAROS')
              }
              designation="Panel Member"
              signatureState={admSignatures.panelists?.[0]}
              canSign={isUserPanelist}
              onSign={() =>
                setSigningSignatory({
                  tier: 2,
                  role: 'panelist',
                  defaultName: formatFullName(
                    regularPanelists[0]?.user || regularPanelists[0],
                    'RAUL D. LECAROS',
                  ),
                })
              }
            />

            {/* Panel Member 2 */}
            <SignatoryCard
              name={
                admSignatures.panelists?.[1]?.signatoryName ||
                formatFullName(regularPanelists[1]?.user || regularPanelists[1], 'JOSEPH ABELLA')
              }
              designation="Panel Member"
              signatureState={admSignatures.panelists?.[1]}
              canSign={isUserPanelist}
              onSign={() =>
                setSigningSignatory({
                  tier: 2,
                  role: 'panelist',
                  defaultName: formatFullName(
                    regularPanelists[1]?.user || regularPanelists[1],
                    'JOSEPH ABELLA',
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
                  formatFullName(chair?.user || chair, 'LOUIE JAY LABASTIDA')
                }
                designation="REC / Chair"
                signatureState={admSignatures.chair}
                canSign={isUserChair || isUserInstructor}
                onSign={() =>
                  setSigningSignatory({
                    tier: 3,
                    role: 'chair',
                    defaultName: formatFullName(chair?.user || chair, 'LOUIE JAY LABASTIDA'),
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. INSTITUTIONAL DOCUMENT CODE FOOTER */}
        {/* ============================================================ */}
        <div className="mt-16 pt-6 border-t border-border/40 print:border-black/60 text-[10px] sm:text-[11px] text-muted-foreground print:text-neutral-700 font-sans">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Document Code: RU- F-033</span>
            <span>Revision No. : 002</span>
            <span>Issue No. 002</span>
            <span>Issue Date: May 15, 2018</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. MODALS & DIALOGS */}
      {/* ============================================================ */}

      {/* Upload Defense Minutes Modal */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs no-print"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUploadingMinutes) {
              setIsUploadModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <h4 className="text-base font-semibold">Upload Defense Minutes PDF</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload the official defense minutes PDF. The system will automatically parse panelist
              recommendations and populate the Action Done Matrix rows.
            </p>
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
              <div className="flex justify-end gap-2 pt-2">
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    'Extract to Matrix'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Signature Confirmation Modal */}
      {signingSignatory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs no-print"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingSignature) {
              setSigningSignatory(null);
            }
          }}
        >
          <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              <h4 className="text-base font-semibold">Official Committee Endorsement</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are applying an official digital signature as{' '}
              <strong className="text-foreground capitalize">{signingSignatory.role}</strong>. This
              confirms that the revisions across the Action Done Matrix have been verified.
            </p>
            <div className="space-y-2">
              <Label htmlFor="sig-name">Signatory Legal Name</Label>
              <Input
                id="sig-name"
                value={signatoryTypedName || signingSignatory.defaultName}
                onChange={(e) => setSignatoryTypedName(e.target.value)}
                placeholder="Full Name"
                disabled={isSubmittingSignature}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSigningSignatory(null)}
                disabled={isSubmittingSignature}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSignature}
                disabled={isSubmittingSignature}
                className="gap-1.5"
              >
                {isSubmittingSignature ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recording...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" /> Sign & Endorse
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SignatoryCard component displaying signature line, printed name, designation, and badge
 */
function SignatoryCard({ name, designation, signatureState, canSign, onSign }) {
  const isSigned = Boolean(signatureState?.signed);

  return (
    <div className="flex flex-col items-center justify-end space-y-1.5 min-h-[90px]">
      {/* Signature Preview or Line */}
      <div className="h-10 flex items-end justify-center w-full max-w-[280px]">
        {isSigned ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-serif italic text-base">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="border-b border-black dark:border-border print:border-black pb-0.5">
              {signatureState.signatoryName || name}
            </span>
          </div>
        ) : (
          <div className="w-full border-b border-black dark:border-border print:border-black" />
        )}
      </div>

      {/* Printed Name (Bold, Uppercase, Underlined) */}
      <p className="font-bold text-xs sm:text-sm uppercase tracking-wide text-foreground print:text-black">
        {name ? String(name).toUpperCase() : ''}
      </p>

      {/* Official Designation */}
      <p className="text-[11px] sm:text-xs text-muted-foreground print:text-neutral-700">
        {designation}
      </p>

      {/* Status & Trigger Badge (Hidden on print) */}
      <div className="pt-1 no-print">
        {isSigned ? (
          <Badge
            variant="secondary"
            className="text-[10px] h-5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-500/30 gap-1"
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
            Signed{' '}
            {signatureState?.signedAt ? new Date(signatureState.signedAt).toLocaleDateString() : ''}
          </Badge>
        ) : canSign ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onSign}
            className="h-6 text-[10px] px-2 text-primary border-primary/40 hover:bg-primary/10 gap-1"
          >
            <PenTool className="h-2.5 w-2.5" /> Sign Digitally
          </Button>
        ) : (
          <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> Pending Signature
          </span>
        )}
      </div>
    </div>
  );
}
