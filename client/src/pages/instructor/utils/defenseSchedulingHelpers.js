import {
  CAPSTONE_PHASES,
  DELIVERABLE_CATEGORY_MAP,
  resolveWorkflowPhase,
} from '@cms/shared';

export const TIMELINE_START_HOUR = 8; // 08:00 AM
export const TIMELINE_END_HOUR = 17; // 05:00 PM
export const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 9 hours
export const PIXELS_PER_HOUR = 72; // Exact 72px per hour (6px per 5-minute quantum)
export const TOTAL_TIMELINE_HEIGHT = TOTAL_HOURS * PIXELS_PER_HOUR; // 648px
export const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60; // 1.2px per minute
export const HOURS_ARRAY = [8, 9, 10, 11, 12, 13, 14, 15, 16];

export const DEFENSE_TIME_SLOTS = [
  '08:00 AM - 09:00 AM',
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
];

/**
 * Resolves the team leader's full name from project metadata
 */
export function getTeamLeaderName(project) {
  const leader = project?.teamId?.leaderId;
  if (leader && (leader.firstName || leader.lastName)) {
    return `${leader.firstName || ''} ${leader.lastName || ''}`.trim();
  }
  const leadRole = project?.teamId?.memberRoles?.find(
    (mr) => mr.role?.toLowerCase().includes('lead') || mr.role?.toLowerCase().includes('analyst'),
  );
  if (leadRole?.userId && (leadRole.userId.firstName || leadRole.userId.lastName)) {
    return `${leadRole.userId.firstName || ''} ${leadRole.userId.lastName || ''}`.trim();
  }
  const firstMember = project?.teamId?.members?.[0];
  if (firstMember && (firstMember.firstName || firstMember.lastName)) {
    return `${firstMember.firstName || ''} ${firstMember.lastName || ''}`.trim();
  }
  return null;
}

/**
 * Parses a time string like "09:15 AM - 10:30 AM" into minutes from 8:00 AM and duration
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return { startMinutes: 60, duration: 30 }; // default 9:00 AM (60 min from 8am), 30 min duration
  const parts = timeStr.split(' - ');
  const startPart = parts[0]?.trim() || '';
  const endPart = parts[1]?.trim() || '';

  const parseSingle = (s) => {
    const match = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 540; // 9:00 AM in minutes from midnight
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const isPM = match[3].toUpperCase() === 'PM';
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  };

  const startM = parseSingle(startPart);
  const endM = endPart ? parseSingle(endPart) : startM + 30;
  const duration = Math.max(15, endM - startM);
  // minutes relative to 8:00 AM (480 minutes from midnight)
  const startFrom8AM = Math.max(0, Math.min(TOTAL_HOURS * 60, startM - 480));
  return { startMinutes: startFrom8AM, duration };
}

/**
 * Converts minutes from 8:00 AM and duration into a standard 12-hour formatted time string
 */
export function formatMinutesToTime(minutesFrom8AM, durationMinutes = 30) {
  const startM = 480 + minutesFrom8AM;
  const endM = startM + durationMinutes;

  const to12h = (totalM) => {
    const h24 = Math.floor(totalM / 60);
    const m = totalM % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return `${to12h(startM)} - ${to12h(endM)}`;
}

/**
 * Formats a duration in minutes into a human-readable badge label (e.g. "1h 15m")
 */
export function formatDurationLabel(minutes) {
  const mNum = Number(minutes) >= 5 ? Number(minutes) : 30;
  const h = Math.floor(mNum / 60);
  const m = mNum % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${m} min`;
}

/**
 * Normalizes any Date or ISO string into a local YYYY-MM-DD key without UTC shifting
 */
export function toLocalDateKey(d) {
  if (!d) return '';
  if (typeof d === 'string') {
    if (d.includes('T')) return d.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
  }
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Evaluates defense readiness including committee composition requirements.
 * A team is ready for defense scheduling if:
 * 1. Adviser has endorsed (defenseSchedule.status === 'pending_scheduling')
 * 2. An Adviser is appointed (adviserId exists)
 * 3. At least 3 defense panelists are appointed (panelistIds.length >= 3)
 */
export function getDefenseReadiness(project) {
  const defStatus = project?.defenseSchedule?.status;
  const isScheduled = defStatus === 'scheduled';
  const hasAdviser = Boolean(project?.adviserId);
  const panelistCount = project?.panelistIds?.length || 0;
  const hasFullCommittee = hasAdviser && panelistCount >= 3;
  const isEndorsed = defStatus === 'pending_scheduling';

  const isReady = isEndorsed && hasFullCommittee;
  const isCommitteeIncomplete = (isEndorsed || isScheduled) && !hasFullCommittee;

  let committeeNote = '';
  if (!hasAdviser && panelistCount < 3) {
    committeeNote = `Missing Adviser & ${3 - panelistCount} Panelists`;
  } else if (!hasAdviser) {
    committeeNote = 'Missing Adviser';
  } else if (panelistCount < 3) {
    committeeNote = `${3 - panelistCount} more panelist${3 - panelistCount > 1 ? 's' : ''} needed`;
  }

  return {
    isScheduled,
    isEndorsed,
    hasAdviser,
    panelistCount,
    hasFullCommittee,
    isReady,
    isCommitteeIncomplete,
    committeeNote,
  };
}

/**
 * Returns color-coded badge styling for milestone deliverable categories
 */
export function getDeliverableBadgeTheme(deliverableId) {
  const category = DELIVERABLE_CATEGORY_MAP[deliverableId] || 'manuscript';
  switch (category) {
    case 'manuscript':
      return {
        bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20',
        dot: 'bg-blue-500',
        label: 'Manuscript',
      };
    case 'matrix':
      return {
        bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/20',
        dot: 'bg-purple-500',
        label: 'ADM Review',
      };
    case 'prototype':
      return {
        bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20',
        dot: 'bg-amber-500',
        label: 'Prototype / Plan',
      };
    case 'final_paper':
      return {
        bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20',
        dot: 'bg-emerald-500',
        label: 'Final Approved Paper',
      };
    default:
      return {
        bg: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
        dot: 'bg-primary',
        label: 'Deliverable',
      };
  }
}

/**
 * Safely resolves the project workspace navigation tab, preserving the final archive stage.
 */
export function resolveProjectTab(project) {
  if (project?.stage) return project.stage;
  if (project?.capstonePhase === 4) return 'final';
  return `capstone_${project?.capstonePhase || 1}`;
}

/**
 * Resolves the capstone phase and milestone label for a team/project
 */
export function getTeamCapstoneLabel(project) {
  const phase = resolveWorkflowPhase(project);
  if (phase === CAPSTONE_PHASES.PHASE_1) return 'Phase 1: Title Proposal Review';
  if (phase === CAPSTONE_PHASES.PHASE_2) return 'Phase 2: Capstone 1 Proposal Defense';
  if (phase === CAPSTONE_PHASES.PHASE_3) return 'Phase 3: Capstone 2 System Defense';
  if (phase === CAPSTONE_PHASES.PHASE_4) return 'Phase 4: Capstone 3 Final Defense & Archival';
  return 'Phase 0: Team Formation';
}

/**
 * Creates an invisible 1x1 drag preview to prevent obscuring drop target time slots
 */
export function getTransparentDragImage() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas;
}
