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
import buksuLogo from '@/assets/buksu-logo.png';
import SecretaryMinutesDocumentSheet from '@/components/secretary/SecretaryMinutesDocumentSheet';
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
  Lock,
  Send,
  FileText,
  Layers,
  ChevronUp,
  ChevronDown,
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

/**
 * Auto-expanding Textarea matching Secretary Minutes input style
 * In interactive screen mode: transparent background, auto-resizing, subtle underline on focus/hover.
 * In print mode: pure static typography div without borders, boxes, scrollbars, or placeholders.
 */
function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 1,
  disabled = false,
  ...props
}) {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <>
      <textarea
        ref={textareaRef}
        value={value || ''}
        onChange={(e) => {
          onChange?.(e);
          adjustHeight();
        }}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none resize-none overflow-hidden text-xs sm:text-sm text-black leading-snug py-0.5 transition-[height] duration-75 print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent',
          className,
        )}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        {...props}
      />
      <div
        className={cn(
          'hidden print:block w-full text-[8.5pt] leading-snug text-black whitespace-pre-wrap break-words py-0.5 font-serif min-h-[1.2rem]',
          className,
        )}
      >
        {value || ''}
      </div>
    </>
  );
}

export default function ActionDoneMatrixTab({
  project,
  isFaculty: isFacultyProp = false,
  isStudent: isStudentProp = false,
  user: userProp,
  onRefresh,
  initialMilestone,
}) {
  const storeUser = useAuthStore((s) => s.user);
  const user = userProp || storeUser;
  const isFaculty = isFacultyProp || user?.role === ROLES.FACULTY;
  const isStudent = isStudentProp || user?.role === ROLES.STUDENT;

  // Navigation tabs: 'adm' (Action Done Matrix) or 'minutes' (Secretary Minutes Form)
  const [activeViewTab, setActiveViewTab] = useState('adm');

  // Multi-page document sheet state (consistent with Secretary Minutes)
  const [rowPageMap, setRowPageMap] = useState({}); // { [rowId]: pageIndex }
  const [docMeta, setDocMeta] = useState({
    documentCode: 'RU- F-033',
    revisionNo: '002',
    issueNo: '002',
    issueDate: 'May 15, 2018',
  });

  const handleDocMetaChange = (field, value) => {
    setDocMeta((prev) => ({ ...prev, [field]: value }));
  };

  // Local state for immediate responsiveness & autosave
  const [rows, setRows] = useState([]);
  const [reviewType, setReviewType] = useState('internal');
  const [projectTitle, setProjectTitle] = useState('');
  const [savingCells, setSavingCells] = useState({}); // { [rowId_field]: 'saving' | 'saved' | 'error' }

  // Milestone revision scoping (Capstone 1, Capstone 2, Capstone 3)
  const defaultMilestone = useMemo(() => {
    if (initialMilestone) return initialMilestone;
    const phase = Number(project?.capstonePhase ?? project?.phase ?? 1);
    if (phase >= 3) return 'CAPSTONE_3';
    if (phase === 2) return 'CAPSTONE_2';
    return 'CAPSTONE_1';
  }, [initialMilestone, project?.capstonePhase, project?.phase]);

  const [selectedMilestone, setSelectedMilestone] = useState(defaultMilestone);

  useEffect(() => {
    if (initialMilestone) {
      setSelectedMilestone(initialMilestone);
    }
  }, [initialMilestone]);

  const displayedRows = useMemo(() => {
    if (selectedMilestone === 'ALL') return rows;
    return rows.filter((r) => (r.milestone || 'CAPSTONE_1') === selectedMilestone);
  }, [rows, selectedMilestone]);

  const PAGE_1_CAPACITY = 4;
  const CONTINUATION_PAGE_CAPACITY = 6;
  const FINAL_PAGE_MAX_ROWS = 2;

  // Automatically determine minimal required pages based on row count
  const autoPageCount = useMemo(() => {
    const n = displayedRows.length;
    if (n <= PAGE_1_CAPACITY + FINAL_PAGE_MAX_ROWS) return 2;
    const remaining = n - PAGE_1_CAPACITY - FINAL_PAGE_MAX_ROWS;
    const contPages = Math.ceil(remaining / CONTINUATION_PAGE_CAPACITY);
    return 2 + contPages;
  }, [displayedRows.length]);

  const [manualPageCount, setManualPageCount] = useState(null);
  const totalPages = Math.max(2, manualPageCount !== null ? manualPageCount : autoPageCount);

  // Group displayed rows by their designated document sheet
  const rowsByPage = useMemo(() => {
    const pages = Array.from({ length: totalPages }, () => []);

    // Determine default page index for a row when not manually mapped
    const getDefaultPage = (idx) => {
      if (totalPages === 2) {
        return idx < PAGE_1_CAPACITY ? 0 : 1;
      }
      if (idx < PAGE_1_CAPACITY) return 0;
      const remainingIdx = idx - PAGE_1_CAPACITY;
      const continuationPageLimit = totalPages - 2; // number of continuation pages
      const contPageIdx = Math.floor(remainingIdx / CONTINUATION_PAGE_CAPACITY);
      if (contPageIdx < continuationPageLimit) {
        return 1 + contPageIdx;
      }
      return totalPages - 1; // Final sign-off page
    };

    displayedRows.forEach((row, idx) => {
      const rowId = row._id || row.id || idx;
      const assigned = rowPageMap[rowId];
      const targetPage =
        typeof assigned === 'number' && assigned >= 0 && assigned < totalPages
          ? assigned
          : getDefaultPage(idx);
      pages[targetPage].push(row);
    });
    return pages;
  }, [displayedRows, totalPages, rowPageMap]);

  // Insert continuation page strictly before the final sign-off sheet
  const handleAddContinuationPage = (insertIndex) => {
    const targetIdx = typeof insertIndex === 'number' ? insertIndex : totalPages - 1;
    setManualPageCount((prev) => (prev !== null ? prev + 1 : totalPages + 1));
    setRowPageMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (updated[key] >= targetIdx) {
          updated[key] = updated[key] + 1;
        }
      });
      return updated;
    });
    toast.success('Inserted Continuation Page before Final Sign-Off Sheet.');
  };

  // Remove a continuation page (preserving minimum 2 pages)
  const handleRemovePage = (pageIdxToRemove) => {
    if (totalPages <= 2) {
      toast.error('The Action Done Matrix requires at least Page 1 and the Final Sign-Off Sheet.');
      return;
    }
    setRowPageMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (updated[key] === pageIdxToRemove) {
          updated[key] = Math.max(0, pageIdxToRemove - 1);
        } else if (updated[key] > pageIdxToRemove) {
          updated[key] = updated[key] - 1;
        }
      });
      return updated;
    });
    setManualPageCount((prev) => Math.max(2, prev !== null ? prev - 1 : totalPages - 1));
    toast.success(`Removed Continuation Page ${pageIdxToRemove + 1}.`);
  };

  // Move row between document sheets
  const handleMoveRowUp = (rowId, currentPageIdx) => {
    if (currentPageIdx <= 0) return;
    setRowPageMap((prev) => ({
      ...prev,
      [rowId]: currentPageIdx - 1,
    }));
  };

  const handleMoveRowDown = (rowId, currentPageIdx) => {
    if (currentPageIdx >= totalPages - 1) return;
    setRowPageMap((prev) => ({
      ...prev,
      [rowId]: currentPageIdx + 1,
    }));
  };

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

  // Debounce timers & pending values map
  const debounceTimers = useRef({});
  const pendingValues = useRef({});

  // Target milestone computation
  const targetMilestone = selectedMilestone === 'ALL' ? defaultMilestone : selectedMilestone;

  // Sync project props and milestone-isolated review type to local state
  useEffect(() => {
    if (project) {
      setRows(project.actionDoneMatrix || []);
      const milestoneReviewType =
        project.admReviewTypeByMilestone?.[targetMilestone] || project.admReviewType || 'internal';
      setReviewType(milestoneReviewType);
      setProjectTitle(project.title || '');
    }
  }, [project, targetMilestone]);

  // Real-time synchronization of ADM rows, signatures, and endorsements
  useEffect(() => {
    const s = getSocket() || connectSocket();
    const projId = project?._id;
    if (!s || !projId) return;

    try {
      s.emit('join:project', projId);
    } catch {
      // Non-blocking
    }

    const handleRowUpdated = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        if (data.row) {
          setRows((prev) =>
            prev.map((r) =>
              (r._id || r.id) === (data.row._id || data.row.id) ? { ...r, ...data.row } : r,
            ),
          );
        }
      }
    };

    const handleRowCreated = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        if (data.row) {
          setRows((prev) => {
            const exists = prev.some((r) => (r._id || r.id) === (data.row._id || data.row.id));
            return exists ? prev : [...prev, data.row];
          });
        }
      }
    };

    const handleRowDeleted = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        if (data.rowId) {
          setRows((prev) => prev.filter((r) => (r._id || r.id) !== data.rowId));
        }
      }
    };

    const handleSigned = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        if (onRefresh) onRefresh();
      }
    };

    const handleEndorsed = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        if (onRefresh) onRefresh();
      }
    };

    const handleMetadataUpdated = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        if (data.reviewType) setReviewType(data.reviewType);
        if (data.title) setProjectTitle(data.title);
        if (onRefresh) onRefresh();
      }
    };

    s.on('adm:row_updated', handleRowUpdated);
    s.on('adm:row_created', handleRowCreated);
    s.on('adm:row_deleted', handleRowDeleted);
    s.on('adm:signed', handleSigned);
    s.on('adm:endorsed', handleEndorsed);
    s.on('adm:metadata_updated', handleMetadataUpdated);
    s.on('defense:minutes_updated', () => onRefresh?.());
    s.on('project:defense_scheduled', () => onRefresh?.());
    s.on('project:phase_advanced', () => onRefresh?.());
    s.on('project:updated', () => onRefresh?.());

    return () => {
      s.off('adm:row_updated', handleRowUpdated);
      s.off('adm:row_created', handleRowCreated);
      s.off('adm:row_deleted', handleRowDeleted);
      s.off('adm:signed', handleSigned);
      s.off('adm:endorsed', handleEndorsed);
      s.off('adm:metadata_updated', handleMetadataUpdated);
      s.off('defense:minutes_updated');
      s.off('project:defense_scheduled');
      s.off('project:phase_advanced');
      s.off('project:updated');
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

  // Milestone-isolated signatures
  const admSignatures = useMemo(() => {
    if (project?.admSignaturesByMilestone?.[targetMilestone]) {
      return project.admSignaturesByMilestone[targetMilestone];
    }
    const currentMilestoneKey =
      Number(project?.capstonePhase ?? project?.phase ?? 1) >= 3
        ? 'CAPSTONE_3'
        : Number(project?.capstonePhase ?? project?.phase ?? 1) === 2
          ? 'CAPSTONE_2'
          : 'CAPSTONE_1';
    if (targetMilestone === currentMilestoneKey && project?.admSignatures) {
      return project.admSignatures;
    }
    return {
      secretary: { endorsed: false },
      adviser: { signed: false },
      instructor: { signed: false },
      chair: { signed: false },
      panelists: [],
      dean: { signed: false },
    };
  }, [
    project?.admSignaturesByMilestone,
    project?.admSignatures,
    project?.capstonePhase,
    project?.phase,
    targetMilestone,
  ]);

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

  // Unnecessary button removal: ONLY secretary can upload minutes
  const canUploadMinutes = Boolean(isUserSecretary);
  const isSecretaryEndorsed = Boolean(admSignatures?.secretary?.endorsed);
  const canEndorse = Boolean(isUserSecretary); // Strictly only the appointed secretary
  const canAddRow = isFaculty || isUserPanelist || isUserInstructor;
  const canManageReviewType = Boolean(
    (isFaculty || isUserInstructor || isUserChair || isUserSecretary || isUserPanelist) &&
    !isCurrentUserStudent,
  );

  const allRowsAddressed = useMemo(() => {
    return (
      displayedRows.length > 0 &&
      displayedRows.every((r) => r.status === 'addressed' || r.status === 'verified')
    );
  }, [displayedRows]);

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

    // Track pending value
    const timerKey = `${rowId}_${field}`;
    pendingValues.current[timerKey] = value;

    // Clear existing timer
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }

    // Debounce network patch by 750ms
    debounceTimers.current[timerKey] = setTimeout(() => {
      delete debounceTimers.current[timerKey];
      delete pendingValues.current[timerKey];
      saveCell(rowId, field, value);
    }, 750);
  };

  // Immediate save on blur for real-time live editing completion
  const handleCellBlur = (rowId, field) => {
    const timerKey = `${rowId}_${field}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
      delete debounceTimers.current[timerKey];
      const val = pendingValues.current[timerKey];
      delete pendingValues.current[timerKey];
      if (val !== undefined) {
        saveCell(rowId, field, val);
      }
    }
  };

  // Review type toggle (milestone-isolated)
  const handleToggleReviewType = async (type) => {
    if (!isFaculty && !isStudent) return;
    setReviewType(type);
    try {
      await projectService.updateADMMetadata(project._id, {
        admReviewType: type,
        milestone: targetMilestone,
      });
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

  // Add evaluation row (milestone-isolated)
  const handleAddRow = async () => {
    const defaultPanelName = isUserChair
      ? formatFullName(user)
      : regularPanelists.length > 0
        ? formatFullName(regularPanelists[0].user || regularPanelists[0])
        : 'Panel Member';

    try {
      const res = await projectService.createActionDoneMatrixItem(project._id, {
        panelName: defaultPanelName,
        suggestion: 'New recommendation',
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
      await projectService.signTieredADM(project._id, {
        tier: signingSignatory.tier,
        role: signingSignatory.role,
        signatoryName: finalName,
        signatureDataUrl: sigToUse,
        milestone: targetMilestone,
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
    setIsSubmittingEndorsement(true);
    try {
      const name = endorsementTypedName || formatFullName(user, 'Committee Secretary');
      await projectService.endorseADM(projectId, {
        notes: endorsementNotes,
        signatoryName: name,
        milestone: targetMilestone,
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

  // Add row to specific document sheet
  const handleAddRowToPage = async (pageIdx = 0) => {
    const defaultPanelName = isUserChair
      ? formatFullName(user)
      : regularPanelists.length > 0
        ? formatFullName(regularPanelists[0].user || regularPanelists[0])
        : 'Panel Member';

    try {
      const res = await projectService.createActionDoneMatrixItem(project._id, {
        panelName: defaultPanelName,
        suggestion: 'New recommendation',
        actionDone: '',
        pageNumbers: '',
        milestone: targetMilestone,
      });
      toast.success(`Added new evaluation row for ${targetMilestone.replace('_', ' ')}.`);
      if (res?.data?.data?.actionDoneMatrix) {
        setRows(res.data.data.actionDoneMatrix);
        const addedItem = res.data.data.actionDoneMatrix[res.data.data.actionDoneMatrix.length - 1];
        const addedId = addedItem?._id || addedItem?.id;
        if (addedId) {
          setRowPageMap((prev) => ({ ...prev, [addedId]: pageIdx }));
        }
      }
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Failed to add ADM row.');
    }
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

  return (
    <div className="space-y-6">
      {/* ── View Switcher: Action Done Matrix vs Secretary Minutes ── */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3 no-print">
        <button
          type="button"
          onClick={() => setActiveViewTab('adm')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all',
            activeViewTab === 'adm'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
          )}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Action Done Matrix (ADM)
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab('minutes')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all',
            activeViewTab === 'minutes'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
          )}
        >
          <FileText className="h-4 w-4" />
          Secretary Minutes (OVPAA-F-INS-032)
        </button>
      </div>

      {activeViewTab === 'minutes' ? (
        <SecretaryMinutesDocumentSheet
          project={project}
          user={user}
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
              aside, nav, header, footer, [role="navigation"], [role="status"], [role="region"], .no-print, .print\\:hidden, [data-sonner-toaster], .toaster, #toast-container, button {
                display: none !important;
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
              #root .adm-document-page,
              #root div.adm-document-page,
              #root .adm-sheet-paper-container .adm-document-page,
              #root .adm-sheet-paper-container div.adm-document-page,
              .adm-sheet-paper-container .adm-document-page,
              .adm-sheet-paper-container div.adm-document-page,
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
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                font-size: 8.5pt !important;
                line-height: 1.15 !important;
              }
              .adm-document-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              #root .adm-document-footer,
              .adm-document-page .adm-document-footer,
              .adm-document-footer {
                position: absolute !important;
                bottom: 8mm !important;
                left: 18mm !important;
                right: 18mm !important;
                width: calc(210mm - 36mm) !important;
                margin: 0 !important;
                padding-top: 1.5mm !important;
                background: white !important;
              }
              .adm-document-page table {
                font-size: 8.5pt !important;
                line-height: 1.15 !important;
                border-collapse: collapse !important;
                width: 100% !important;
                margin: 0 !important;
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
              .adm-document-page .print\\:hidden {
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
              .group\\/row {
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

              {/* Milestone Switcher Pills (Capstone 1 / ADM v1, Capstone 2 / ADM v2, Capstone 3 / ADM v3) */}
              <div className="flex items-center gap-1 p-0.5 bg-muted/40 rounded-lg border border-border/60 text-xs">
                {[
                  { id: 'CAPSTONE_1', label: 'Cap 1 (ADM v1)' },
                  { id: 'CAPSTONE_2', label: 'Cap 2 (ADM v2)' },
                  { id: 'CAPSTONE_3', label: 'Cap 3 (ADM v3)' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMilestone(m.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-medium transition-all text-xs',
                      selectedMilestone === m.id
                        ? 'bg-background text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {m.label}
                  </button>
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
                >
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  Upload Minutes (PDF)
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
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                  onClick={() => setIsEndorsementModalOpen(true)}
                  className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Endorse Matrix
                </Button>
              )}

              {/* Add Continuation Page Button in Action Bar */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddContinuationPage()}
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
                <div key={pageIdx}>
                  <div
                    className="adm-document-page bg-white text-black font-serif shadow-lg border border-neutral-300 dark:border-neutral-700 min-h-[1050px] p-8 sm:p-12 relative flex flex-col justify-between rounded-xs"
                    data-testid={`adm-document-page-${pageNumber}`}
                  >
                    <div className="space-y-4">
                      {/* Authentic BukSU Header */}
                      <BuksuAdmDocumentHeader />

                      {/* Document Title or Continuation Title */}
                      {isFirstPage ? (
                        <div className="text-center pt-2 pb-1">
                          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black">
                            ACTION DONE MATRIX
                          </h2>
                        </div>
                      ) : (
                        <div className="pt-2 pb-1 relative text-center border-b border-neutral-300 print:border-b-0 pb-2">
                          <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
                            ACTION DONE MATRIX (CONTINUATION)
                          </h2>
                          {!isLastPage && totalPages > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePage(pageIdx)}
                              className="absolute right-0 top-2 text-xs text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 font-sans no-print print:hidden font-medium"
                              title="Remove this continuation page"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove Page {pageNumber}
                            </button>
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
                              <input
                                type="text"
                                value={projectTitle}
                                onChange={(e) => setProjectTitle(e.target.value)}
                                onBlur={handleTitleBlur}
                                disabled={!isFaculty && !isStudent}
                                className="w-full font-bold underline bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none px-1 py-0.5 text-xs sm:text-sm text-black print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent"
                                placeholder="Enter Capstone Project Title..."
                              />
                              <span className="hidden print:inline font-bold underline text-black text-xs sm:text-sm font-serif">
                                {projectTitle || project?.title || ''}
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] sm:text-xs text-neutral-800 italic font-serif">
                            Note to the Researchers: Please submit this form with the revised paper
                            that shall be forwarded to the Capstone Committee/Instructor)
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
                              <label
                                className={cn(
                                  'flex items-center gap-2 select-none text-black font-serif',
                                  canManageReviewType
                                    ? 'cursor-pointer'
                                    : 'cursor-default opacity-85',
                                )}
                              >
                                <input
                                  id={
                                    pageIdx === 0 ? 'review-internal' : `review-internal-${pageIdx}`
                                  }
                                  type="checkbox"
                                  checked={reviewType === 'internal'}
                                  disabled={!canManageReviewType}
                                  onChange={() =>
                                    canManageReviewType && handleToggleReviewType('internal')
                                  }
                                  className={cn(
                                    'h-4 w-4 rounded border-black text-primary focus:ring-primary print:hidden',
                                    !canManageReviewType && 'cursor-default',
                                  )}
                                />
                                <span className="hidden print:inline font-bold text-black text-xs font-serif">
                                  {reviewType === 'internal' ? '[✓]' : '[  ]'}
                                </span>
                                <span className="font-medium text-black">Internal Review</span>
                              </label>

                              <label
                                className={cn(
                                  'flex items-center gap-2 select-none text-black font-serif',
                                  canManageReviewType
                                    ? 'cursor-pointer'
                                    : 'cursor-default opacity-85',
                                )}
                              >
                                <input
                                  id={
                                    pageIdx === 0 ? 'review-external' : `review-external-${pageIdx}`
                                  }
                                  type="checkbox"
                                  checked={reviewType === 'external'}
                                  disabled={!canManageReviewType}
                                  onChange={() =>
                                    canManageReviewType && handleToggleReviewType('external')
                                  }
                                  className={cn(
                                    'h-4 w-4 rounded border-black text-primary focus:ring-primary print:hidden',
                                    !canManageReviewType && 'cursor-default',
                                  )}
                                />
                                <span className="hidden print:inline font-bold text-black text-xs font-serif">
                                  {reviewType === 'external' ? '[✓]' : '[  ]'}
                                </span>
                                <span className="font-medium text-black">External Review</span>
                              </label>
                            </div>
                          </div>

                          {/* Authentic Table matching Secretary Minutes */}
                          <table className="w-full border-collapse border border-black text-xs sm:text-sm font-serif">
                            <thead>
                              <tr className="border-b border-black">
                                <th className="w-[26%] py-2 px-3 text-center font-bold text-black border-r border-black uppercase text-xs sm:text-sm font-serif">
                                  Name of Panel
                                </th>
                                <th className="w-[35%] py-2 px-3 text-center font-bold text-black border-r border-black uppercase text-xs sm:text-sm font-serif">
                                  Suggestion of the Panel(s)
                                </th>
                                <th className="w-[30%] py-2 px-3 text-center font-bold text-black border-r border-black uppercase text-xs sm:text-sm font-serif">
                                  Action Taken
                                </th>
                                <th className="w-[9%] py-2 px-2 text-center font-bold text-black uppercase text-[11px] sm:text-xs font-serif">
                                  Page Number/s
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {pageRows.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="p-6 text-center text-xs text-neutral-500 italic font-serif print:hidden"
                                  >
                                    {isFirstPage && displayedRows.length === 0
                                      ? isCurrentUserStudent
                                        ? 'No recommendations recorded yet by the defense committee or panel.'
                                        : 'No recommendations recorded yet. Click "Add Row" to begin.'
                                      : isLastPage
                                        ? 'Sign-off sheet reserved for committee digital endorsements.'
                                        : 'No rows allocated to this sheet. Use the row movement buttons (↑ / ↓) or click "Add Row to ADM".'}
                                  </td>
                                </tr>
                              ) : (
                                pageRows.map((row, rIdx) => {
                                  const rowId = row._id || row.id || `${pageIdx}-${rIdx}`;
                                  const isLocked = Boolean(row.isLocked);
                                  const canEditPanel =
                                    (isFaculty || isUserPanelist || isUserInstructor) && !isLocked;
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
                                    <tr
                                      key={rowId}
                                      className="align-top border-b border-black last:border-b-0 group/row hover:bg-neutral-50/50 transition-colors text-black"
                                    >
                                      {/* Column 1: Name of Panel */}
                                      <td className="w-[26%] p-2.5 sm:p-3 border-r border-black font-bold text-black relative align-top font-serif">
                                        <input
                                          type="text"
                                          value={row.panelName || ''}
                                          onChange={(e) =>
                                            handleCellChange(rowId, 'panelName', e.target.value)
                                          }
                                          onBlur={() => handleCellBlur(rowId, 'panelName')}
                                          placeholder="Panel Member Name"
                                          disabled={!canEditPanel}
                                          className="w-full font-bold bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none text-xs sm:text-sm text-black py-0.5 print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent"
                                          data-testid={`panel-name-input-${rowId}`}
                                        />
                                        <div className="hidden print:block font-bold text-[8.5pt] leading-tight text-black whitespace-pre-wrap font-serif min-h-[1.2rem]">
                                          {row.panelName || ''}
                                        </div>
                                        {/* Badges on screen */}
                                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-neutral-600 font-sans no-print print:hidden">
                                          {(row.panelName?.toLowerCase().includes('(client)') ||
                                            row.remarks?.includes('Client')) && (
                                            <Badge
                                              variant="secondary"
                                              className="text-[9px] py-0 px-1 bg-amber-500/10 text-amber-700 border-amber-500/30"
                                            >
                                              Client
                                            </Badge>
                                          )}
                                          {row.milestone && (
                                            <Badge
                                              variant="outline"
                                              className="text-[9px] py-0 px-1 border-primary/30 text-primary"
                                            >
                                              {row.milestone === 'CAPSTONE_3' ||
                                              row.milestone === 'CAPSTONE_4'
                                                ? 'Cap 3'
                                                : row.milestone === 'CAPSTONE_2'
                                                  ? 'Cap 2'
                                                  : 'Cap 1'}
                                            </Badge>
                                          )}
                                          {isLocked && (
                                            <span className="flex items-center gap-1 text-amber-600 font-medium">
                                              <Lock className="h-2.5 w-2.5" />
                                              Locked
                                            </span>
                                          )}
                                        </div>
                                        {/* Row Reallocation & Controls on Hover */}
                                        <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity no-print print:hidden">
                                          {pageIdx > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => handleMoveRowUp(rowId, pageIdx)}
                                              className="text-[10px] text-blue-600 hover:text-blue-800 font-sans font-medium"
                                              title={`Move row to Page ${pageIdx}`}
                                            >
                                              ↑ P{pageIdx}
                                            </button>
                                          )}
                                          {pageIdx < totalPages - 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleMoveRowDown(rowId, pageIdx)}
                                              className="text-[10px] text-blue-600 hover:text-blue-800 font-sans font-medium"
                                              title={`Move row to Page ${pageIdx + 2}`}
                                            >
                                              ↓ P{pageIdx + 2}
                                            </button>
                                          )}
                                          {!isLocked && canAddRow && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteRow(rowId)}
                                              title="Delete Row"
                                              className="text-neutral-400 hover:text-red-600 transition-colors pt-0.5 ml-auto"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      </td>

                                      {/* Column 2: Suggestion of the Panel(s) */}
                                      <td className="w-[35%] p-2.5 sm:p-3 border-r border-black text-black align-top font-serif">
                                        <AutoResizeTextarea
                                          value={row.suggestion || ''}
                                          onChange={(e) =>
                                            handleCellChange(rowId, 'suggestion', e.target.value)
                                          }
                                          onBlur={() => handleCellBlur(rowId, 'suggestion')}
                                          placeholder="- Specific suggestion / recommendation..."
                                          disabled={!canEditSuggestion}
                                          data-testid={`panel-suggestion-input-${rowId}`}
                                        />
                                      </td>

                                      {/* Column 3: Action Taken & Fulfillment Verification */}
                                      <td className="w-[30%] p-2.5 sm:p-3 border-r border-black text-black align-top font-serif">
                                        <AutoResizeTextarea
                                          value={row.actionDone || ''}
                                          onChange={(e) =>
                                            handleCellChange(rowId, 'actionDone', e.target.value)
                                          }
                                          onBlur={() => handleCellBlur(rowId, 'actionDone')}
                                          placeholder="- Description of modifications made..."
                                          disabled={!canEditAction}
                                          data-testid={`panel-action-input-${rowId}`}
                                        />

                                        {/* Panel Fulfillment Verification Checkbox (print:hidden) */}
                                        <div className="mt-2 pt-1.5 border-t border-dashed border-neutral-300 flex items-center justify-between gap-1 text-xs font-sans no-print print:hidden">
                                          <label
                                            htmlFor={`verify-row-${rowId}`}
                                            className={cn(
                                              'inline-flex items-center gap-1.5 select-none text-[11px] font-medium transition-colors',
                                              canVerifyRow
                                                ? 'cursor-pointer'
                                                : 'cursor-default opacity-85',
                                              row.status === 'verified'
                                                ? 'text-emerald-700 font-semibold'
                                                : row.status === 'addressed'
                                                  ? 'text-amber-700 font-medium'
                                                  : 'text-neutral-600',
                                            )}
                                          >
                                            <input
                                              id={`verify-row-${rowId}`}
                                              type="checkbox"
                                              checked={row.status === 'verified'}
                                              disabled={!canVerifyRow}
                                              onChange={(e) =>
                                                handleToggleFulfillment(rowId, e.target.checked)
                                              }
                                              className="h-3.5 w-3.5 rounded border-neutral-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                            <span>
                                              {row.status === 'verified' ? (
                                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                                  Verified
                                                </span>
                                              ) : row.status === 'addressed' ? (
                                                <span>Addressed — Pending Verification</span>
                                              ) : (
                                                <span>Pending Student Action</span>
                                              )}
                                            </span>
                                          </label>
                                        </div>
                                      </td>

                                      {/* Column 4: Page Number/s */}
                                      <td className="w-[9%] p-2 sm:p-2.5 text-center text-black align-top font-serif">
                                        <input
                                          type="text"
                                          value={row.pageNumbers || ''}
                                          onChange={(e) =>
                                            handleCellChange(rowId, 'pageNumbers', e.target.value)
                                          }
                                          onBlur={() => handleCellBlur(rowId, 'pageNumbers')}
                                          placeholder="p. #"
                                          disabled={!canEditAction}
                                          className="w-full text-center bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none text-xs sm:text-sm text-black py-0.5 print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent"
                                          data-testid={`panel-pages-input-${rowId}`}
                                        />
                                        <div className="hidden print:block text-center text-[8.5pt] leading-tight text-black font-medium font-serif min-h-[1.2rem]">
                                          {row.pageNumbers || ''}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>

                          {/* Bottom Space Allocation Helper & Add Panelist Row Button (Matching Secretary Minutes Image 4) */}
                          <div className="flex items-center justify-between pt-1.5 no-print print:hidden font-serif">
                            <span className="text-[11px] text-neutral-500 italic no-print print:hidden">
                              Tables dynamically allocate space as you type.
                            </span>
                            {canAddRow && (
                              <button
                                type="button"
                                onClick={() => handleAddRowToPage(pageIdx)}
                                className="text-xs text-blue-700 hover:underline flex items-center gap-1 font-sans font-medium no-print print:hidden"
                                title="Add another panelist row to this table"
                                data-testid="adm-add-row-btn"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Panelist Row</span>
                                <span className="hidden">Add Row to ADM</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Last Page: Secretary Compliance Gate & Signatories Board */}
                      {isLastPage && (
                        <div className="mt-6 space-y-8 font-sans text-xs sm:text-sm text-black">
                          {/* Secretary Compliance Endorsement Verification Banner */}
                          <div className="rounded-lg border border-black bg-neutral-50 p-4 font-sans text-left space-y-2.5 no-print print:hidden">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-300 pb-2">
                              <div className="flex items-center gap-2">
                                <ShieldCheck
                                  className={`h-5 w-5 ${
                                    isSecretaryEndorsed ? 'text-emerald-700' : 'text-amber-600'
                                  }`}
                                />
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                                    Secretary Compliance Verification Gate
                                  </h4>
                                  <p className="text-[11px] text-neutral-700">
                                    Prerequisite compliance audit: The Committee Secretary must
                                    endorse all student revision fulfillments before committee
                                    digital signatures can unlock.
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant={isSecretaryEndorsed ? 'secondary' : 'outline'}
                                className={`text-[10px] uppercase font-semibold tracking-wider ${
                                  isSecretaryEndorsed
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-500/30'
                                    : 'bg-amber-100 text-amber-800 border-amber-500/30'
                                }`}
                              >
                                {isSecretaryEndorsed
                                  ? 'Endorsed & Unlocked'
                                  : 'Endorsement Pending'}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div>
                                <span className="text-neutral-700">Designated Secretary: </span>
                                <span className="font-bold text-black">
                                  {admSignatures.secretary?.signatoryName ||
                                    formatFullName(
                                      secretary?.user || secretary,
                                      'Committee Secretary',
                                    )}
                                </span>
                                {admSignatures.secretary?.endorsedAt && (
                                  <span className="text-neutral-600 text-[11px] ml-2">
                                    (Endorsed on{' '}
                                    {new Date(
                                      admSignatures.secretary.endorsedAt,
                                    ).toLocaleDateString()}
                                    )
                                  </span>
                                )}
                                {admSignatures.secretary?.notes && (
                                  <p className="text-[11px] italic text-neutral-700 mt-1">
                                    Remarks: &ldquo;{admSignatures.secretary.notes}&rdquo;
                                  </p>
                                )}
                              </div>

                              {canEndorse && !isSecretaryEndorsed && (
                                <Button
                                  size="sm"
                                  onClick={() => setIsEndorsementModalOpen(true)}
                                  className="gap-1.5 text-xs h-7 font-medium no-print print:hidden"
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
                            <p className="font-semibold text-xs sm:text-sm text-black text-left">
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
                                  regularPanelists[0]?.userId ||
                                    regularPanelists[0]?.user ||
                                    regularPanelists[0],
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
                                admSignatures.panelists?.[1]?.signatoryName ||
                                formatFullName(
                                  regularPanelists[1]?.userId ||
                                    regularPanelists[1]?.user ||
                                    regularPanelists[1],
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
                        className="gap-2 text-xs font-semibold shadow-xs text-primary border-primary/50 hover:bg-primary/10 bg-background/80 backdrop-blur-xs no-print print:hidden"
                        data-testid={`add-continuation-page-btn-${pageNumber}`}
                        title="Insert a continuation page before the final sign-off sheet"
                      >
                        <Plus className="h-4 w-4" /> Add Continuation Page (Insert before Final
                        Sheet)
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
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
                  Upload the official defense minutes PDF. The system will automatically parse
                  panelist recommendations and populate the Action Done Matrix rows.
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
                            Save this signature to my account settings for future one-click
                            endorsements
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
                      disabled={
                        isSubmittingSignature || (!signatureDataUrl && !user?.digitalSignature)
                      }
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
                        <h4
                          id="secretary-endorsement-modal-title"
                          className="text-base font-semibold"
                        >
                          Committee Secretary Endorsement
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Compliance Verification Gate
                        </p>
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
                    As the Committee Secretary, your endorsement certifies that the proponent team
                    has satisfactorily addressed all panel recommendations in accordance with the
                    defense proceedings. This will unlock digital signatures for the panel members
                    and adviser.
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
        </>
      )}
    </div>
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
            className="text-blue-700 underline print:text-black"
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
          <input
            type="text"
            value={revisionNo}
            onChange={(e) => onDocMetaChange?.('revisionNo', e.target.value)}
            className="print:hidden w-7 inline bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none text-[10px] sm:text-[11px] text-black p-0 text-center font-sans font-medium"
            title="Edit Revision No"
          />
        </span>
        <span className="inline-flex items-center gap-0.5">
          Issue No. : <span className="hidden print:inline font-medium">{issueNo}</span>
          <input
            type="text"
            value={issueNo}
            onChange={(e) => onDocMetaChange?.('issueNo', e.target.value)}
            className="print:hidden w-7 inline bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none text-[10px] sm:text-[11px] text-black p-0 text-center font-sans font-medium"
            title="Edit Issue No"
          />
        </span>
        <span className="inline-flex items-center gap-0.5">
          Issue Date: <span className="hidden print:inline font-medium">{issueDate}</span>
          <input
            type="text"
            value={issueDate}
            onChange={(e) => onDocMetaChange?.('issueDate', e.target.value)}
            className="print:hidden w-24 inline bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none text-[10px] sm:text-[11px] text-black p-0 text-center font-sans font-medium"
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
    <div className="flex flex-col items-center justify-end space-y-1 min-h-[110px] font-serif">
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
          <Badge
            variant="secondary"
            className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-500/30 gap-1"
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
            Verified
          </Badge>
        ) : isLockedBySecretary ? (
          <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" /> Awaiting Secretary Endorsement
          </span>
        ) : !canSign ? (
          <span className="text-[10px] text-neutral-500 italic flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> Pending Signature
          </span>
        ) : null}
      </div>
    </div>
  );
}
