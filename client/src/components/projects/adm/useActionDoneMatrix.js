import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { projectService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { ROLES, PANEL_ROLES } from '@cms/shared';
import { getSocket, connectSocket } from '@/services/socket';
import { toast } from 'sonner';

/**
 * Format populated user full name
 */
export function formatFullName(userObj, fallback = 'Pending Appointment') {
  if (!userObj) return fallback;
  const raw = userObj.userId || userObj.user || userObj;
  if (typeof raw === 'string') return raw.trim() || fallback;
  const parts = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : raw.name || fallback;
}

/**
 * Consolidates Action Done Matrix rows so each panel member appears in exactly 1 row per milestone.
 * Merges multiple remarks into multi-line/bulleted suggestions and actions.
 * Guarantees screen-to-print WYSIWYG parity ("what we see here is what we get and what we print").
 */
export function consolidateADMRowsByPanel(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

  const map = new Map();
  const order = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rawName = (row.panelName || '').trim();
    const milestone = row.milestone || 'CAPSTONE_1';
    const key = `${milestone}:::${rawName.toLowerCase()}`;

    if (!rawName || !map.has(key)) {
      const consolidated = {
        ...row,
        _id: row._id || row.id || `adm-row-${i}`,
        panelName: rawName || 'Panel Member',
        suggestion: (row.suggestion || '').trim(),
        actionDone: (row.actionDone || '').trim(),
        pageNumbers: (row.pageNumbers || '').trim(),
        mergedIds: row._id || row.id ? [row._id || row.id] : [],
      };
      if (rawName) map.set(key, consolidated);
      order.push(consolidated);
    } else {
      const existing = map.get(key);
      if (row._id || row.id) {
        existing.mergedIds = existing.mergedIds || [];
        if (!existing.mergedIds.includes(row._id || row.id)) {
          existing.mergedIds.push(row._id || row.id);
        }
      }

      // Merge suggestions: format clean bullets
      const incomingSug = (row.suggestion || '').trim();
      if (incomingSug) {
        if (!existing.suggestion) {
          existing.suggestion = incomingSug;
        } else if (!existing.suggestion.includes(incomingSug)) {
          const formattedIncoming =
            incomingSug.startsWith('-') || incomingSug.startsWith('•')
              ? incomingSug
              : `- ${incomingSug}`;
          const currentHasBullet =
            existing.suggestion.includes('-') || existing.suggestion.includes('•');
          const prefix = currentHasBullet ? existing.suggestion : `- ${existing.suggestion}`;
          existing.suggestion = `${prefix}\n\n${formattedIncoming}`;
        }
      }

      // Merge actionDone: format clean bullets
      const incomingAct = (row.actionDone || '').trim();
      if (incomingAct) {
        if (!existing.actionDone) {
          existing.actionDone = incomingAct;
        } else if (!existing.actionDone.includes(incomingAct)) {
          const formattedIncoming =
            incomingAct.startsWith('-') || incomingAct.startsWith('•')
              ? incomingAct
              : `- ${incomingAct}`;
          const currentHasBullet =
            existing.actionDone.includes('-') || existing.actionDone.includes('•');
          const prefix = currentHasBullet ? existing.actionDone : `- ${existing.actionDone}`;
          existing.actionDone = `${prefix}\n\n${formattedIncoming}`;
        }
      }

      // Merge page numbers
      const incomingPages = (row.pageNumbers || '').trim();
      if (incomingPages && !existing.pageNumbers?.includes(incomingPages)) {
        existing.pageNumbers = existing.pageNumbers
          ? `${existing.pageNumbers}, ${incomingPages}`
          : incomingPages;
      }

      // Merge status
      if (row.status !== 'verified' && existing.status === 'verified') {
        existing.status = row.status;
      }
      if (row.isLocked) {
        existing.isLocked = true;
      }
    }
  }

  return order;
}

/**
 * Line capacities for Action Done Matrix document sheets (A4 dimensions at 8.5pt font):
 * - Page 1 (Opening Sheet with title, header, note, review type bar): ~22 lines of row content max.
 * - Continuation Sheet (Pages 2..N-1 with header, continuation title, review bar): ~30 lines max.
 * - Final Sign-off Sheet (with Signatories Board): ~10 lines max if sharing with rows, otherwise dedicated.
 */
