import { ROLES, PANEL_ROLES } from '@cms/shared';

/**
 * Single source of truth for the Action Done Matrix (ADM) workflow on the client.
 * Mirrors the server model (`project.model.js#getUnisonADM`) and the secretary
 * authorization rules in `server/middleware/authorize.js`.
 */

export const ADM_MILESTONES = Object.freeze({
  CAPSTONE_1: Object.freeze({
    id: 'CAPSTONE_1',
    shortLabel: 'Cap 1',
    longLabel: 'Capstone 1',
    title: 'Capstone 1 — Action Done Matrix',
    pillLabel: 'Cap 1 (ADM v1)',
    caption: 'Proposal / title defense panel remarks',
    unisonKey: 'v1',
    order: 1,
  }),
  CAPSTONE_2: Object.freeze({
    id: 'CAPSTONE_2',
    shortLabel: 'Cap 2',
    longLabel: 'Capstone 2',
    title: 'Capstone 2 — Action Done Matrix',
    pillLabel: 'Cap 2 (ADM v2)',
    caption: 'Midterm defense panel remarks',
    unisonKey: 'v2',
    order: 2,
  }),
  CAPSTONE_3: Object.freeze({
    id: 'CAPSTONE_3',
    shortLabel: 'Cap 3',
    longLabel: 'Capstone 3',
    title: 'Capstone 3 — Action Done Matrix',
    pillLabel: 'Cap 3 (ADM v3)',
    caption: 'Progress and final defense panel remarks',
    unisonKey: 'v3',
    order: 3,
  }),
});

export const ADM_MILESTONE_IDS = Object.freeze(Object.keys(ADM_MILESTONES));

/** Milestone that is currently active for a project, derived from its capstone phase. */
export function getActiveAdmMilestone(project) {
  const phase = Number(project?.capstonePhase ?? project?.phase ?? 1);
  if (phase >= 3) return 'CAPSTONE_3';
  if (phase === 2) return 'CAPSTONE_2';
  return 'CAPSTONE_1';
}

export function getMilestoneRows(project, milestone) {
  const rows = Array.isArray(project?.actionDoneMatrix) ? project.actionDoneMatrix : [];
  const fallback = getActiveAdmMilestone(project);
  const target = milestone || fallback;
  return rows.filter((row) => (row?.milestone || fallback) === target);
}

export function getMilestoneSignatureSet(project, milestone) {
  const target = milestone || getActiveAdmMilestone(project);
  const fromMilestone = project?.admSignaturesByMilestone?.[target];
  if (fromMilestone && Object.keys(fromMilestone).length > 0) return fromMilestone;
  const unisonKey = ADM_MILESTONES[target]?.unisonKey;
  const fromUnison = unisonKey ? project?.unisonADM?.[unisonKey]?.signatures : null;
  if (fromUnison && Object.keys(fromUnison).length > 0) return fromUnison;
  if (target === getActiveAdmMilestone(project) && project?.admSignatures) {
    return project.admSignatures;
  }
  // Legacy projects predate per-milestone signatures and only carry the single admSignatures block
  if (!project?.admSignaturesByMilestone && project?.admSignatures) {
    return project.admSignatures;
  }
  return {};
}

/**
 * Resolve the workflow status of one ADM milestone into a display-ready descriptor.
 * Statuses follow the server `admStatus` enum; there is no "submitted" status.
 */
export function resolveAdmStatus(project, milestone) {
  const target = milestone || getActiveAdmMilestone(project);
  const rows = getMilestoneRows(project, target);
  const signatures = getMilestoneSignatureSet(project, target);
  const unisonKey = ADM_MILESTONES[target]?.unisonKey;
  const isActive = target === getActiveAdmMilestone(project);
  const serverStatus =
    project?.unisonADM?.[unisonKey]?.status ?? (isActive ? project?.admStatus : undefined);

  const verified = rows.filter((row) => row.status === 'verified').length;
  const addressed = rows.filter(
    (row) => row.status === 'addressed' || row.status === 'verified',
  ).length;
  const secretaryEndorsed = Boolean(signatures?.secretary?.endorsed);
  const counts = { total: rows.length, addressed, verified };

  const isApproved =
    serverStatus === 'approved' ||
    (secretaryEndorsed &&
      Boolean(signatures?.adviser?.signed) &&
      Boolean(signatures?.chair?.signed));

  if (isApproved) {
    return { key: 'approved', label: 'Approved', tone: 'success', secretaryEndorsed, ...counts };
  }
  if (secretaryEndorsed) {
    return {
      key: 'endorsed',
      label: 'Secretary Endorsed',
      tone: 'info',
      secretaryEndorsed,
      ...counts,
    };
  }
  if (serverStatus === 'pending_secretary_endorsement') {
    return {
      key: 'awaiting_endorsement',
      label: 'Awaiting Secretary Endorsement',
      tone: 'review',
      secretaryEndorsed,
      ...counts,
    };
  }
  if (rows.length > 0) {
    return {
      key: 'awaiting_student',
      label: addressed === rows.length ? 'Ready for Submission' : 'In Progress',
      tone: 'warning',
      secretaryEndorsed,
      ...counts,
    };
  }
  if (serverStatus === 'awaiting_minutes_upload') {
    return {
      key: 'awaiting_minutes',
      label: 'Awaiting Defense Minutes',
      tone: 'muted',
      secretaryEndorsed,
      ...counts,
    };
  }
  return { key: 'not_started', label: 'Not Started', tone: 'muted', secretaryEndorsed, ...counts };
}

const idOf = (value) => {
  const raw = value?._id ?? value?.userId?._id ?? value?.userId ?? value;
  return raw ? String(raw) : '';
};

/**
 * Appointed Committee Secretary of a project. Matches the server rule in
 * `authorizeSecretaryCapability`: `project.secretaryId` or a panelist entry with the
 * `secretary` role. A faculty account is never a secretary merely because no one is appointed.
 */
export function isAppointedSecretary(project, user) {
  const userId = idOf(user);
  if (!userId || !project) return false;
  const direct = idOf(project.secretaryId) || idOf(project.teamId?.secretaryId);
  if (direct && direct === userId) return true;
  return (project.panelists || []).some(
    (panelist) =>
      idOf(panelist.userId ?? panelist) === userId &&
      (panelist.role === PANEL_ROLES?.SECRETARY || panelist.role === 'secretary'),
  );
}

/**
 * Permissions for the defense minutes sheet. Instructors keep oversight (server parity),
 * students are always read-only, and only the appointed secretary can sign.
 */
export function resolveMinutesPermissions(project, user) {
  const role = user?.role;
  const isStudent = role === ROLES?.STUDENT || role === 'student';
  const isInstructor = role === ROLES?.INSTRUCTOR || role === 'instructor';
  const isSecretary = isAppointedSecretary(project, user);
  return {
    isStudent,
    isSecretary,
    isInstructor,
    canEdit: !isStudent && (isSecretary || isInstructor),
    canSign: !isStudent && isSecretary,
  };
}
