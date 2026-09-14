import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { projectService, userService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { ROLES, PANEL_ROLES } from '@cms/shared';
import AutoExpandingTextarea from '@/components/projects/AutoExpandingTextarea';
import ADMPhaseSelector from '@/components/projects/ADMPhaseSelector';
import buksuLogo from '@/assets/buksu-logo.png';
import LiveDefenseMinutesModal from '@/components/defense/LiveDefenseMinutesModal';
import SignaturePad from '@/components/ui/SignaturePad';
import { getSocket, connectSocket } from '@/services/socket';
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
  Send,
  FileText,
  FileSignature,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Format populated user full name
 */
function formatFullName(userObj, fallback = 'Pending Appointment') {
  if (!userObj) return fallback;
  const raw = userObj.userId || userObj.user || userObj;
  if (typeof raw === 'string') return raw.trim() || fallback;
  const parts = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : raw.name || fallback;
}

export default function ActionDoneMatrixTab({
  project,
  isFaculty = false,
  isStudent = false,
  user,
  onRefresh,
  initialMilestone,
}) {
  // Local state for immediate responsiveness & autosave
  const [rows, setRows] = useState([]);
  const [reviewType, setReviewType] = useState('internal');
  const [projectTitle, setProjectTitle] = useState('');
  const [savingCells, setSavingCells] = useState({}); // { [rowId_field]: 'saving' | 'saved' | 'error' }

  // Milestone revision scoping (Capstone 2, Capstone 3, Capstone 4)
  const defaultMilestone = useMemo(() => {
    if (initialMilestone) return initialMilestone;
    const phase = Number(project?.capstonePhase ?? project?.phase ?? 2);
    if (phase >= 4) return 'CAPSTONE_4';
    if (phase === 3) return 'CAPSTONE_3';
    return 'CAPSTONE_2';
  }, [initialMilestone, project?.capstonePhase, project?.phase]);

  const [selectedMilestone, setSelectedMilestone] = useState(defaultMilestone);

  useEffect(() => {
    if (initialMilestone) {
      setSelectedMilestone(initialMilestone);
    }
  }, [initialMilestone]);

  const displayedRows = useMemo(() => {
    if (selectedMilestone === 'ALL') return rows;
    return rows.filter((r) => (r.milestone || 'CAPSTONE_2') === selectedMilestone);
  }, [rows, selectedMilestone]);

  // Modals & Uploads
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingMinutes, setIsUploadingMinutes] = useState(false);
  const [isSeedingTemplate, setIsSeedingTemplate] = useState(false);

  // Live Defense Minutes Modal
  const [isLiveMinutesModalOpen, setIsLiveMinutesModalOpen] = useState(false);

  // Secretary Endorsement Modal
  const [isEndorsementModalOpen, setIsEndorsementModalOpen] = useState(false);
  const [endorsementNotes, setEndorsementNotes] = useState('');
  const [endorsementTypedName, setEndorsementTypedName] = useState('');
  const [isSubmittingEndorsement, setIsSubmittingEndorsement] = useState(false);
  const [isSubmittingForEndorsement, setIsSubmittingForEndorsement] = useState(false);

  const { fetchUser } = useAuthStore();

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

  // Real-time synchronization of defense minutes and ADM updates
  useEffect(() => {
    const s = getSocket() || connectSocket();
    const projId = project?._id;
    if (!s || !projId) return;

    try {
      s.emit('join:project', projId);
    } catch {
      // Non-blocking
    }

    const handleMinutesUpdate = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        if (onRefresh) onRefresh();
      }
    };

    const handleDefenseScheduled = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        if (onRefresh) onRefresh();
      }
    };

    s.on('defense:minutes_updated', handleMinutesUpdate);
    s.on('project:defense_scheduled', handleDefenseScheduled);
    s.on('project:phase_advanced', handleMinutesUpdate);
    s.on('project:updated', handleMinutesUpdate);

    return () => {
      s.off('defense:minutes_updated', handleMinutesUpdate);
      s.off('project:defense_scheduled', handleDefenseScheduled);
      s.off('project:phase_advanced', handleMinutesUpdate);
      s.off('project:updated', handleMinutesUpdate);
    };
  }, [project?._id, onRefresh]);

  // Committee resolution
  const rawPanelists = useMemo(() => {
    if (Array.isArray(project?.panelists) && project.panelists.length > 0) {
      return project.panelists;
    }
    const fallbackIds = project?.panelistIds || project?.teamId?.panelistIds || [];
    return fallbackIds.map((p, idx) => ({
      userId: p,
      role: idx === 0 ? 'chair' : 'member',
    }));
  }, [project]);

  const chair = useMemo(
    () =>
      rawPanelists.find((p) => p.role === PANEL_ROLES.CHAIR || p.role === 'chair') ||
      rawPanelists[0],
    [rawPanelists],
  );

  const regularPanelists = useMemo(() => {
    const nonChairs = rawPanelists.filter(
      (p) =>
        p.role !== PANEL_ROLES.CHAIR &&
        p.role !== 'chair' &&
        p.role !== PANEL_ROLES.SECRETARY &&
        p.role !== 'secretary',
    );
    if (nonChairs.length > 0) return nonChairs;
    return rawPanelists.slice(1);
  }, [rawPanelists]);

  const adviser = project?.adviserId || project?.teamId?.adviserId;
  const secretary =
    project?.secretaryId ||
    project?.teamId?.secretaryId ||
    rawPanelists.find((p) => p.role === 'secretary' || p.role === PANEL_ROLES.SECRETARY)?.userId;
  const instructor =
    project?.sectionId?.instructorId ||
    project?.sectionId?.createdBy ||
    project?.teamId?.sectionId?.instructorId ||
    project?.teamId?.sectionId?.createdBy ||
    project?.teamId?.leaderId?.instructorId ||
    project?.leaderId?.instructorId ||
    project?.instructorId ||
    (user?.role === ROLES.INSTRUCTOR ? user : null);

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
      rawPanelists.some(
        (p) => p.userId === user._id || p.userId?._id === user._id || p._id === user._id,
      ));

  // Discrete panel member 1 and panel member 2 appointment checks
  const panelist1User =
    regularPanelists[0]?.userId || regularPanelists[0]?.user || regularPanelists[0];
  const panelist1Id = panelist1User?._id || panelist1User;
  const isUserPanelist1 = Boolean(user && panelist1Id && String(panelist1Id) === String(user._id));

  const panelist2User =
    regularPanelists[1]?.userId || regularPanelists[1]?.user || regularPanelists[1];
  const panelist2Id = panelist2User?._id || panelist2User;
  const isUserPanelist2 = Boolean(user && panelist2Id && String(panelist2Id) === String(user._id));

  const isUserSecretary =
    user &&
    (secretary?._id === user._id ||
      String(secretary) === String(user._id) ||
      rawPanelists.some(
        (p) =>
          (p.userId === user._id || p.userId?._id === user._id || p._id === user._id) &&
          (p.role === PANEL_ROLES.SECRETARY || p.role === 'secretary'),
      ));
  const isUserAdviser = user && (adviser?._id === user._id || String(adviser) === String(user._id));
  const isUserInstructor = user && user.role === ROLES.INSTRUCTOR;
  const isCurrentUserStudent = Boolean(isStudent || user?.role === ROLES.STUDENT);

  const designatedInstructorUser =
    project?.sectionId?.instructorId ||
    project?.sectionId?.createdBy ||
    project?.teamId?.sectionId?.instructorId ||
    project?.teamId?.sectionId?.createdBy ||
    project?.teamId?.leaderId?.instructorId ||
    project?.leaderId?.instructorId ||
    project?.instructorId;
  const designatedInstructorId = designatedInstructorUser?._id || designatedInstructorUser;
  const isUserDesignatedInstructor = Boolean(
    user &&
    user.role === ROLES.INSTRUCTOR &&
    (!designatedInstructorId || String(designatedInstructorId) === String(user._id)),
  );

  const canUploadMinutes = isFaculty || isUserInstructor;
  const isSecretaryEndorsed = Boolean(admSignatures?.secretary?.endorsed);
  const canEndorse = Boolean(isUserSecretary); // Strictly only the appointed secretary
  const canManageLiveMinutes = isUserSecretary || isUserChair || isUserInstructor || isFaculty;
  const canAddRow = isFaculty || isUserPanelist || isUserInstructor;
  const canSeedTemplate = isFaculty || isUserInstructor;
  const canManageReviewType = Boolean(
    (isFaculty || isUserInstructor || isUserChair || isUserSecretary || isUserPanelist) &&
    !isCurrentUserStudent,
  );

  const defenseType = useMemo(() => {
    if (selectedMilestone === 'CAPSTONE_4') return 'final';
    if (selectedMilestone === 'CAPSTONE_3') return 'midterm';
    return 'proposal';
  }, [selectedMilestone]);

  const allRowsAddressed = useMemo(() => {
    return (
      rows.length > 0 && rows.every((r) => r.status === 'addressed' || r.status === 'verified')
    );
  }, [rows]);

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

    const targetMilestone = selectedMilestone === 'ALL' ? defaultMilestone : selectedMilestone;

    try {
      const res = await projectService.createActionDoneMatrixItem(project._id, {
        panelName: defaultPanelName,
        suggestion: '',
        actionDone: '',
        pageNumbers: '',
        milestone: targetMilestone,
      });
      toast.success(`Added new evaluation row for ${targetMilestone.replace('_', ' ')}.`);
      if (res?.data?.data?.actionDoneMatrix) {
        setRows(res.data.data.actionDoneMatrix);
      }
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Failed to add ADM row.');
    }
  };

  // Panel fulfillment verification checkbox handler
  const handleToggleFulfillment = async (rowId, isVerified) => {
    if (!projectId) return;
    const newStatus = isVerified ? 'verified' : 'addressed';

    // Optimistically update local rows
    setRows((prev) =>
      prev.map((r) => ((r._id || r.id) === rowId ? { ...r, status: newStatus } : r)),
    );

    try {
      await projectService.patchADMRow(projectId, rowId, { status: newStatus });
      toast.success(
        isVerified
          ? 'Recommendation marked as Fulfilled & Verified by Panel!'
          : 'Recommendation marked as Pending Verification.',
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update verification status.');
      if (onRefresh) onRefresh();
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

  // Digital Signature Submit
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
      await projectService.signTieredADM(project._id, {
        tier: signingSignatory.tier,
        role: signingSignatory.role,
        signatoryName: finalName,
        signatureDataUrl: sigToUse,
      });

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

  const handleSubmitForEndorsement = async () => {
    if (!projectId) return;
    if (!allRowsAddressed) {
      toast.error('Please address all revision items before submitting for Secretary endorsement.');
      return;
    }
    setIsSubmittingForEndorsement(true);
    try {
      await projectService.submitADMForEndorsement(projectId);
      toast.success('Action Done Matrix submitted for Secretary review.');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit for endorsement.');
    } finally {
      setIsSubmittingForEndorsement(false);
    }
  };

  const handleConfirmEndorsement = async () => {
    if (!projectId) return;
    setIsSubmittingEndorsement(true);
    try {
      const name = endorsementTypedName || formatFullName(user, 'Committee Secretary');
      await projectService.endorseADM(projectId, {
        notes: endorsementNotes,
        signatoryName: name,
      });
      toast.success('Action Done Matrix successfully endorsed by Committee Secretary.');
      setIsEndorsementModalOpen(false);
      setEndorsementNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to endorse Action Done Matrix.');
    } finally {
      setIsSubmittingEndorsement(false);
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
          {rows.length === 0 && canSeedTemplate && (
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

          {/* Live Defense Minutes Button */}
          {canManageLiveMinutes && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsLiveMinutesModalOpen(true)}
              className="gap-1.5 text-xs h-8 font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <FileText className="h-3.5 w-3.5" />
              Live Defense Session & Minutes
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

          {/* Student Submit for Endorsement */}
          {isStudent && rows.length > 0 && !isSecretaryEndorsed && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSubmitForEndorsement}
              disabled={isSubmittingForEndorsement || !allRowsAddressed}
              className="gap-1.5 text-xs h-8 font-semibold"
            >
              {isSubmittingForEndorsement ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Submit for Secretary Endorsement
            </Button>
          )}

          {/* Secretary Endorse Matrix */}
          {canEndorse && !isSecretaryEndorsed && rows.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsEndorsementModalOpen(true)}
              className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Endorse Matrix
            </Button>
          )}

          {canAddRow && (
            <Button size="sm" onClick={handleAddRow} className="gap-1.5 text-xs h-8">
              <Plus className="h-3.5 w-3.5" />
              Add Row
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs h-8">
            <Printer className="h-3.5 w-3.5" />
            Print / Export Document
          </Button>
        </div>
      </div>

      {/* Milestone Revision Scope Selector */}
      <div className="max-w-5xl mx-auto print:hidden space-y-3">
        <ADMPhaseSelector
          selectedPhase={selectedMilestone}
          onPhaseChange={setSelectedMilestone}
          academicYear={project?.academicYear || '2025–2026'}
        />

        {/* Real-time Defense Synchronization & Post-Defense Instructions Banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Real-Time Defense Synchronization & Action Done Matrix
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              During defense hearings, Panelist recommendations and Client feedback are recorded
              live in the official Secretary Minutes (BukSU Form OVPAA-F-INS-032) and synchronized
              into this matrix. Post-defense, proponents document their{' '}
              <strong className="text-foreground">Action Taken</strong>, cite exact{' '}
              <strong className="text-foreground">Page Number/s</strong>, and upload their revised
              Chapters 1–3 manuscript for committee verification.
            </p>
          </div>
          {canManageLiveMinutes && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLiveMinutesModalOpen(true)}
              className="text-xs h-7 gap-1.5 text-primary border-primary/30 hover:bg-primary/10 shrink-0 font-medium shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              Live Minutes (OVPAA-F-INS-032)
            </Button>
          )}
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
              <label
                className={cn(
                  'flex items-center gap-2 select-none',
                  canManageReviewType ? 'cursor-pointer' : 'cursor-default opacity-85',
                )}
              >
                <input
                  id="review-internal"
                  type="checkbox"
                  checked={reviewType === 'internal'}
                  disabled={!canManageReviewType}
                  onChange={() => canManageReviewType && handleToggleReviewType('internal')}
                  className={cn(
                    'h-4 w-4 rounded border-black text-primary focus:ring-primary',
                    !canManageReviewType && 'cursor-default',
                  )}
                />
                <span className="font-medium text-foreground print:text-black">
                  Internal Review
                </span>
              </label>

              <label
                className={cn(
                  'flex items-center gap-2 select-none',
                  canManageReviewType ? 'cursor-pointer' : 'cursor-default opacity-85',
                )}
              >
                <input
                  id="review-external"
                  type="checkbox"
                  checked={reviewType === 'external'}
                  disabled={!canManageReviewType}
                  onChange={() => canManageReviewType && handleToggleReviewType('external')}
                  className={cn(
                    'h-4 w-4 rounded border-black text-primary focus:ring-primary',
                    !canManageReviewType && 'cursor-default',
                  )}
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
          {displayedRows.length === 0 ? (
            <div className="p-8 text-center text-xs sm:text-sm text-muted-foreground italic">
              {rows.length === 0
                ? isCurrentUserStudent
                  ? 'No recommendations recorded yet by the defense committee or panel.'
                  : 'No recommendations recorded yet. Click "Add Row" or "Load Institutional Template" to begin.'
                : isCurrentUserStudent
                  ? `No recommendations recorded for ${selectedMilestone.replace('_', ' ')} yet.`
                  : `No recommendations recorded for ${selectedMilestone.replace('_', ' ')}. Switch phase scope or click "Add Row" to append an item.`}
            </div>
          ) : (
            <div className="divide-y divide-black dark:divide-border print:divide-black">
              {displayedRows.map((row, idx) => {
                const rowId = row._id || row.id || idx;
                const isLocked = Boolean(row.isLocked);

                // Permission rules:
                const canEditPanel = (isFaculty || isUserPanelist || isUserInstructor) && !isLocked;
                const canEditSuggestion =
                  (isFaculty || isUserPanelist || isUserInstructor) && !isLocked;
                const canEditAction = isStudent && !isLocked;
                const canVerifyRow =
                  (isFaculty ||
                    isUserPanelist ||
                    isUserSecretary ||
                    isUserInstructor ||
                    isUserAdviser) &&
                  !isLocked;

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
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground font-sans print:hidden">
                        {(row.panelName?.toLowerCase().includes('(client)') ||
                          row.remarks?.includes('Client')) && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] py-0 px-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          >
                            Client Feedback
                          </Badge>
                        )}
                        {row.milestone && (
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 px-1 border-primary/30 text-primary"
                          >
                            {row.milestone === 'CAPSTONE_3'
                              ? 'Cap 3'
                              : row.milestone === 'CAPSTONE_4'
                                ? 'Cap 4'
                                : 'Cap 2'}
                          </Badge>
                        )}
                        {isLocked && (
                          <span className="flex items-center gap-1 text-amber-500 font-medium">
                            <Lock className="h-3 w-3" />
                            Locked
                          </span>
                        )}
                      </div>
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

                    {/* Column 3: Action Taken & Fulfillment Verification (Col span 4) */}
                    <div className="col-span-4 p-3 flex flex-col justify-between">
                      <AutoExpandingTextarea
                        value={row.actionDone || ''}
                        onChange={(e) => handleCellChange(rowId, 'actionDone', e.target.value)}
                        placeholder="- Description of modifications made..."
                        disabled={!canEditAction}
                        savingStatus={savingCells[`${rowId}_actionDone`]}
                        className="text-foreground print:text-black whitespace-pre-line"
                        minRows={3}
                      />

                      {/* Panel Fulfillment Verification Checkbox (Interactive for committee) */}
                      <div className="mt-2.5 pt-2 border-t border-dashed border-border/50 flex items-center justify-between gap-2 text-xs font-sans print:hidden">
                        <label
                          htmlFor={`verify-row-${rowId}`}
                          className={cn(
                            'inline-flex items-center gap-2 select-none text-[11px] font-medium transition-colors',
                            canVerifyRow ? 'cursor-pointer' : 'cursor-default opacity-85',
                            row.status === 'verified'
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : row.status === 'addressed'
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : 'text-muted-foreground',
                          )}
                        >
                          <input
                            id={`verify-row-${rowId}`}
                            type="checkbox"
                            checked={row.status === 'verified'}
                            disabled={!canVerifyRow}
                            onChange={(e) => handleToggleFulfillment(rowId, e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-border text-emerald-600 focus:ring-emerald-500 focus:ring-offset-background cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span>
                            {row.status === 'verified' ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                Fulfilled & Verified by Panel
                              </span>
                            ) : row.status === 'addressed' ? (
                              <span>Action Documented — Pending Panel Verification</span>
                            ) : (
                              <span>Pending Student Action</span>
                            )}
                          </span>
                        </label>

                        {row.status === 'verified' && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0 font-semibold"
                          >
                            Verified
                          </Badge>
                        )}
                      </div>
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
                      {!isLocked && canAddRow && (
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
        {/* 3. DEDICATED SIGNATORIES BOARD (3 TIERS + SECRETARY GATE) */}
        {/* ============================================================ */}
        <div className="mt-12 space-y-10 font-sans text-xs sm:text-sm">
          {/* Secretary Compliance Endorsement Verification Banner */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4 font-sans text-left space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className={`h-5 w-5 ${
                    isSecretaryEndorsed
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-500'
                  }`}
                />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Secretary Compliance Verification Gate
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Prerequisite compliance audit: The Committee Secretary must endorse all student
                    revision fulfillments before committee digital signatures can unlock.
                  </p>
                </div>
              </div>
              <Badge
                variant={isSecretaryEndorsed ? 'secondary' : 'outline'}
                className={`text-[10px] uppercase font-semibold tracking-wider ${
                  isSecretaryEndorsed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-500/30'
                }`}
              >
                {isSecretaryEndorsed ? 'Endorsed & Unlocked' : 'Endorsement Pending'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Designated Secretary: </span>
                <span className="font-semibold text-foreground">
                  {admSignatures.secretary?.signatoryName ||
                    formatFullName(secretary?.user || secretary, 'Committee Secretary')}
                </span>
                {admSignatures.secretary?.endorsedAt && (
                  <span className="text-muted-foreground text-[11px] ml-2">
                    (Endorsed on {new Date(admSignatures.secretary.endorsedAt).toLocaleDateString()}
                    )
                  </span>
                )}
                {admSignatures.secretary?.notes && (
                  <p className="text-[11px] italic text-muted-foreground mt-1">
                    Remarks: &ldquo;{admSignatures.secretary.notes}&rdquo;
                  </p>
                )}
              </div>

              {canEndorse && !isSecretaryEndorsed && (
                <Button
                  size="sm"
                  onClick={() => setIsEndorsementModalOpen(true)}
                  className="gap-1.5 text-xs h-7 font-medium no-print"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Sign Secretary Endorsement
                </Button>
              )}
            </div>
          </div>

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
              canSign={isUserDesignatedInstructor}
              isLockedBySecretary={false}
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
                formatFullName(
                  regularPanelists[0]?.userId || regularPanelists[0]?.user || regularPanelists[0],
                  'Pending Appointment',
                )
              }
              designation="Panel Member"
              signatureState={admSignatures.panelists?.[0]}
              canSign={isSecretaryEndorsed && isUserPanelist1}
              isLockedBySecretary={!isSecretaryEndorsed && isUserPanelist1}
              onSign={() =>
                handleOpenSignModal({
                  tier: 2,
                  role: 'panelist',
                  defaultName: formatFullName(
                    regularPanelists[0]?.userId || regularPanelists[0]?.user || regularPanelists[0],
                    'Pending Appointment',
                  ),
                })
              }
            />

            {/* Panel Member 2 */}
            <SignatoryCard
              name={
                admSignatures.panelists?.[1]?.signatoryName ||
                formatFullName(
                  regularPanelists[1]?.userId || regularPanelists[1]?.user || regularPanelists[1],
                  'Pending Appointment',
                )
              }
              designation="Panel Member"
              signatureState={admSignatures.panelists?.[1]}
              canSign={isSecretaryEndorsed && isUserPanelist2}
              isLockedBySecretary={!isSecretaryEndorsed && isUserPanelist2}
              onSign={() =>
                handleOpenSignModal({
                  tier: 2,
                  role: 'panelist',
                  defaultName: formatFullName(
                    regularPanelists[1]?.userId || regularPanelists[1]?.user || regularPanelists[1],
                    'Pending Appointment',
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
                  formatFullName(chair?.userId || chair?.user || chair, 'Pending Appointment')
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
      {signingSignatory &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex min-h-full items-center justify-center overflow-y-auto bg-black/75 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200 no-print"
            role="dialog"
            aria-modal="true"
            aria-labelledby="endorsement-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmittingSignature) {
                setSigningSignatory(null);
              }
            }}
          >
            <div
              className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-xl p-6 space-y-4 my-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <PenTool className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 id="endorsement-modal-title" className="text-base font-semibold">
                      Official Committee Endorsement
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Signatory Role:{' '}
                      <strong className="text-foreground capitalize">
                        {signingSignatory.role}
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

              <p className="text-xs text-muted-foreground leading-relaxed">
                Applying your digital signature confirms that the revisions and action items
                recorded across this Action Done Matrix have been verified against institutional
                criteria.
              </p>

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

              {/* Signature Selector / Canvas */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Official Digital Signature</Label>
                  {user?.digitalSignature && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawingNewSignature((prev) => {
                          const next = !prev;
                          if (next) {
                            setSignatureDataUrl(null);
                          } else {
                            setSignatureDataUrl(user.digitalSignature);
                          }
                          return next;
                        });
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {isDrawingNewSignature
                        ? 'Use Saved Signature'
                        : 'Draw New / Custom Signature'}
                    </button>
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
                      {signatoryTypedName || formatFullName(user)}
                    </p>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Configured in Account Settings
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <SignaturePad
                      defaultSignatoryName={signatoryTypedName || formatFullName(user)}
                      onChange={(dataUrl) => setSignatureDataUrl(dataUrl)}
                      onClear={() => setSignatureDataUrl(null)}
                      height={140}
                    />

                    {/* Save to Settings Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={saveSignatureForFuture}
                        onChange={(e) => setSaveSignatureForFuture(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground select-none">
                        Save this signature to my account settings for future one-click endorsements
                      </span>
                    </label>
                  </div>
                )}
              </div>

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
                  disabled={isSubmittingSignature || (!signatureDataUrl && !user?.digitalSignature)}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  {isSubmittingSignature ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recording Endorsement...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" /> Sign & Endorse
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Secretary Endorsement Confirmation Modal */}
      {isEndorsementModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex min-h-full items-center justify-center overflow-y-auto bg-black/75 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200 no-print"
            role="dialog"
            aria-modal="true"
            aria-labelledby="secretary-endorsement-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmittingEndorsement) {
                setIsEndorsementModalOpen(false);
              }
            }}
          >
            <div
              className="w-full max-w-md bg-card border border-border shadow-2xl rounded-xl p-6 space-y-4 my-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 id="secretary-endorsement-modal-title" className="text-base font-semibold">
                      Committee Secretary Endorsement
                    </h4>
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

              <p className="text-xs text-muted-foreground leading-relaxed">
                As the Committee Secretary, your endorsement certifies that the proponent team has
                satisfactorily addressed all panel recommendations in accordance with the defense
                proceedings. This will unlock digital signatures for the panel members and adviser.
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sec-name" className="text-xs font-medium">
                    Signatory Full Legal Name
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
                  <textarea
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
                  disabled={isSubmittingEndorsement}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  {isSubmittingEndorsement ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Endorsing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" /> Confirm Endorsement
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Live Defense Minutes Modal */}
      <LiveDefenseMinutesModal
        open={isLiveMinutesModalOpen}
        onOpenChange={setIsLiveMinutesModalOpen}
        projectId={projectId}
        defenseType={defenseType}
        project={project}
        user={user}
        onMinutesPublished={() => {
          if (onRefresh) onRefresh();
        }}
      />
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
  const isSigned = Boolean(signatureState?.signed);
  const signatureDataUrl = signatureState?.signatureDataUrl;
  const signedAt = signatureState?.signedAt ? new Date(signatureState.signedAt) : null;
  const formattedDate = signedAt
    ? signedAt.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const auditId = signatureState?.userId
    ? String(signatureState.userId).slice(-6).toUpperCase()
    : 'SIG-OFFICIAL';

  return (
    <div className="flex flex-col items-center justify-end space-y-1 min-h-[110px]">
      {/* 1. TOP: Digital Signature Image + Micro Audit Trail Stamp (or Sign Action) */}
      <div className="h-14 flex flex-col items-center justify-center w-full max-w-[280px]">
        {isSigned ? (
          <div className="flex flex-col items-center justify-center space-y-0.5">
            {signatureDataUrl && signatureDataUrl.startsWith('data:image') ? (
              <img
                src={signatureDataUrl}
                alt={`Digital signature of ${name}`}
                className="max-h-10 max-w-[220px] object-contain filter drop-shadow-xs"
              />
            ) : (
              <span className="font-serif italic text-base text-primary dark:text-primary-foreground">
                {signatureState?.signatoryName || name}
              </span>
            )}
            <span className="text-[9px] text-muted-foreground font-mono tracking-tight print:hidden">
              Digitally signed on {formattedDate} | Ref: {auditId}
            </span>
          </div>
        ) : canSign ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onSign}
            className="h-7 text-xs px-3 text-primary border-primary/50 hover:bg-primary/10 gap-1.5 shadow-xs no-print"
          >
            <PenTool className="h-3 w-3" /> Sign Digitally
          </Button>
        ) : (
          <div className="h-7" />
        )}
      </div>

      {/* 2. MIDDLE: Bold Printed Legal Name */}
      <p className="font-bold text-xs sm:text-sm uppercase tracking-wide text-foreground print:text-black">
        {name ? String(name).toUpperCase() : ''}
      </p>

      {/* 3. BOTTOM: Horizontal Underline */}
      <div className="w-full max-w-[280px] border-b border-black dark:border-border print:border-black my-1" />

      {/* Subtitle / Official Designation Below Underline */}
      <p className="text-[11px] sm:text-xs text-muted-foreground print:text-neutral-700">
        {designation}
      </p>

      {/* Status Badges (Hidden on print) */}
      <div className="pt-0.5 no-print">
        {isSigned ? (
          <Badge
            variant="secondary"
            className="text-[10px] h-5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-500/30 gap-1"
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
            Verified
          </Badge>
        ) : isLockedBySecretary ? (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
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