export const ADM_PAGE_CAPACITIES = {
  PAGE_1_MAX_LINES: 22,
  CONTINUATION_MAX_LINES: 30,
  FINAL_PAGE_MAX_LINES: 10,
};

/**
 * Estimates vertical weight (in line units) of an Action Done Matrix row based on text content and column widths.
 * Divisors calibrated for 8.5pt serif font in standard A4 printable margins:
 * - Col 2 (Suggestions, 35% width): ~38 chars per line
 * - Col 3 (Action Taken, 30% width): ~32 chars per line
 * - Col 1 (Panel Name, 26% width): ~24 chars per line
 */
export function estimateADMRowWeight(row) {
  if (!row) return 2.5;
  const sug = (row.suggestion || '').trim();
  const act = (row.actionDone || '').trim();
  const pan = (row.panelName || '').trim();

  // Column 2: Suggestion column is 35% of page width (~38 chars per line in 8.5pt font)
  const sugLines = sug
    ? sug
        .split('\n')
        .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.trim().length / 38)), 0)
    : 1;

  // Column 3: Action Taken column is 30% of page width (~32 chars per line in 8.5pt font)
  const actLines = act
    ? act
        .split('\n')
        .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.trim().length / 32)), 0)
    : 1;

  // Column 1: Panel name column (~24 chars per line)
  const panLines = pan ? Math.max(1, Math.ceil(pan.trim().length / 24)) : 1;

  // Each table row adds vertical padding and border overhead (~1.5 lines)
  return Math.max(sugLines, actLines, panLines) + 1.5;
}

/**
 * Splits a multi-bullet suggestion or actionDone text into individual recommendation items/paragraphs.
 */
export function extractSuggestionItems(text) {
  if (!text) return [];
  const rawParts = String(text).split(/\n\s*\n+/);
  const items = [];
  rawParts.forEach((part) => {
    const trimmed = part.trim();
    if (trimmed) items.push(trimmed);
  });
  return items;
}

/**
 * Splits an ADM row into [head, tail] when its vertical weight exceeds maxLines.
 * Head fits within maxLines and tail contains the remaining bullet recommendations under `${panelName} (Continued)`.
 * If the row already fits or cannot be split by bullets, returns [row].
 */
export function splitADMRowIfOversized(row, maxLines) {
  if (!row) return [];
  const weight = estimateADMRowWeight(row);
  if (weight <= maxLines) {
    return [row];
  }

  const items = extractSuggestionItems(row.suggestion);
  if (items.length <= 1) {
    return [row];
  }

  const actionItems = extractSuggestionItems(row.actionDone);
  const hasMatchedActions = actionItems.length === items.length;

  const headItems = [];
  const headActions = [];
  let headWeight = 1.5;

  let splitIdx = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemLines = Math.max(1, Math.ceil(item.length / 38)) + 1;
    if (headItems.length > 0 && headWeight + itemLines > maxLines) {
      break;
    }
    headItems.push(item);
    if (hasMatchedActions) headActions.push(actionItems[i]);
    headWeight += itemLines;
    splitIdx = i + 1;
  }

  if (splitIdx === 0 || splitIdx >= items.length) {
    return [row];
  }

  const tailItems = items.slice(splitIdx);
  const tailActions = hasMatchedActions ? actionItems.slice(splitIdx) : [];
  const basePanelName = (row.panelName || '').replace(/\s*\(Continued\)/gi, '').trim();

  const headRow = {
    ...row,
    _id: row._id || row.id,
    panelName: row.panelName,
    suggestion: headItems.join('\n\n'),
    actionDone: headActions.length > 0 ? headActions.join('\n\n') : row.actionDone,
    isContinuation: Boolean(row.isContinuation),
    parentRowId: row.parentRowId || row._id || row.id,
    _splitHead: true,
    _splitIdx: splitIdx,
  };

  const contSuffix = (row._id || row.id || '').includes('__cont')
    ? `_${splitIdx}`
    : `__cont_${splitIdx}`;
  const tailRow = {
    ...row,
    _id: `${row._id || row.id}${contSuffix}`,
    panelName: `${basePanelName} (Continued)`,
    suggestion: tailItems.join('\n\n'),
    actionDone: tailActions.length > 0 ? tailActions.join('\n\n') : '',
    isContinuation: true,
    parentRowId: row.parentRowId || row._id || row.id,
    _splitTail: true,
    _splitIdx: splitIdx,
  };

  return [headRow, tailRow];
}

/**
 * Automatically allocates Action Done Matrix rows across authentic BukSU A4 document sheets:
 * - Dynamically computes row heights to prevent physical page overflows and crude print breaks.
 * - Automatically splits multi-bullet monolithic rows across continuation sheets to prevent text leaking or footer cutting.
 * - Guarantees that Page 1 never exceeds vertical capacity.
 * - Automatically moves overflowing rows to Continuation Sheets (with full BukSU headers).
 * - Leaves the Final Sign-off Sheet uncrowded so the Signatories Board is never sliced.
 */
export function autoAllocateADMSheets(displayedRows) {
  if (!Array.isArray(displayedRows) || displayedRows.length === 0) {
    return {
      pages: [[], []],
      pageMap: {},
      totalPages: 2,
    };
  }

  const pages = [];
  const pageMap = {};

  let currentSheet = [];
  let currentSheetLines = 0;
  let maxLines = ADM_PAGE_CAPACITIES.PAGE_1_MAX_LINES;

  const queue = [...displayedRows];

  while (queue.length > 0) {
    const row = queue.shift();
    const weight = estimateADMRowWeight(row);
    const remainingLines = maxLines - currentSheetLines;

    // Can this row fit on the current sheet?
    if (currentSheet.length === 0 || currentSheetLines + weight <= maxLines) {
      // If currentSheet is empty and row is heavier than maxLines, split it
      if (weight > maxLines) {
        const chunks = splitADMRowIfOversized(row, maxLines);
        if (chunks.length > 1) {
          const firstChunk = chunks[0];
          currentSheet.push(firstChunk);
          currentSheetLines += estimateADMRowWeight(firstChunk);
          const rowId = firstChunk._id || firstChunk.id;
          if (rowId) pageMap[rowId] = pages.length;

          // Put tail back at front of queue
          queue.unshift(...chunks.slice(1));

          // Close sheet
          pages.push(currentSheet);
          currentSheet = [];
          currentSheetLines = 0;
          maxLines = ADM_PAGE_CAPACITIES.CONTINUATION_MAX_LINES;
          continue;
        }
      }

      currentSheet.push(row);
      currentSheetLines += weight;
      const rowId = row._id || row.id;
      if (rowId) {
        pageMap[rowId] = pages.length;
      }
    } else {
      // Doesn't fit in remaining lines.
      // If there is significant remaining space (>= 8 lines), split the row
      if (remainingLines >= 8) {
        const chunks = splitADMRowIfOversized(row, remainingLines);
        if (chunks.length > 1) {
          const firstChunk = chunks[0];
          currentSheet.push(firstChunk);
          currentSheetLines += estimateADMRowWeight(firstChunk);
          const rowId = firstChunk._id || firstChunk.id;
          if (rowId) pageMap[rowId] = pages.length;

          queue.unshift(...chunks.slice(1));

          pages.push(currentSheet);
          currentSheet = [];
          currentSheetLines = 0;
          maxLines = ADM_PAGE_CAPACITIES.CONTINUATION_MAX_LINES;
          continue;
        }
      }

      // Close current sheet and start a new continuation sheet
      pages.push(currentSheet);
      currentSheet = [];
      currentSheetLines = 0;
      maxLines = ADM_PAGE_CAPACITIES.CONTINUATION_MAX_LINES;
      queue.unshift(row);
    }
  }

  if (currentSheet.length > 0) {
    pages.push(currentSheet);
  }

  const lastPageIdx = pages.length - 1;
  const lastPage = pages[lastPageIdx];
  const lastPageWeight = lastPage.reduce((acc, r) => acc + estimateADMRowWeight(r), 0);

  if (pages.length === 1 || lastPageWeight > ADM_PAGE_CAPACITIES.FINAL_PAGE_MAX_LINES) {
    pages.push([]);
  }

  // Ensure minimum 2 pages
  while (pages.length < 2) {
    pages.push([]);
  }

  return {
    pages,
    pageMap,
    totalPages: pages.length,
  };
}

/**
 * useActionDoneMatrix custom hook
 * Encapsulates rows, milestones, filter state, document meta, committee resolution,
 * and autosave logic for ActionDoneMatrixTab.
 */
export function useActionDoneMatrix({
  project,
  user: userProp,
  isFaculty: isFacultyProp = false,
  isStudent: isStudentProp = false,
  isSecretary: isSecretaryProp = false,
  initialMilestone,
  onRefresh,
} = {}) {
  const storeUser = useAuthStore((s) => s?.user);
  const user = userProp || storeUser;
  const isFaculty = isFacultyProp || user?.role === ROLES?.FACULTY;
  const isStudent = isStudentProp || user?.role === ROLES?.STUDENT;

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
  const [signaturesState, setSignaturesState] = useState(project?.admSignatures || {});
  const [milestoneSignatures, setMilestoneSignatures] = useState(
    project?.admSignaturesByMilestone || {},
  );
  const [admStatus, setAdmStatus] = useState(project?.admStatus || 'draft');

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
    const filtered =
      selectedMilestone === 'ALL'
        ? rows
        : rows.filter((r) => (r.milestone || defaultMilestone) === selectedMilestone);
    return consolidateADMRowsByPanel(filtered);
  }, [rows, selectedMilestone, defaultMilestone]);

  // Automatically determine minimal required pages and content-aware page distribution
  const autoAllocationResult = useMemo(() => autoAllocateADMSheets(displayedRows), [displayedRows]);

  const autoPageCount = autoAllocationResult.totalPages;

  const [manualPageCount, setManualPageCount] = useState(null);
  const totalPages = Math.max(2, manualPageCount !== null ? manualPageCount : autoPageCount);

  // Group displayed rows by their designated document sheet
  const rowsByPage = useMemo(() => {
    const hasManualMapping = Object.keys(rowPageMap).length > 0 || manualPageCount !== null;
    if (!hasManualMapping && autoAllocationResult.pages.length === totalPages) {
      return autoAllocationResult.pages;
    }

    const pages = Array.from({ length: totalPages }, () => []);

    const allAllocatedRows = autoAllocationResult.pages.flat();
    allAllocatedRows.forEach((row, idx) => {
      const rowId = row._id || row.id || idx;
      const parentId = row.parentRowId || rowId;
      const assigned = rowPageMap[rowId] ?? rowPageMap[parentId];
      const autoAssigned =
        autoAllocationResult.pageMap[rowId] ?? autoAllocationResult.pageMap[parentId];

      const targetPage =
        typeof assigned === 'number' && assigned >= 0 && assigned < totalPages
          ? assigned
          : typeof autoAssigned === 'number' && autoAssigned >= 0 && autoAssigned < totalPages
            ? autoAssigned
            : 0;

      pages[targetPage].push(row);
    });
    return pages;
  }, [totalPages, rowPageMap, manualPageCount, autoAllocationResult]);

  // Balance Pages: reset manual mappings and re-run content-aware auto-allocation
  const handleBalancePages = () => {
    setRowPageMap({});
    setManualPageCount(null);
    toast.success('Automatically balanced Action Done Matrix across authentic A4 sheets.');
  };

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

  // Debounce timers & pending values map
  const debounceTimers = useRef({});
  const pendingValues = useRef({});

  // Target milestone computation
  const targetMilestone = selectedMilestone === 'ALL' ? defaultMilestone : selectedMilestone;

  // Sync project props and milestone-isolated review type to local state
  useEffect(() => {
    if (project) {
      setRows(consolidateADMRowsByPanel(project.actionDoneMatrix || []));
      const milestoneReviewType =
        project.admReviewTypeByMilestone?.[targetMilestone] || project.admReviewType || 'internal';
      setReviewType(milestoneReviewType);
      setProjectTitle(project.title || '');
      if (project.admSignatures) {
        setSignaturesState(project.admSignatures);
      }
      if (project.admSignaturesByMilestone) {
        setMilestoneSignatures(project.admSignaturesByMilestone);
      }
      if (project.admStatus) {
        setAdmStatus(project.admStatus);
      }
    }
  }, [project, targetMilestone]);

  // Real-time synchronization of ADM rows, signatures, and endorsements
  useEffect(() => {
    let s;
    try {
      s = getSocket() || connectSocket();
    } catch {
      return;
    }
    const projId = project?._id;
    if (!s || !projId || typeof s.on !== 'function') return;

    try {
      s.emit('join:project', projId);
    } catch {
      // Non-blocking
    }

    const handleRowUpdated = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        const row = data.row || data.item;
        if (row) {
          setRows((prev) =>
            prev.map((r) => ((r._id || r.id) === (row._id || row.id) ? { ...r, ...row } : r)),
          );
        } else if (Array.isArray(data.actionDoneMatrix)) {
          setRows(data.actionDoneMatrix);
        }
        if (data.admStatus) {
          setAdmStatus(data.admStatus);
        }
      }
    };

    const handleRowCreated = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        const row = data.row || data.item;
        if (row) {
          setRows((prev) => {
            const exists = prev.some((r) => (r._id || r.id) === (row._id || row.id));
            return exists
              ? prev.map((r) => ((r._id || r.id) === (row._id || row.id) ? { ...r, ...row } : r))
              : [...prev, row];
          });
        } else if (Array.isArray(data.actionDoneMatrix)) {
          setRows(data.actionDoneMatrix);
        }
        if (data.admStatus) {
          setAdmStatus(data.admStatus);
        }
      }
    };

    const handleRowDeleted = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        const targetId = data.rowId || data.itemId;
        if (targetId) {
          setRows((prev) => prev.filter((r) => (r._id || r.id) !== targetId));
        } else if (Array.isArray(data.actionDoneMatrix)) {
          setRows(data.actionDoneMatrix);
        }
      }
    };

    const handleSigned = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        if (data.admSignatures) setSignaturesState(data.admSignatures);
        if (data.admSignaturesByMilestone) setMilestoneSignatures(data.admSignaturesByMilestone);
        if (data.milestone && data.admSignatures) {
          setMilestoneSignatures((prev) => ({
            ...prev,
            [data.milestone]: data.admSignatures,
          }));
        }
        if (Array.isArray(data.actionDoneMatrix)) setRows(data.actionDoneMatrix);
        if (data.admStatus) setAdmStatus(data.admStatus);
        if (onRefresh) onRefresh();
      }
    };

    const handleEndorsed = (data) => {
      if (!data?.projectId || String(data.projectId) === String(projId)) {
        if (data.admSignatures) setSignaturesState(data.admSignatures);
        if (data.admSignaturesByMilestone) setMilestoneSignatures(data.admSignaturesByMilestone);
        if (data.milestone && data.admSignatures) {
          setMilestoneSignatures((prev) => ({
            ...prev,
            [data.milestone]: data.admSignatures,
          }));
        }
        if (Array.isArray(data.actionDoneMatrix)) setRows(data.actionDoneMatrix);
        if (data.admStatus) setAdmStatus(data.admStatus);
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
      rawPanelists.find((p) => p.role === PANEL_ROLES?.CHAIR || p.role === 'chair') ||
      rawPanelists[0],
    [rawPanelists],
  );

  const regularPanelists = useMemo(() => {
    const nonChairs = rawPanelists.filter(
      (p) =>
        p.role !== PANEL_ROLES?.CHAIR &&
        p.role !== 'chair' &&
        p.role !== PANEL_ROLES?.SECRETARY &&
        p.role !== 'secretary',
    );
    if (nonChairs.length > 0) return nonChairs;
    return rawPanelists.slice(1);
  }, [rawPanelists]);

  const adviser = project?.adviserId || project?.teamId?.adviserId;
  const secretary =
    project?.secretaryId ||
    project?.teamId?.secretaryId ||
    rawPanelists.find((p) => p.role === 'secretary' || p.role === PANEL_ROLES?.SECRETARY)?.userId;
  const instructor =
    project?.sectionId?.instructorId ||
    project?.sectionId?.createdBy ||
    project?.teamId?.sectionId?.instructorId ||
    project?.teamId?.sectionId?.createdBy ||
    project?.teamId?.leaderId?.instructorId ||
    project?.leaderId?.instructorId ||
    project?.instructorId ||
    (user?.role === ROLES?.INSTRUCTOR ? user : null);

  // Milestone-isolated signatures
  const admSignatures = useMemo(() => {
    if (milestoneSignatures?.[targetMilestone]) {
      return milestoneSignatures[targetMilestone];
    }
    if (project?.admSignaturesByMilestone?.[targetMilestone]) {
      return project.admSignaturesByMilestone[targetMilestone];
    }
    const currentMilestoneKey =
      Number(project?.capstonePhase ?? project?.phase ?? 1) >= 3
        ? 'CAPSTONE_3'
        : Number(project?.capstonePhase ?? project?.phase ?? 1) === 2
          ? 'CAPSTONE_2'
          : 'CAPSTONE_1';
    if (
      targetMilestone === currentMilestoneKey &&
      (signaturesState?.secretary || signaturesState?.adviser)
    ) {
      return signaturesState;
    }
    if (targetMilestone === currentMilestoneKey && project?.admSignatures) {
      return project.admSignatures;
    }
    const unisonKey =
      targetMilestone === 'CAPSTONE_3' ? 'v3' : targetMilestone === 'CAPSTONE_2' ? 'v2' : 'v1';
    if (project?.unisonADM?.[unisonKey]?.signatures) {
      return project.unisonADM[unisonKey].signatures;
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
    milestoneSignatures,
    project?.admSignaturesByMilestone,
    project?.admSignatures,
    project?.capstonePhase,
    project?.phase,
    project?.unisonADM,
    signaturesState,
    targetMilestone,
  ]);

  // Match Panelist 1 and 2 signatures by user ID or signatory name (preventing index collision)
  const panelist1Signature = useMemo(() => {
    const p = regularPanelists[0];
    if (!p) return null;
    const pUserId = String(p.userId?._id || p.userId || p._id || p.id || p);
    const pName = formatFullName(p);
    const list = Array.isArray(admSignatures?.panelists) ? admSignatures.panelists : [];
    return (
      list.find((entry) => {
        const entryId = String(entry.userId?._id || entry.userId || '');
        return (
          (entryId && entryId === pUserId) || (entry.signatoryName && entry.signatoryName === pName)
        );
      }) ||
      list[0] ||
      null
    );
  }, [regularPanelists, admSignatures]);

  const panelist2Signature = useMemo(() => {
    const p = regularPanelists[1];
    if (!p) return null;
    const pUserId = String(p.userId?._id || p.userId || p._id || p.id || p);
    const pName = formatFullName(p);
    const list = Array.isArray(admSignatures?.panelists) ? admSignatures.panelists : [];
    return (
      list.find((entry) => {
        const entryId = String(entry.userId?._id || entry.userId || '');
        return (
          (entryId && entryId === pUserId) || (entry.signatoryName && entry.signatoryName === pName)
        );
      }) || (list.length > 1 ? list[1] : null)
    );
  }, [regularPanelists, admSignatures]);

  // Permissions
  const isUserChair =
    user &&
    (chair?.userId === user._id ||
      chair?.userId?._id === user._id ||
      (user.role === ROLES?.FACULTY && user.facultyRole === 'chair'));
  const isUserPanelist =
    user &&
    (isUserChair ||
      rawPanelists.some(
        (p) => p.userId === user._id || p.userId?._id === user._id || p._id === user._id,
      ));

  const panelist1User =
    regularPanelists[0]?.userId || regularPanelists[0]?.user || regularPanelists[0];
  const panelist1Id = panelist1User?._id || panelist1User;
  const isUserPanelist1 = Boolean(user && panelist1Id && String(panelist1Id) === String(user._id));

  const panelist2User =
    regularPanelists[1]?.userId || regularPanelists[1]?.user || regularPanelists[1];
  const panelist2Id = panelist2User?._id || panelist2User;
  const isUserPanelist2 = Boolean(user && panelist2Id && String(panelist2Id) === String(user._id));

  const secretaryIdStr = (secretary?._id || secretary)?.toString();
  const userIdStr = user?._id?.toString();
  const isUserSecretary = Boolean(
    isSecretaryProp ||
    (userIdStr &&
      (secretaryIdStr === userIdStr ||
        rawPanelists.some((p) => {
          const pid = (p.userId?._id || p.userId || p._id)?.toString();
          return pid === userIdStr && (p.role === PANEL_ROLES?.SECRETARY || p.role === 'secretary');
        }))),
  );
  const adviserIdStr = (adviser?._id || adviser)?.toString();
  const isUserAdviser = Boolean(userIdStr && adviserIdStr === userIdStr);
  const isUserInstructor = user && user.role === ROLES?.INSTRUCTOR;
  const isCurrentUserStudent = Boolean(isStudent || user?.role === ROLES?.STUDENT);

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
    user.role === ROLES?.INSTRUCTOR &&
    (!designatedInstructorId || String(designatedInstructorId) === String(user._id)),
  );

  const canUploadMinutes = Boolean(isUserSecretary);
  const isSecretaryEndorsed = Boolean(admSignatures?.secretary?.endorsed);
  const canEndorse = Boolean(isUserSecretary);
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
    const isCont = String(rowId).includes('__cont_');
    const actualRowId = isCont ? rowId.split('__cont_')[0] : rowId;

    setRows((prev) =>
      prev.map((r) => {
        const rId = r._id || r.id;
        if (rId === rowId) {
          return { ...r, [field]: value };
        }
        if (isCont && rId === actualRowId) {
          if (field === 'pageNumbers' || field === 'status') {
            return { ...r, [field]: value };
          }
          const parentVal = r[field] || '';
          const items = extractSuggestionItems(parentVal);
          const contParts = String(rowId).split('__cont_');
          const splitIdx = parseInt(contParts[1], 10);
          if (!isNaN(splitIdx) && splitIdx < items.length) {
            const headPart = items.slice(0, splitIdx).join('\n\n');
            const newCombined = headPart ? `${headPart}\n\n${value}` : value;
            return { ...r, [field]: newCombined };
          }
          return { ...r, [field]: `${parentVal}\n\n${value}` };
        }
        return r;
      }),
    );

    const timerKey = `${actualRowId}_${field}`;
    pendingValues.current[timerKey] = value;

    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }

    debounceTimers.current[timerKey] = setTimeout(() => {
      delete debounceTimers.current[timerKey];
      delete pendingValues.current[timerKey];
      saveCell(actualRowId, field, value);
    }, 750);
  };

  const handleCellBlur = (rowId, field) => {
    const actualRowId = String(rowId).includes('__cont_') ? rowId.split('__cont_')[0] : rowId;
    const timerKey = `${actualRowId}_${field}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
      delete debounceTimers.current[timerKey];
      const val = pendingValues.current[timerKey];
      delete pendingValues.current[timerKey];
      if (val !== undefined) {
        saveCell(actualRowId, field, val);
      }
    }
  };

  const handleToggleReviewType = async (type) => {
    if (!isFaculty && !isStudent) return;
    setReviewType(type);
    try {
      await projectService.updateADMMetadata(project?._id, {
        admReviewType: type,
        milestone: targetMilestone,
      });
      toast.success(`Review type set to ${type === 'internal' ? 'Internal' : 'External'} Review`);
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Failed to update review classification.');
    }
  };

  const handleTitleBlur = async () => {
    if (!projectTitle.trim() || projectTitle === project?.title) return;
    try {
      await projectService.updateADMMetadata(project?._id, { title: projectTitle.trim() });
      toast.success('Project title updated.');
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Failed to update project title.');
    }
  };

  const getNextAvailablePanelistName = useCallback(() => {
    const candidateNames = [];
    if (regularPanelists?.length > 0) {
      regularPanelists.forEach((p) => {
        const name = formatFullName(p?.userId || p?.user || p);
        if (name && !name.includes('Pending Appointment')) candidateNames.push(name);
      });
    }
    if (chair) {
      const chairName = formatFullName(chair?.userId || chair?.user || chair);
      if (chairName && !chairName.includes('Pending Appointment')) candidateNames.push(chairName);
    }

    const existingNames = new Set(rows.map((r) => (r.panelName || '').trim().toLowerCase()));
    const available = candidateNames.find((name) => !existingNames.has(name.toLowerCase()));

    if (available) return available;
    if (isUserChair) return formatFullName(user);
    if (regularPanelists.length > 0) {
      const first = formatFullName(regularPanelists[0].user || regularPanelists[0]);
      if (first && !first.includes('Pending Appointment')) return first;
    }
    return 'Panel Member';
  }, [regularPanelists, chair, rows, isUserChair, user]);

  const handleAddRow = async () => {
    const defaultPanelName = getNextAvailablePanelistName();

    try {
      const res = await projectService.createActionDoneMatrixItem(project?._id, {
        panelName: defaultPanelName,
        suggestion: 'New recommendation',
        actionDone: '',
        pageNumbers: '',
        milestone: targetMilestone,
      });
      toast.success(`Added new evaluation row for ${targetMilestone.replace('_', ' ')}.`);
      if (res?.data?.data?.actionDoneMatrix) {
        setRows(consolidateADMRowsByPanel(res.data.data.actionDoneMatrix));
      }
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Failed to add ADM row.');
    }
  };

  const handleToggleFulfillment = async (rowId, isVerified) => {
    if (!projectId) return;
    const actualRowId = String(rowId).includes('__cont_') ? rowId.split('__cont_')[0] : rowId;
    const newStatus = isVerified ? 'verified' : 'addressed';

    setRows((prev) =>
      prev.map((r) =>
        (r._id || r.id) === actualRowId || (r._id || r.id) === rowId
          ? { ...r, status: newStatus }
          : r,
      ),
    );

    try {
      await projectService.patchADMRow(projectId, actualRowId, { status: newStatus });
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

  const handleDeleteRow = async (rowId) => {
    const actualRowId = String(rowId).includes('__cont_') ? rowId.split('__cont_')[0] : rowId;
    try {
      const targetRow = rows.find((r) => (r._id || r.id) === actualRowId);
      const idsToDelete = targetRow?.mergedIds?.length ? targetRow.mergedIds : [actualRowId];
      await Promise.all(
        idsToDelete.map((id) =>
          projectService.deleteActionDoneMatrixItem(project?._id, id).catch(() => {}),
        ),
      );
      setRows((prev) => prev.filter((r) => (r._id || r.id) !== rowId));
      toast.success('Evaluation row removed.');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove row.');
    }
  };

  const handleAddRowToPage = async (pageIdx = 0) => {
    const defaultPanelName = getNextAvailablePanelistName();

    try {
      const res = await projectService.createActionDoneMatrixItem(project?._id, {
        panelName: defaultPanelName,
        suggestion: 'New recommendation',
        actionDone: '',
        pageNumbers: '',
        milestone: targetMilestone,
      });
      toast.success(`Added new evaluation row for ${targetMilestone.replace('_', ' ')}.`);
      if (res?.data?.data?.actionDoneMatrix) {
        const consolidated = consolidateADMRowsByPanel(res.data.data.actionDoneMatrix);
        setRows(consolidated);
        const addedItem = consolidated[consolidated.length - 1];
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

  return {
    activeViewTab,
    setActiveViewTab,
    selectedMilestone,
    setSelectedMilestone,
    defaultMilestone,
    targetMilestone,
    rows,
    setRows,
    displayedRows,
    docMeta,
    setDocMeta,
    handleDocMetaChange,
    reviewType,
    setReviewType,
    projectTitle,
    setProjectTitle,
    signaturesState,
    setSignaturesState,
    milestoneSignatures,
    setMilestoneSignatures,
    admStatus,
    setAdmStatus,
    savingCells,
    setSavingCells,
    rowPageMap,
    setRowPageMap,
    manualPageCount,
    setManualPageCount,
    totalPages,
    rowsByPage,
    autoAllocationResult,
    autoPageCount,
    handleBalancePages,
    handleAddContinuationPage,
    handleRemovePage,
    handleMoveRowUp,
    handleMoveRowDown,
    saveCell,
    handleCellChange,
    handleCellBlur,
    handleToggleReviewType,
    handleTitleBlur,
    getNextAvailablePanelistName,
    handleAddRow,
    handleAddRowToPage,
    handleToggleFulfillment,
    handleDeleteRow,
    // Committee & Signatures
    rawPanelists,
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
  };
}

export default useActionDoneMatrix;
