import Project from '../project.model.js';
import { createHash } from 'node:crypto';
import Team from '../../teams/team.model.js';
import User from '../../users/user.model.js';
import Section from '../../academics/section.model.js';
import Notification from '../../notifications/notification.model.js';
import Submission from '../../submissions/submission.model.js';
import Evaluation from '../../evaluations/evaluation.model.js';
import AppError from '../../../utils/AppError.js';
import { findSimilarProjects } from '../../../utils/titleSimilarity.js';
import storageService from '../../../services/storage.index.js';
import cacheService from '../../../services/cache.service.js';
import { emitToUser, emitToRoom, emitToAll } from '../../../services/socket.service.js';
import { isADMComplete } from './admCompletion.js';
import { assertProjectWritable } from './projectMutationGuard.js';
import {
  ROLES,
  TITLE_STATUSES,
  PROJECT_STATUSES,
  CAPSTONE_PHASES,
  CAPSTONE_COURSES,
  EVALUATION_STATUSES,
  DEFENSE_TYPES,
  DEFENSE_DECISIONS,
  PROTOTYPE_TYPES,
  CAPSTONE_TITLE_MAPPING,
  SDG_TAG_SUGGESTIONS,
} from '@cms/shared';

function normalizeAcademicYearValue(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\u2012\u2013\u2014\u2015]/g, '-');
}

export { assertProjectWritable };

export function ganttScheduleHash(plan = {}) {
  const tasks = (Array.isArray(plan.tasks) ? plan.tasks : []).map((task) => ({
    id: String(task?.id || ''),
    section: String(task?.section || '').trim(),
    title: String(task?.title || '').trim(),
    owner: String(task?.owner || '').trim(),
    startDate: String(task?.startDate || ''),
    dueDate: String(task?.dueDate || ''),
    durationDays: Number(task?.durationDays) || 0,
  }));
  const sections = (Array.isArray(plan.sections) ? plan.sections : [])
    .map((section) => String(section || '').trim())
    .filter(Boolean);
  return createHash('sha256').update(JSON.stringify({ tasks, sections })).digest('hex');
}

function parseGanttDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function buildWeeklyCheckInSchedule(plan, scheduleHash) {
  const tasks = (Array.isArray(plan?.tasks) ? plan.tasks : [])
    .map((task, index) => {
      if (!String(task?.title || '').trim() || !String(task?.section || '').trim()) return null;
      const start = parseGanttDate(task.startDate);
      const due = parseGanttDate(task.dueDate);
      if (!start || !due || due < start) {
        throw new AppError(
          'Every named Gantt task needs valid start and due dates before adviser approval.',
          400,
          'GANTT_TASK_DATES_REQUIRED',
        );
      }
      return {
        id: String(task.id || task._id || `task-${index + 1}`),
        title: String(task.title).trim(),
        start,
        due,
      };
    })
    .filter(Boolean);

  if (!tasks.length) return [];

  const firstStart = new Date(Math.min(...tasks.map((task) => task.start.getTime())));
  const lastDue = new Date(Math.max(...tasks.map((task) => task.due.getTime())));
  const daysFromMonday = (firstStart.getUTCDay() + 6) % 7;
  const weekStart = new Date(firstStart.getTime() - daysFromMonday * 86400000);
  const schedule = [];

  while (weekStart <= lastDue) {
    if (schedule.length >= 26) {
      throw new AppError(
        'The approved Capstone 2 Gantt schedule cannot exceed 26 weeks.',
        400,
        'GANTT_SEMESTER_TOO_LONG',
      );
    }
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000 - 1);
    const taskIds = tasks
      .filter((task) => task.start <= weekEnd && task.due >= weekStart)
      .map((task) => task.id);
    if (taskIds.length) {
      schedule.push({
        scheduleHash,
        weekKey: weekStart.toISOString().slice(0, 10),
        weekStart: new Date(weekStart),
        dueAt: new Date(weekEnd),
        taskIds: [...new Set(taskIds)],
        status: 'scheduled',
      });
    }
    weekStart.setUTCDate(weekStart.getUTCDate() + 7);
  }

  return schedule;
}

export function getWeeklyCheckInBlocker(project, now = new Date()) {
  const scheduleHash = project?.ganttApproval?.scheduleHash;
  if (!scheduleHash) return null;

  const currentSchedule = (project.weeklyCheckIns || []).filter(
    (checkIn) => checkIn.scheduleHash === scheduleHash,
  );
  if (!currentSchedule.length) {
    return {
      code: 'WEEKLY_CHECKIN_SCHEDULE_MISSING',
      message: 'Weekly progress check-ins must be scheduled from the approved Gantt plan.',
    };
  }

  const unresolved = currentSchedule.find(
    (checkIn) => new Date(checkIn.dueAt) <= now && checkIn.status !== 'approved',
  );
  if (!unresolved) return null;

  const week = new Date(unresolved.weekStart).toISOString().slice(0, 10);
  return {
    code: 'WEEKLY_CHECKIN_UNRESOLVED',
    message: `The weekly progress check-in for the week of ${week} must be adviser-approved${unresolved.isLate ? ' and receive an instructor waiver' : ''} before progression.`,
  };
}

class ProjectCoreService {
  /**
   * Fetch a project by ID or throw 404.
   * Used by nearly every public method to avoid repeating the same
   * two-line fetch-and-guard pattern.
   *
   * @param {string} projectId
   * @returns {Promise<Object>} Hydrated project document
   * @private
   */
  async _getProjectOrFail(projectId) {
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    return project;
  }

  _assertProjectWritable(project) {
    assertProjectWritable(project);
  }

  _getAssignedDefensePanelistIds(project) {
    const assignments = (project?.panelists || []).filter(
      (assignment) => String(assignment.role || '').toLowerCase() !== 'secretary',
    );
    const ids = assignments.length
      ? assignments.map((assignment) => String(assignment.userId?._id || assignment.userId || ''))
      : (project?.panelistIds || []).map((id) => String(id?._id || id));
    const secretaryId = String(project?.secretaryId?._id || project?.secretaryId || '');
    return [...new Set(ids.filter((id) => id && id !== secretaryId))];
  }

  async _hasReleasedPassingEvaluations(project, defenseType) {
    const assignedIds = this._getAssignedDefensePanelistIds(project);
    if (assignedIds.length === 0) return false;

    const aliases =
      defenseType === DEFENSE_TYPES.PROGRESS
        ? [DEFENSE_TYPES.PROGRESS, 'midterm']
        : defenseType === DEFENSE_TYPES.FINAL
          ? [DEFENSE_TYPES.FINAL, 'paper']
          : [DEFENSE_TYPES.PROPOSAL];
    const evaluations = await Evaluation.find({
      projectId: project._id,
      defenseType: { $in: aliases },
    }).select('panelistId status decision');
    const byPanelist = new Map(
      evaluations.map((evaluation) => [String(evaluation.panelistId), evaluation]),
    );
    return assignedIds.every((panelistId) => {
      const evaluation = byPanelist.get(panelistId);
      return Boolean(
        evaluation?.status === EVALUATION_STATUSES.RELEASED &&
        [DEFENSE_DECISIONS.PASSED, DEFENSE_DECISIONS.PASSED_WITH_REVISIONS].includes(
          String(evaluation.decision || '').toLowerCase(),
        ),
      );
    });
  }

  async _getPhaseExitBlocker(project, phase) {
    const milestone = phase === 1 ? 'CAPSTONE_1' : 'CAPSTONE_2';
    if (!isADMComplete(project, milestone)) {
      return {
        code: 'ADM_NOT_APPROVED',
        message: `The ${milestone.replace('_', ' ')} Action Done Matrix must be fully signed before the course can advance.`,
      };
    }

    const defenseType = phase === 1 ? DEFENSE_TYPES.PROPOSAL : DEFENSE_TYPES.PROGRESS;
    if (!(await this._hasReleasedPassingEvaluations(project, defenseType))) {
      return {
        code: phase === 1 ? 'PROPOSAL_EVALUATION_REQUIRED' : 'PROGRESS_EVALUATION_REQUIRED',
        message: `Every assigned panelist must submit a passing ${phase === 1 ? 'Capstone 1 proposal' : 'Capstone 2 system'} evaluation, and the instructor must release the grades.`,
      };
    }

    if (phase === 1) {
      const proposal = await Submission.findOne({ projectId: project._id, type: 'proposal' })
        .sort({ version: -1 })
        .select('status');
      if (!proposal || !['approved', 'accepted', 'locked'].includes(proposal.status)) {
        return {
          code: 'APPROVED_PROPOSAL_REQUIRED',
          message:
            'The compiled Chapters 1–3 proposal must be approved by the adviser before Capstone 2 can begin.',
        };
      }
      return null;
    }

    const plannedTasks = (project.ganttPlan?.tasks || []).filter(
      (task) => String(task?.title || '').trim() && String(task?.section || '').trim(),
    );
    const expectedScheduleHash = ganttScheduleHash(project.ganttPlan || {});
    if (
      plannedTasks.length === 0 ||
      !project.ganttApproval?.approved ||
      project.ganttApproval?.scheduleHash !== expectedScheduleHash
    ) {
      return {
        code: 'GANTT_APPROVAL_REQUIRED',
        message:
          'A saved Capstone 2 Gantt schedule must be approved by the adviser before the course can advance.',
      };
    }
    const checkInBlocker = getWeeklyCheckInBlocker(project);
    if (checkInBlocker) return checkInBlocker;
    if (!project.githubRepoUrl || (!(project.prototypes || []).length && !project.demoVideoUrl)) {
      return {
        code: 'SYSTEM_ARTIFACTS_REQUIRED',
        message:
          'Add the project GitHub repository and at least one system demo or gallery artifact before advancing to Capstone 3.',
      };
    }
    if (!project.systemDefenseApproval?.approved) {
      return {
        code: 'SYSTEM_DEFENSE_CLEARANCE_REQUIRED',
        message:
          'The adviser must clear the working system for defense before the project can advance to Capstone 3.',
      };
    }
    return null;
  }

  async getPhaseExitBlocker(project, phase) {
    return this._getPhaseExitBlocker(project, phase);
  }

  /**
   * Keep development assets scoped to Capstone 2 after the Capstone 1 ADM is complete.
   * @param {Object} project
   * @private
   */
  _assertCapstone2ADMApproved(project) {
    const currentPhase = Number(project.capstonePhase ?? 1);
    if (currentPhase !== CAPSTONE_COURSES.CAPSTONE_2) {
      throw new AppError(
        'System development assets can only be changed during Capstone 2.',
        400,
        'INVALID_PHASE_FOR_DEVELOPMENT_ASSET',
      );
    }
    const isADMApproved = isADMComplete(project, 'CAPSTONE_1');

    if (!isADMApproved) {
      throw new AppError(
        'Capstone 1 Action Done Matrix must be fully signed before modifying Capstone 2 development assets.',
        400,
        'ADM_NOT_APPROVED',
      );
    }
  }

  /**
   * Assert that the given userId is the leader of the team.
   * @param {import('mongoose').Types.ObjectId} teamId
   * @param {string} userId
   * @private
   */
  async _assertTeamLeader(teamId, userId) {
    const team = await Team.findById(teamId);
    if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    if (team.leaderId.toString() !== userId.toString()) {
      throw new AppError('Only the team leader can perform this action.', 403, 'FORBIDDEN');
    }
  }

  /**
   * Assert that the given userId is a member of the team.
   * @param {import('mongoose').Types.ObjectId} teamId
   * @param {string} userId
   * @private
   */
  async _assertTeamMember(teamId, userId) {
    const team = await Team.findById(teamId);
    if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    const isMember = team.members.some((id) => id.toString() === userId.toString());
    if (!isMember) {
      throw new AppError('You are not a member of this project team.', 403, 'FORBIDDEN');
    }
  }

  async _assertGanttScheduleEditor(project, userId, userRole) {
    const actorId = String(userId || '');
    const getId = (value) => {
      const id = value?._id || value?.id || value?.userId || value;
      return id === null || id === undefined ? '' : String(id);
    };
    const panelistIds = [
      ...(Array.isArray(project.panelistIds) ? project.panelistIds : []),
      ...(Array.isArray(project.panelists)
        ? project.panelists.map((panelist) => panelist?.userId || panelist)
        : []),
    ];
    const isPanelist =
      userRole === ROLES.PANELIST ||
      panelistIds.some((panelistId) => getId(panelistId) === actorId);

    if (isPanelist) {
      throw new AppError(
        'Panelists have view-only access to the Gantt schedule.',
        403,
        'GANTT_EDIT_FORBIDDEN',
      );
    }

    const assignedAdviserId = getId(project.adviserId);
    if (
      [ROLES.ADVISER, ROLES.FACULTY].includes(userRole) &&
      assignedAdviserId &&
      assignedAdviserId === actorId
    ) {
      return;
    }

    if (userRole === ROLES.STUDENT) {
      const team = await Team.findById(project.teamId?._id || project.teamId);
      if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
      const memberIds = [team.leaderId, ...(Array.isArray(team.members) ? team.members : [])];
      if (memberIds.some((memberId) => getId(memberId) === actorId)) return;
    }

    throw new AppError(
      'Only assigned student team members and the assigned Adviser can edit the Gantt schedule.',
      403,
      'GANTT_EDIT_FORBIDDEN',
    );
  }

  /**
   * Send identical notifications to every member of a team.
   * Optionally exclude a specific user (e.g. the action initiator).
   *
   * @param {import('mongoose').Types.ObjectId} teamId
   * @param {{ type: string, title: string, message: string, metadata: Object }} notif
   * @param {{ excludeUserId?: string }} [options={}]
   * @private
   */
  async _notifyTeamMembers(teamId, notif, { excludeUserId } = {}) {
    const team = await Team.findById(teamId);
    if (!team) return;

    let recipients = team.members;
    if (excludeUserId) {
      recipients = recipients.filter((id) => id.toString() !== excludeUserId.toString());
    }
    if (recipients.length === 0) return;

    const notifs = await Notification.insertMany(
      recipients.map((memberId) => ({
        userId: memberId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        metadata: notif.metadata,
      })),
    );
    notifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
  }

  async _invalidateProjectCache(projectId) {
    if (!projectId) return;
    try {
      const id = String(projectId._id || projectId);
      await cacheService.del(`project:meta:${id}`);
      await cacheService.del(`project:detail:${id}`);
      emitToRoom(`project:${id}`, 'project:updated', { projectId: id });
      emitToAll('project:updated', { projectId: id });
    } catch {
      // Non-blocking cache eviction
    }
  }

  /**
   * Notify all active instructors about a project event.
   * Used for title submissions, revisions, and modification requests.
   *
   * @param {{ type: string, title: string, message: string, metadata: Object }} notif
   * @private
   */
  async _notifyInstructors(notif) {
    const instructors = await User.find({ role: ROLES.INSTRUCTOR, isActive: true });
    if (instructors.length === 0) return;

    const notifs = await Notification.insertMany(
      instructors.map((instr) => ({
        userId: instr._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        metadata: notif.metadata,
      })),
    );
    notifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
  }

  /**
   * Notify the project's assigned adviser (if one exists).
   * @param {Object} project - Project document (must have adviserId)
   * @param {{ type: string, title: string, message: string, metadata: Object }} notif
   * @private
   */
  async _notifyAdviser(project, notif) {
    if (!project.adviserId) return;
    const advNotif = await Notification.create({
      userId: project.adviserId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      metadata: notif.metadata,
    });
    emitToUser(project.adviserId, 'notification:new', advNotif);
  }

  _normalizeTitleProposals(titleProposals = []) {
    if (!Array.isArray(titleProposals)) return [];

    const normalizedByTitle = new Map();

    for (const proposal of titleProposals) {
      if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
        continue;
      }

      const title = typeof proposal.title === 'string' ? proposal.title.trim() : '';
      const description =
        typeof proposal.description === 'string' ? proposal.description.trim() : '';
      const capstoneType = Array.isArray(proposal.capstoneType)
        ? [
            ...new Set(
              proposal.capstoneType.map((ct) => (typeof ct === 'string' ? ct.trim() : '')),
            ),
          ].filter(Boolean)
        : typeof proposal.capstoneType === 'string'
          ? [proposal.capstoneType.trim()]
          : [];
      const sdgTags = Array.isArray(proposal.sdgTags)
        ? [
            ...new Set(proposal.sdgTags.map((tag) => (typeof tag === 'string' ? tag.trim() : ''))),
          ].filter(Boolean)
        : [];

      const pitchDeck =
        proposal.pitchDeck &&
        typeof proposal.pitchDeck === 'object' &&
        !Array.isArray(proposal.pitchDeck)
          ? proposal.pitchDeck
          : {};

      if (!title) continue;

      if (!normalizedByTitle.has(title)) {
        normalizedByTitle.set(title, {
          title,
          description,
          capstoneType,
          sdgTags,
          pitchDeck,
          isFlagged: Boolean(proposal.isFlagged),
          flagReason: proposal.flagReason || null,
          similarityScore: Number(proposal.similarityScore) || 0,
        });
      }
    }

    return [...normalizedByTitle.values()];
  }

  /* ═══════════════════ Creation ═══════════════════ */

  async getCreateProjectDraft(userId) {
    const user = await User.findById(userId).select(
      '+createProjectDraft +createProjectDraftUpdatedAt',
    );
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    return {
      draft: user.createProjectDraft || null,
      updatedAt: user.createProjectDraftUpdatedAt || null,
    };
  }

  async saveCreateProjectDraft(userId, draft) {
    const user = await User.findById(userId).select(
      '+createProjectDraft +createProjectDraftUpdatedAt',
    );
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    // Prevent clobbering existing substantive draft if incoming autosave is completely blank/unhydrated
    const hasIncomingContent =
      Boolean(draft) &&
      (Array.isArray(draft.titleProposals)
        ? draft.titleProposals.some(
            (p) =>
              p?.title?.trim() ||
              p?.pitchDeck?.problemStatement?.trim() ||
              p?.pitchDeck?.proposedSolution?.trim(),
          )
        : false);

    const hasExistingContent =
      Boolean(user.createProjectDraft) &&
      (Array.isArray(user.createProjectDraft.titleProposals)
        ? user.createProjectDraft.titleProposals.some(
            (p) =>
              p?.title?.trim() ||
              p?.pitchDeck?.problemStatement?.trim() ||
              p?.pitchDeck?.proposedSolution?.trim(),
          )
        : false);

    if (!hasIncomingContent && hasExistingContent) {
      // Retain existing saved draft rather than overwriting with empty initial state
      return {
        draft: user.createProjectDraft,
        updatedAt: user.createProjectDraftUpdatedAt,
      };
    }

    user.createProjectDraft = draft;
    user.createProjectDraftUpdatedAt = draft ? new Date() : null;
    user.markModified('createProjectDraft');
    await user.save();

    return {
      draft: user.createProjectDraft || null,
      updatedAt: user.createProjectDraftUpdatedAt || null,
    };
  }

  async clearCreateProjectDraft(userId) {
    const user = await User.findById(userId).select(
      '+createProjectDraft +createProjectDraftUpdatedAt',
    );
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    user.createProjectDraft = null;
    user.createProjectDraftUpdatedAt = null;
    user.markModified('createProjectDraft');
    await user.save();

    return { draft: null, updatedAt: null };
  }

  /**
   * Create a new project for the authenticated student's team.
   * The student must be a team leader with no existing active project.
   * Also runs a similarity check against existing titles and returns warnings.
   * @param {string} userId - The requesting student (team leader).
   * @param {Object} data - { title, titleProposals, abstract?, keywords?, academicYear }
   * @returns {Object} { project, similarProjects }
   */
  async createProject(userId, data) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can create projects.', 403, 'FORBIDDEN');
    }

    let team = null;
    if (user.teamId) {
      team = await Team.findById(user.teamId).select(
        'leaderId members isLocked sectionId academicYear academicTerm courseId adviserId secretaryId panelistIds',
      );
    }

    const payloadAcademicYear = normalizeAcademicYearValue(data.academicYear);
    const teamAcademicYear = normalizeAcademicYearValue(team?.academicYear);
    let effectiveAcademicYear = teamAcademicYear || payloadAcademicYear;
    const effectiveAcademicTerm = team?.academicTerm || user.academicTerm || null;

    // Resolve section ID: canonical team > explicit payload > user profile
    let effectiveSectionId = data.sectionId;
    if (team?.sectionId) {
      effectiveSectionId = team.sectionId;
    } else if (!effectiveSectionId && user.sectionId) {
      // Fall back to user section if available
      effectiveSectionId = user.sectionId;
    }

    if (!effectiveSectionId) {
      throw new AppError(
        'No section found. Please provide a section, ensure your team has a section, or update your profile.',
        400,
        'SECTION_NOT_FOUND',
      );
    }

    const section = await Section.findById(effectiveSectionId).populate('courseId', 'name code');
    if (!section) {
      throw new AppError('Selected section was not found.', 404, 'SECTION_NOT_FOUND');
    }

    const sectionAcademicYear = normalizeAcademicYearValue(section.academicYear);

    if (!effectiveAcademicYear && sectionAcademicYear) {
      effectiveAcademicYear = sectionAcademicYear;
    }

    if (!effectiveAcademicYear) {
      throw new AppError('Academic year is required.', 400, 'ACADEMIC_YEAR_REQUIRED');
    }
    if (!effectiveAcademicTerm) {
      throw new AppError(
        'Academic term is required in the student profile.',
        400,
        'ACADEMIC_TERM_REQUIRED',
      );
    }

    const hasCanonicalTeamSection = Boolean(team?.sectionId);

    if (
      !hasCanonicalTeamSection &&
      sectionAcademicYear &&
      sectionAcademicYear !== effectiveAcademicYear
    ) {
      throw new AppError(
        'Selected section does not belong to the selected academic year.',
        400,
        'SECTION_YEAR_MISMATCH',
      );
    }

    if (sectionAcademicYear) {
      effectiveAcademicYear = sectionAcademicYear;
    }

    if (!team) {
      throw new AppError(
        'Create a team and lock a 1–4 member roster before submitting capstone proposals.',
        400,
        'NO_TEAM',
      );
    }

    if (!team) {
      team = await Team.findById(user.teamId);
    }

    if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');

    if (!team.isLocked) {
      throw new AppError(
        'Your team must be finalized before creating a project.',
        400,
        'TEAM_NOT_FINALIZED',
      );
    }

    if (team.leaderId.toString() !== userId.toString()) {
      throw new AppError('Only the team leader can create a project.', 403, 'FORBIDDEN');
    }

    const normalizedTitleProposals = this._normalizeTitleProposals(data.titleProposals);
    const normalizedSdgTags = [...new Set((data.sdgTags || []).map((tag) => tag.trim()))];

    if (normalizedSdgTags.length === 0) {
      throw new AppError('At least one SDG tag is required.', 400, 'SDG_TAGS_REQUIRED');
    }

    const hasInvalidSdgTag = normalizedSdgTags.some((tag) => !SDG_TAG_SUGGESTIONS.includes(tag));
    if (hasInvalidSdgTag) {
      throw new AppError('One or more SDG tags are invalid.', 400, 'INVALID_SDG_TAG');
    }

    if (normalizedTitleProposals.length < 1) {
      throw new AppError(
        'At least 1 unique title proposal is required.',
        400,
        'MIN_TITLE_PROPOSALS',
      );
    }

    if (!normalizedTitleProposals[0]?.description) {
      throw new AppError(
        'Proposal 1 must include a description.',
        400,
        'PROPOSAL_DESCRIPTION_REQUIRED',
      );
    }

    const hasIncompleteProposalMetadata = normalizedTitleProposals.some(
      (proposal) =>
        !proposal.description ||
        proposal.capstoneType.length === 0 ||
        proposal.sdgTags.length === 0,
    );
    if (hasIncompleteProposalMetadata) {
      throw new AppError(
        'Each title proposal must include a description, capstone type, and at least one SDG tag.',
        400,
        'INCOMPLETE_TITLE_PROPOSAL_METADATA',
      );
    }

    const proposalTitles = normalizedTitleProposals.map((proposal) => proposal.title);
    if (!proposalTitles.includes(data.title.trim())) {
      throw new AppError(
        'Selected project title must be one of the submitted title proposals.',
        400,
        'TITLE_NOT_IN_PROPOSALS',
      );
    }

    const requestedRoleAssignments = Array.isArray(data.memberRoleAssignments)
      ? data.memberRoleAssignments
      : [];

    if (requestedRoleAssignments.length > 0) {
      const teamMemberIds = team.members.map((memberId) => memberId.toString()).sort();
      const assignedMemberIds = requestedRoleAssignments
        .map((assignment) => assignment.userId.toString())
        .sort();

      if (teamMemberIds.length !== assignedMemberIds.length) {
        throw new AppError(
          'Every team member (including the leader) must have one assigned professional capstone title.',
          400,
          'INCOMPLETE_ROLE_ASSIGNMENTS',
        );
      }

      const teamMemberSet = new Set(teamMemberIds);
      for (const assignedId of assignedMemberIds) {
        if (!teamMemberSet.has(assignedId)) {
          throw new AppError(
            'Role assignments can only include members from your current team.',
            403,
            'INVALID_ASSIGNMENT_MEMBER',
          );
        }
      }

      const uniqueAssignedMemberIds = new Set(assignedMemberIds);
      if (uniqueAssignedMemberIds.size !== assignedMemberIds.length) {
        throw new AppError(
          'Each team member can only be assigned one professional capstone title.',
          400,
          'DUPLICATE_MEMBER_ASSIGNMENT',
        );
      }

      const professionalTitles = requestedRoleAssignments.map(
        (assignment) => assignment.professionalTitle,
      );
      const uniqueProfessionalTitles = new Set(professionalTitles);
      if (uniqueProfessionalTitles.size !== professionalTitles.length) {
        throw new AppError(
          'Each professional capstone title can only be assigned once per project.',
          400,
          'DUPLICATE_PROFESSIONAL_TITLE',
        );
      }
    }

    const memberRoleAssignments = requestedRoleAssignments.map((assignment) => {
      const mapping = CAPSTONE_TITLE_MAPPING[assignment.professionalTitle];
      return {
        userId: assignment.userId,
        professionalTitle: assignment.professionalTitle,
        traditionalRole: mapping.traditionalRole,
        responsibilities: mapping.responsibilities,
      };
    });

    // Prevent duplicate active projects per team (rejected or completed projects don't block creation)
    const existingProject = await Project.findOne({
      teamId: team._id,
      academicYear: effectiveAcademicYear,
      $or: [
        { academicTerm: effectiveAcademicTerm },
        { academicTerm: { $exists: false } },
        { academicTerm: null },
        { academicTerm: '' },
      ],
      projectStatus: {
        $nin: [
          PROJECT_STATUSES.REJECTED,
          PROJECT_STATUSES.FINAL_APPROVED,
          PROJECT_STATUSES.ARCHIVED,
        ],
      },
    });
    if (existingProject) {
      const isPendingReview = existingProject.titleStatus === TITLE_STATUSES.SUBMITTED;
      const isDraft = existingProject.titleStatus === TITLE_STATUSES.DRAFT;
      const isRevisionRequired = existingProject.titleStatus === TITLE_STATUSES.REVISION_REQUIRED;
      const proposalCount = Array.isArray(existingProject.titleProposals)
        ? existingProject.titleProposals.length
        : 0;

      let errorMessage;
      if (isPendingReview) {
        errorMessage = `Your team already has ${proposalCount} proposal${proposalCount !== 1 ? 's' : ''} pending instructor review. You cannot submit another set of proposals until the current ones are reviewed. Please wait for the instructor's decision.`;
      } else if (isDraft) {
        errorMessage =
          'Your team already has a project in draft status. Please go to My Capstone to edit and submit your existing proposals instead of creating a new project.';
      } else if (isRevisionRequired) {
        errorMessage =
          'Your team has proposals that require revision. Please go to My Capstone to address the instructor feedback and resubmit instead of creating a new project.';
      } else {
        errorMessage =
          'Your team already has an active project. Only one active project per team is allowed.';
      }

      throw new AppError(errorMessage, 409, 'PROJECT_EXISTS');
    }

    const memberTeamIds = await Team.find({ members: { $in: team.members } }).distinct('_id');
    const activeTermProject = await Project.findOne({
      teamId: { $in: memberTeamIds },
      academicYear: effectiveAcademicYear,
      $or: [
        { academicTerm: effectiveAcademicTerm },
        { academicTerm: { $exists: false } },
        { academicTerm: null },
        { academicTerm: '' },
      ],
      projectStatus: {
        $nin: [
          PROJECT_STATUSES.REJECTED,
          PROJECT_STATUSES.FINAL_APPROVED,
          PROJECT_STATUSES.ARCHIVED,
        ],
      },
    }).select('_id title');
    if (activeTermProject) {
      throw new AppError(
        'A team member already belongs to an active capstone project in this academic term.',
        409,
        'ACTIVE_TERM_PROJECT_EXISTS',
      );
    }

    // Similarity check against all non-rejected projects (bounded and lean for high throughput)
    const allProjects = await Project.find({
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    })
      .select(
        'title abstract keywords academicYear targetBeneficiary techStack titleProposalMetadata capstoneType',
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const similarProjects = findSimilarProjects(
      { title: data.title, keywords: data.keywords || [] },
      allProjects,
    );

    const hasConflict = similarProjects.some((p) => {
      const score = p.similarityScore ?? Math.round((p.score || 0) * 100);
      return score >= 30;
    });
    const isFlagged = Boolean(data.isFlagged || hasConflict);
    const topScore =
      Number(data.similarityScore) ||
      (similarProjects[0]?.similarityScore ?? Math.round((similarProjects[0]?.score || 0) * 100)) ||
      0;
    const flagReason =
      data.flagReason ||
      (isFlagged && similarProjects[0]
        ? `Similar title detected (${topScore}%) against "${similarProjects[0].title}". Flagged for committee review.`
        : null);

    const project = await Project.create({
      teamId: team._id,
      workflowPhase: CAPSTONE_PHASES.PHASE_1,
      stage: 'proposal',
      title: data.title,
      titleProposals: proposalTitles,
      titleProposalMetadata: normalizedTitleProposals,
      abstract: data.abstract || '',
      keywords: data.keywords || [],
      sdgTags: normalizedSdgTags,
      academicYear: effectiveAcademicYear,
      academicTerm: effectiveAcademicTerm,
      courseId: section.courseId._id,
      sectionId: section._id,
      memberRoleAssignments,
      adviserId: team.adviserId || undefined,
      secretaryId: team.secretaryId || undefined,
      panelistIds: team.panelistIds || [],
      isFlagged,
      flagReason,
      similarityScore: topScore,
      panelists:
        Array.isArray(team.panelistIds) && team.panelistIds.length > 0
          ? team.panelistIds.map((pId, idx) => ({
              userId: pId,
              role: idx === 0 ? 'chair' : 'member',
            }))
          : [],
    });

    team.courseId = section.courseId._id;
    team.sectionId = section._id;
    team.academicYear = section.academicYear;
    await team.save();

    if (!user.teamId || user.teamId.toString() !== team._id.toString()) {
      user.teamId = team._id;
      await user.save({ validateBeforeSave: false });
    }

    // Notify team members (exclude the creator)
    await this._notifyTeamMembers(
      team._id,
      {
        type: 'system',
        title: 'Project Created',
        message: `A new project "${project.title}" has been created for your team.`,
        metadata: { projectId: project._id },
      },
      { excludeUserId: userId },
    );

    return { project, similarProjects };
  }

  /* ═══════════════════ Read ═══════════════════ */

  /**
   * Defensive normalization: Capstone 2 is not complete unless ADM is fully approved.
   * If a project record carries capstonePhase >= 3 without ADM approval, normalize to Phase 2.
   */
  _normalizeProjectADMPhase(project) {
    if (!project) return project;
    const isArchivedOrDefended =
      Boolean(project.isArchived) ||
      project.projectStatus === 'archived' ||
      project.projectStatus === PROJECT_STATUSES.ARCHIVED ||
      project.projectStatus === PROJECT_STATUSES.DEFENDED;

    if (isArchivedOrDefended) return project;

    const isC2ADMComplete = isADMComplete(project, 'CAPSTONE_2');
    if (Number(project.capstonePhase) >= 3 && !isC2ADMComplete) {
      project.capstonePhase = 2;
      project.workflowPhase = 3;
      project.capstoneCourse = 'Capstone 2';
      project.stage = 'capstone_2';
    }

    const isC1ADMComplete = isADMComplete(project, 'CAPSTONE_1');
    if (
      Number(project.capstonePhase) === 2 &&
      !isC1ADMComplete &&
      project.titleStatus === TITLE_STATUSES.APPROVED
    ) {
      project.capstonePhase = 1;
      project.workflowPhase = 2;
      project.capstoneCourse = 'Capstone 1';
      project.stage = 'capstone_1';
    }

    return project;
  }

  /**
   * Get a single project by ID with populated references.
   * @param {string} projectId
   * @param {Object} requester - Authenticated user context
   * @returns {Object} { project }
   */
  async getProject(projectId, requester) {
    const cacheKey = `project:meta:${projectId}`;
    const cachedPayload = await cacheService.get(cacheKey);

    if (cachedPayload) {
      const isFaculty = [ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST, ROLES.FACULTY].includes(
        requester?.role,
      );
      if (!isFaculty) {
        if (requester?.role !== ROLES.STUDENT) {
          throw new AppError('You do not have permission to view this project.', 403, 'FORBIDDEN');
        }

        const isTeamMember = cachedPayload.teamId?.members?.some(
          (member) => (member?._id || member).toString() === requester._id.toString(),
        );

        const isArchived =
          cachedPayload.isArchived === true || cachedPayload.projectStatus === 'archived';

        if (!isTeamMember && !isArchived) {
          throw new AppError('You do not have permission to view this project.', 403, 'FORBIDDEN');
        }
      }
      return { project: cachedPayload };
    }

    const project = await Project.findById(projectId)
      .select('-textSidecar -rawExtractedData')
      .populate({
        path: 'teamId',
        select:
          'name leaderId members memberRoles academicYear courseId sectionId adviserId secretaryId panelistIds googleDocUrl githubUrl',
        populate: [
          {
            path: 'leaderId',
            select: 'firstName middleName lastName email instructorId',
            populate: {
              path: 'instructorId',
              select: 'firstName middleName lastName email profilePicture',
            },
          },
          {
            path: 'members',
            select:
              'firstName middleName lastName email profilePicture role proponentRole capstoneRole',
          },
          {
            path: 'memberRoles.userId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'adviserId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'secretaryId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'panelistIds',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'sectionId',
            select: 'name code academicYear academicTerm capstoneCourse courseId createdBy',
            populate: [
              { path: 'createdBy', select: 'firstName middleName lastName email profilePicture' },
              { path: 'courseId', select: 'name code' },
            ],
          },
        ],
      })
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('secretaryId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture')
      .populate('panelists.userId', 'firstName middleName lastName email profilePicture')
      .populate('courseId', 'name code')
      .populate({
        path: 'sectionId',
        select: 'name code academicYear academicTerm capstoneCourse courseId createdBy',
        populate: [
          { path: 'createdBy', select: 'firstName middleName lastName email profilePicture' },
          { path: 'courseId', select: 'name code' },
        ],
      })
      .populate('memberRoleAssignments.userId', 'firstName middleName lastName email')
      .lean();

    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    const isFaculty = [ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST, ROLES.FACULTY].includes(
      requester?.role,
    );
    if (!isFaculty) {
      if (requester?.role !== ROLES.STUDENT) {
        throw new AppError('You do not have permission to view this project.', 403, 'FORBIDDEN');
      }

      const isTeamMember = project.teamId?.members?.some(
        (member) => (member?._id || member).toString() === requester._id.toString(),
      );

      const isArchived = project.isArchived === true || project.projectStatus === 'archived';

      if (!isTeamMember && !isArchived) {
        throw new AppError('You do not have permission to view this project.', 403, 'FORBIDDEN');
      }
    }

    this._normalizeProjectADMPhase(project);

    // Query archive submissions to determine academic paper and journal availability
    const archivedSubmissions = await Submission.find({
      projectId: project._id,
      storageKey: { $exists: true, $ne: null },
    })
      .select('_id type fileName fileType fileSize version status createdAt plagiarismResult')
      .lean();

    const hasAcademicPaper = archivedSubmissions.some(
      (s) =>
        ['final_academic', 'final_paper', 'proposal', 'progress', 'final'].includes(s.type) ||
        (s.chapter !== null && s.chapter !== undefined),
    );
    const hasJournalPaper = archivedSubmissions.some((s) => s.type === 'final_journal');

    const projectPayload = project.toObject ? project.toObject() : { ...project };
    const isArchived = project.isArchived === true || project.projectStatus === 'archived';
    let resolvedOriginality = projectPayload.originalityScore;
    if (isArchived && !Number.isFinite(resolvedOriginality)) {
      const audit = projectPayload.archiveMetadata?.similarityAudit;
      const allConflicts = [
        ...(Array.isArray(audit?.titleConflicts) ? audit.titleConflicts : []),
        ...(Array.isArray(audit?.abstractConflicts) ? audit.abstractConflicts : []),
      ];
      if (allConflicts.length > 0) {
        const topSimilarity = Math.max(
          ...allConflicts.map(
            (c) =>
              Number(c?.similarityScore ?? c?.similarityPct ?? (c?.score ? c.score * 100 : 0)) || 0,
          ),
        );
        resolvedOriginality = Math.max(10, Math.min(100, Math.round(100 - topSimilarity)));
      } else {
        resolvedOriginality = 100;
      }
    }
    projectPayload.originalityScore = resolvedOriginality ?? 100;
    projectPayload.similarityScore = Number.isFinite(resolvedOriginality)
      ? Math.max(0, Math.min(100, Math.round((100 - resolvedOriginality) * 10) / 10))
      : 0;

    projectPayload.hasAcademicPaper = hasAcademicPaper;
    projectPayload.hasJournalPaper = hasJournalPaper;
    projectPayload.hasManuscript = Boolean(hasAcademicPaper || hasJournalPaper);
    projectPayload.archivedSubmissions = {
      hasAcademicPaper,
      hasJournalPaper,
      submissions: archivedSubmissions,
    };

    try {
      const pDoc = new Project(project);
      projectPayload.unisonADM = pDoc.getUnisonADM();
    } catch {
      // Non-blocking
    }

    // Cache metadata for 120 seconds
    await cacheService.set(cacheKey, projectPayload, 120);

    return { project: projectPayload };
  }

  /**
   * Get the project belonging to the authenticated student's team.
   * @param {string} userId
   * @returns {Object} { project }
   */
  async getMyProject(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    let effectiveTeamId = user.teamId;
    if (!effectiveTeamId) {
      // Reconcile missing or unlinked teamId by checking actual team membership records
      const membershipTeam = await Team.findOne({ members: user._id });
      if (membershipTeam) {
        effectiveTeamId = membershipTeam._id;
        user.teamId = membershipTeam._id;
        await user.save({ validateBeforeSave: false });
      }
    }

    if (!effectiveTeamId) {
      throw new AppError('You are not in a team or have no project.', 404, 'NO_TEAM');
    }

    const populateOpts = [
      {
        path: 'teamId',
        select:
          'name leaderId members memberRoles academicYear courseId sectionId adviserId secretaryId panelistIds googleDocUrl githubUrl',
        populate: [
          {
            path: 'leaderId',
            select: 'firstName middleName lastName email instructorId',
            populate: {
              path: 'instructorId',
              select: 'firstName middleName lastName email profilePicture',
            },
          },
          {
            path: 'members',
            select:
              'firstName middleName lastName email profilePicture role proponentRole capstoneRole',
          },
          {
            path: 'memberRoles.userId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'adviserId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'secretaryId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'panelistIds',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'sectionId',
            select: 'name code academicYear academicTerm capstoneCourse courseId createdBy',
            populate: [
              { path: 'createdBy', select: 'firstName middleName lastName email profilePicture' },
              { path: 'courseId', select: 'name code' },
            ],
          },
        ],
      },
      { path: 'adviserId', select: 'firstName middleName lastName email profilePicture' },
      { path: 'secretaryId', select: 'firstName middleName lastName email profilePicture' },
      { path: 'panelistIds', select: 'firstName middleName lastName email profilePicture' },
      { path: 'panelists.userId', select: 'firstName middleName lastName email profilePicture' },
      {
        path: 'sectionId',
        select: 'name code academicYear academicTerm capstoneCourse courseId createdBy',
        populate: [
          { path: 'createdBy', select: 'firstName middleName lastName email profilePicture' },
          { path: 'courseId', select: 'name code' },
        ],
      },
      { path: 'courseId', select: 'name code' },
      {
        path: 'memberRoleAssignments.userId',
        select: 'firstName middleName lastName email',
      },
    ];

    // Prefer the active (non-rejected) project; fall back to most-recent rejected
    let project = await Project.findOne({
      teamId: effectiveTeamId,
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    })
      .select('-textSidecar -rawExtractedData')
      .populate(populateOpts)
      .lean();

    if (!project) {
      project = await Project.findOne({ teamId: effectiveTeamId })
        .select('-textSidecar -rawExtractedData')
        .sort({ createdAt: -1 })
        .populate(populateOpts)
        .lean();
    }

    if (!project) {
      throw new AppError('Your team does not have a project yet.', 404, 'PROJECT_NOT_FOUND');
    }

    this._normalizeProjectADMPhase(project);
    return { project };
  }

  /**
   * List projects with filters and pagination (faculty-facing).
   * @param {Object} query - { page, limit, academicYear?, titleStatus?, projectStatus?, search?, adviserId? }
   * @returns {Object} { projects, pagination }
   */
  async listProjects(query) {
    const {
      page = 1,
      limit = 10,
      academicYear,
      titleStatus,
      projectStatus,
      capstonePhase,
      actionNeeded,
      search,
      adviserId,
      panelistId,
      secretaryId,
      excludeArchived,
      defenseStatus,
    } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (titleStatus) {
      filter.titleStatus = titleStatus;
    } else if (actionNeeded === 'true' || actionNeeded === true) {
      filter.titleStatus = { $in: ['submitted', 'revision_required', 'pending_modification'] };
    }
    if (projectStatus) filter.projectStatus = projectStatus;
    if (capstonePhase) {
      const phaseNum = Number(capstonePhase);
      if (phaseNum >= 3) {
        filter.capstonePhase = { $in: [3, 4] };
      } else {
        filter.capstonePhase = phaseNum;
      }
    }
    if (adviserId) filter.adviserId = adviserId;
    if (panelistId) filter.panelistIds = panelistId;

    if (defenseStatus) {
      if (defenseStatus === 'none' || defenseStatus === 'unscheduled') {
        filter.$or = [
          { 'defenseSchedule.status': { $exists: false } },
          { 'defenseSchedule.status': null },
          { 'defenseSchedule.status': '' },
        ];
      } else {
        filter['defenseSchedule.status'] = defenseStatus;
      }
    }

    if (excludeArchived === 'true' || excludeArchived === true) {
      filter.isArchived = { $ne: true };
      if (!filter.projectStatus) {
        filter.projectStatus = { $ne: PROJECT_STATUSES.ARCHIVED };
      }
    }

    const andClauses = [];
    if (secretaryId) {
      andClauses.push({
        $or: [{ secretaryId }, { 'panelists.userId': secretaryId, 'panelists.role': 'secretary' }],
      });
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      andClauses.push({
        $or: [{ title: regex }, { abstract: regex }, { keywords: regex }],
      });
    }

    if (andClauses.length === 1) {
      Object.assign(filter, andClauses[0]);
    } else if (andClauses.length > 1) {
      filter.$and = andClauses;
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .select('-textSidecar -rawExtractedData')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'teamId',
          select:
            'name leaderId members memberRoles academicYear courseId sectionId adviserId secretaryId panelistIds googleDocUrl githubUrl',
          populate: [
            {
              path: 'leaderId',
              select: 'firstName middleName lastName email instructorId',
              populate: {
                path: 'instructorId',
                select: 'firstName middleName lastName email profilePicture',
              },
            },
            {
              path: 'members',
              select:
                'firstName middleName lastName email profilePicture role proponentRole capstoneRole',
            },
            {
              path: 'memberRoles.userId',
              select: 'firstName middleName lastName email profilePicture',
            },
            {
              path: 'adviserId',
              select: 'firstName middleName lastName email profilePicture',
            },
            {
              path: 'secretaryId',
              select: 'firstName middleName lastName email profilePicture',
            },
            {
              path: 'panelistIds',
              select: 'firstName middleName lastName email profilePicture',
            },
          ],
        })
        .populate('adviserId', 'firstName middleName lastName email profilePicture')
        .populate('secretaryId', 'firstName middleName lastName email profilePicture')
        .populate('panelistIds', 'firstName middleName lastName email profilePicture')
        .populate('panelists.userId', 'firstName middleName lastName email profilePicture')
        .populate({
          path: 'sectionId',
          select: 'name code academicYear academicTerm capstoneCourse courseId createdBy',
          populate: [
            { path: 'createdBy', select: 'firstName middleName lastName email profilePicture' },
            { path: 'courseId', select: 'name code' },
          ],
        })
        .populate('courseId', 'name code')
        .populate('memberRoleAssignments.userId', 'firstName middleName lastName email')
        .lean(),
      Project.countDocuments(filter),
    ]);

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update the Gantt chart URL for a project.
   * Only a team member can perform this action.
   * @param {string} projectId
   * @param {string} userId - Requesting student (must be team member).
   * @param {Object} data - { ganttChartUrl }
   * @returns {Object} { project }
   */
  async updateGanttChartUrl(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);
    await this._assertTeamMember(project.teamId, userId);
    this._assertCapstone2ADMApproved(project);

    if (data.ganttChartUrl !== undefined) {
      project.ganttChartUrl = data.ganttChartUrl;
      await project.save();
      await this._invalidateProjectCache(project._id);
    }

    return { project };
  }

  async updateGanttPlan(projectId, userId, data, userRole) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);
    await this._assertGanttScheduleEditor(project, userId, userRole);
    this._assertCapstone2ADMApproved(project);

    const nextPlan = {
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      sections: Array.isArray(data.sections) ? data.sections : [],
      updatedAt: new Date(),
    };
    const previousHash = ganttScheduleHash(project.ganttPlan || {});
    const nextHash = ganttScheduleHash(nextPlan);
    const hasCurrentScheduleApproval = Boolean(
      project.ganttApproval?.approved && project.ganttApproval.scheduleHash === previousHash,
    );
    const previousProgressByTaskId = new Map(
      (project.ganttPlan?.tasks || []).map((task) => [
        String(task?.id || ''),
        Number(task?.progress) || 0,
      ]),
    );
    const addedProgress = nextPlan.tasks.some(
      (task) =>
        (Number(task?.progress) || 0) > (previousProgressByTaskId.get(String(task?.id || '')) || 0),
    );
    if ((!hasCurrentScheduleApproval || nextHash !== previousHash) && addedProgress) {
      throw new AppError(
        'The assigned Adviser must approve the Gantt schedule before daily progress can be recorded.',
        400,
        'GANTT_APPROVAL_REQUIRED',
      );
    }
    project.ganttPlan = nextPlan;

    if (previousHash !== nextHash && project.ganttApproval?.approved) {
      project.ganttApproval = {
        approved: false,
        approvedBy: null,
        approvedAt: null,
        scheduleHash: null,
        remarks: 'The schedule structure changed and needs adviser reapproval.',
      };
    }
    if (previousHash !== nextHash) this._invalidateSystemDefenseApproval(project);

    await project.save();
    await this._invalidateProjectCache(project._id);
    return { project };
  }

  _invalidateSystemDefenseApproval(project) {
    if (!project.systemDefenseApproval?.approved) return;
    project.systemDefenseApproval = {
      approved: false,
      reviewedBy: null,
      reviewedAt: null,
      remarks: 'System evidence changed and requires adviser reapproval.',
    };
  }

  async updateSystemDefenseApproval(projectId, reviewerId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);
    const assignedAdviserId = project.adviserId?._id || project.adviserId;
    const isAdviser = String(assignedAdviserId || '') === String(reviewerId);
    if (!isAdviser) {
      throw new AppError(
        'Only the assigned adviser can clear the system for defense.',
        403,
        'SYSTEM_CLEARANCE_FORBIDDEN',
      );
    }
    if (Number(project.capstonePhase) !== CAPSTONE_COURSES.CAPSTONE_2) {
      throw new AppError(
        'System defense clearance is only available during Capstone 2.',
        400,
        'WRONG_PHASE',
      );
    }
    const hasSystemEvidence = Boolean(
      project.githubRepoUrl && ((project.prototypes || []).length > 0 || project.demoVideoUrl),
    );
    const hasApprovedGantt = Boolean(
      project.ganttApproval?.approved &&
      project.ganttApproval.scheduleHash === ganttScheduleHash(project.ganttPlan || {}),
    );
    if (data.approved && !hasApprovedGantt) {
      throw new AppError(
        'The saved Gantt schedule must be approved before system defense clearance.',
        400,
        'GANTT_APPROVAL_REQUIRED',
      );
    }
    if (data.approved && !hasSystemEvidence) {
      throw new AppError(
        'The project GitHub repository and at least one demo or gallery artifact are required before clearance.',
        400,
        'SYSTEM_EVIDENCE_REQUIRED',
      );
    }
    if (data.approved) {
      const checkInBlocker = getWeeklyCheckInBlocker(project);
      if (checkInBlocker) {
        throw new AppError(checkInBlocker.message, 400, checkInBlocker.code);
      }
    }
    project.systemDefenseApproval = {
      approved: Boolean(data.approved),
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      remarks: typeof data.remarks === 'string' ? data.remarks.trim() : '',
    };
    await project.save();
    await this._invalidateProjectCache(project._id);
    return { project };
  }

  /**
   * Update the Demo Video URL (Google Drive link) for a project.
   * Only a team member can perform this action.
   * @param {string} projectId
   * @param {string} userId - Requesting student (must be team member).
   * @param {Object} data - { demoVideoUrl }
   * @returns {Object} { project }
   */
  async updateDemoVideoUrl(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);
    await this._assertTeamMember(project.teamId, userId);
    this._assertCapstone2ADMApproved(project);

    if (data.demoVideoUrl !== undefined) {
      const changed = project.demoVideoUrl !== data.demoVideoUrl;
      project.demoVideoUrl = data.demoVideoUrl;
      if (changed) this._invalidateSystemDefenseApproval(project);
      await project.save();
      await this._invalidateProjectCache(project._id);
    }

    return { project };
  }

  /**
   * Update the GitHub repository URL for a project.
   * Can be updated by team members, adviser, or instructor.
   * @param {string} projectId
   * @param {string} userId
   * @param {Object} data - { githubRepoUrl }
   * @returns {Object} { project }
   */
  async updateGithubRepoUrl(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);

    const team = await Team.findById(project.teamId);
    const isMember = team?.members?.some((id) => id.toString() === userId.toString());
    const isAdviser = project.adviserId && project.adviserId.toString() === userId.toString();
    const user = await User.findById(userId).select('role');
    const isInstructor = user?.role === ROLES.INSTRUCTOR;

    if (!isMember && !isAdviser && !isInstructor) {
      throw new AppError(
        'You do not have permission to update the project GitHub repository.',
        403,
        'FORBIDDEN',
      );
    }

    if (data.githubRepoUrl !== undefined) {
      const changed = project.githubRepoUrl !== data.githubRepoUrl;
      project.githubRepoUrl = data.githubRepoUrl;
      if (changed) this._invalidateSystemDefenseApproval(project);
      await project.save();
      await this._invalidateProjectCache(project._id);

      // Mirror to team if applicable
      if (team && (!team.githubUrl || team.githubUrl !== data.githubRepoUrl)) {
        team.githubUrl = data.githubRepoUrl;
        await team.save();
      }
    }

    return { project };
  }

  /**
   * Update the Google Doc manuscript URL for a project.
   * Can be updated by team members, assigned adviser, or instructor.
   * @param {string} projectId
   * @param {string} userId
   * @param {Object} data - { googleDocUrl }
   * @returns {Object} { project }
   */
  async updateGoogleDocUrl(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);

    const team = await Team.findById(project.teamId);
    const isMember = team?.members?.some((id) => id.toString() === userId.toString());
    const isAdviser = project.adviserId && project.adviserId.toString() === userId.toString();
    const user = await User.findById(userId).select('role');
    const isInstructor = user?.role === ROLES.INSTRUCTOR;

    if (!isMember && !isAdviser && !isInstructor) {
      throw new AppError(
        'You do not have permission to update the project Google Doc manuscript link.',
        403,
        'FORBIDDEN',
      );
    }

    if (data.googleDocUrl !== undefined) {
      project.googleDocUrl = data.googleDocUrl;
      await project.save();
      await this._invalidateProjectCache(project._id);

      // Mirror to team if applicable
      if (team && (!team.googleDocUrl || team.googleDocUrl !== data.googleDocUrl)) {
        team.googleDocUrl = data.googleDocUrl;
        await team.save();
      }
    }

    return { project };
  }

  /**
   * Update external links (Google Doc and/or GitHub Repo) simultaneously.
   * @param {string} projectId
   * @param {string} userId
   * @param {Object} data - { googleDocUrl, githubRepoUrl }
   * @returns {Object} { project }
   */
  async updateExternalLinks(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);

    const team = await Team.findById(project.teamId);
    const isMember = team?.members?.some((id) => id.toString() === userId.toString());
    const isAdviser = project.adviserId && project.adviserId.toString() === userId.toString();
    const user = await User.findById(userId).select('role');
    const isInstructor = user?.role === ROLES.INSTRUCTOR;

    if (!isMember && !isAdviser && !isInstructor) {
      throw new AppError(
        'You do not have permission to update the project external links.',
        403,
        'FORBIDDEN',
      );
    }

    let modified = false;
    let teamModified = false;

    if (data.googleDocUrl !== undefined) {
      project.googleDocUrl = data.googleDocUrl;
      modified = true;
      if (team && team.googleDocUrl !== data.googleDocUrl) {
        team.googleDocUrl = data.googleDocUrl;
        teamModified = true;
      }
    }

    if (data.githubRepoUrl !== undefined) {
      if (project.githubRepoUrl !== data.githubRepoUrl) {
        this._invalidateSystemDefenseApproval(project);
      }
      project.githubRepoUrl = data.githubRepoUrl;
      modified = true;
      if (team && team.githubUrl !== data.githubRepoUrl) {
        team.githubUrl = data.githubRepoUrl;
        teamModified = true;
      }
    }

    if (modified) await project.save();
    if (teamModified && team) await team.save();

    return { project };
  }

  /**
   * Approve or reject the Gantt chart schedule for Capstone 2.
   * Only assigned adviser or instructor can review and approve.
   * @param {string} projectId
   * @param {string} reviewerId - Adviser or Instructor ID
   * @param {Object} data - { approved: boolean, remarks: string }
   * @returns {Object} { project }
   */
  async updateGanttApproval(projectId, reviewerId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);

    const assignedAdviserId = project.adviserId?._id || project.adviserId;
    const isAdviser = String(assignedAdviserId || '') === String(reviewerId);

    if (!isAdviser) {
      throw new AppError(
        'Only the assigned project adviser can review and approve the Gantt chart schedule.',
        403,
        'NOT_ASSIGNED_ADVISER',
      );
    }

    if (Number(project.capstonePhase) !== CAPSTONE_COURSES.CAPSTONE_2) {
      throw new AppError(
        'Gantt schedule review is only available during Capstone 2.',
        400,
        'WRONG_PHASE',
      );
    }

    const hasReviewableSchedule = (project.ganttPlan?.tasks || []).some(
      (task) => String(task?.title || '').trim() && String(task?.section || '').trim(),
    );
    if (data.approved && !hasReviewableSchedule) {
      throw new AppError(
        'Save at least one named Gantt deliverable in a milestone section before approval.',
        400,
        'GANTT_PLAN_REQUIRED',
      );
    }

    const isApproved = Boolean(data.approved);
    const scheduleHash = isApproved ? ganttScheduleHash(project.ganttPlan || {}) : null;
    const scheduledCheckIns = isApproved
      ? buildWeeklyCheckInSchedule(project.ganttPlan || {}, scheduleHash)
      : [];
    if (isApproved && scheduledCheckIns.length === 0) {
      throw new AppError(
        'Add dated Gantt tasks before approving the schedule so weekly check-ins can be set.',
        400,
        'GANTT_WEEKLY_SCHEDULE_REQUIRED',
      );
    }
    project.ganttApproval = {
      approved: isApproved,
      approvedBy: reviewerId,
      approvedAt: new Date(),
      scheduleHash,
      remarks: typeof data.remarks === 'string' ? data.remarks.trim() : '',
    };

    if (isApproved) {
      const existing = new Set(
        (project.weeklyCheckIns || []).map(
          (checkIn) => `${checkIn.scheduleHash}:${checkIn.weekKey}`,
        ),
      );
      scheduledCheckIns.forEach((checkIn) => {
        const key = `${checkIn.scheduleHash}:${checkIn.weekKey}`;
        if (!existing.has(key)) project.weeklyCheckIns.push(checkIn);
      });
    }

    await project.save();
    await this._invalidateProjectCache(project._id);

    // Broadcast realtime event
    try {
      const { emitToRoom } = await import('../../../services/socket.service.js');
      emitToRoom(`project:${projectId}`, 'project:gantt_approval_updated', {
        projectId,
        ganttApproval: project.ganttApproval,
      });
    } catch {
      // Non-fatal
    }

    return { project };
  }

  async updateWeeklyCheckIn(projectId, userId, checkInId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);
    await this._assertTeamMember(project.teamId, userId);
    this._assertCapstone2ADMApproved(project);

    if (
      !project.ganttApproval?.approved ||
      project.ganttApproval.scheduleHash !== ganttScheduleHash(project.ganttPlan || {})
    ) {
      throw new AppError(
        'The adviser must approve the current Gantt schedule before weekly check-ins can be submitted.',
        400,
        'GANTT_APPROVAL_REQUIRED',
      );
    }

    const checkIn = project.weeklyCheckIns?.id(checkInId);
    if (!checkIn || checkIn.scheduleHash !== project.ganttApproval.scheduleHash) {
      throw new AppError(
        'Weekly check-in not found for the current Gantt schedule.',
        404,
        'CHECKIN_NOT_FOUND',
      );
    }
    if (['approved', 'awaiting_instructor_waiver'].includes(checkIn.status)) {
      throw new AppError('This weekly check-in is locked after review.', 409, 'CHECKIN_LOCKED');
    }

    const taskIds = new Set(checkIn.taskIds || []);
    const completedTaskIds = Array.isArray(data.completedTaskIds) ? data.completedTaskIds : [];
    if (completedTaskIds.some((taskId) => !taskIds.has(String(taskId)))) {
      throw new AppError(
        'Completed tasks must belong to this scheduled week.',
        400,
        'INVALID_CHECKIN_TASK',
      );
    }

    checkIn.summary = String(data.summary || '').trim();
    checkIn.progressPct = Number(data.progressPct) || 0;
    checkIn.completedTaskIds = completedTaskIds.map(String);
    checkIn.blockerNotes = String(data.blockerNotes || '').trim();
    checkIn.commitHash = String(data.commitHash || '').trim();
    checkIn.justification = String(data.justification || '').trim();

    if (data.submit !== false) {
      if (!checkIn.summary) {
        throw new AppError(
          'Add a short progress summary before submitting.',
          400,
          'CHECKIN_SUMMARY_REQUIRED',
        );
      }
      const now = new Date();
      checkIn.isLate = now > new Date(checkIn.dueAt);
      if (checkIn.isLate && !checkIn.justification) {
        throw new AppError(
          'This weekly check-in is overdue. Add an editable justification before submitting it.',
          400,
          'LATE_CHECKIN_JUSTIFICATION_REQUIRED',
        );
      }
      checkIn.status = 'submitted';
      checkIn.submittedAt = now;
      checkIn.adviserReview = {
        decision: 'pending',
        remarks: '',
        reviewedBy: null,
        reviewedAt: null,
      };
      checkIn.instructorWaiver = {
        decision: 'pending',
        remarks: '',
        reviewedBy: null,
        reviewedAt: null,
      };
    }

    if (typeof project.save === 'function') {
      await project.save({ validateModifiedOnly: true });
    }
    if (data.submit !== false) {
      await this._notifyTeamMembers(project.teamId, {
        type: 'weekly_checkin_submitted',
        title: 'Weekly progress check-in submitted',
        message: `The team submitted its progress check-in for the week of ${new Date(checkIn.weekStart).toISOString().slice(0, 10)}.`,
        metadata: { projectId: project._id, checkInId: checkIn._id },
      });
    }
    return { project, checkIn };
  }

  async reviewWeeklyCheckIn(projectId, reviewerId, checkInId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);
    if (String(project.adviserId?._id || project.adviserId || '') !== String(reviewerId)) {
      throw new AppError(
        'Only the assigned adviser can review this weekly check-in.',
        403,
        'NOT_ASSIGNED_ADVISER',
      );
    }
    if (Number(project.capstonePhase) !== CAPSTONE_COURSES.CAPSTONE_2) {
      throw new AppError(
        'Weekly check-in review is only available during Capstone 2.',
        400,
        'WRONG_PHASE',
      );
    }
    const checkIn = project.weeklyCheckIns?.id(checkInId);
    if (!checkIn || checkIn.status !== 'submitted') {
      throw new AppError(
        'Only submitted weekly check-ins can be reviewed.',
        409,
        'CHECKIN_NOT_REVIEWABLE',
      );
    }

    checkIn.adviserReview = {
      decision: data.decision,
      remarks: String(data.remarks || '').trim(),
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    };
    if (data.decision === 'revision_requested') {
      checkIn.status = 'revision_requested';
    } else {
      checkIn.status = checkIn.isLate ? 'awaiting_instructor_waiver' : 'approved';
    }

    if (typeof project.save === 'function') {
      await project.save({ validateModifiedOnly: true });
    }
    await this._notifyTeamMembers(project.teamId, {
      type: 'weekly_checkin_reviewed',
      title:
        checkIn.isLate && data.decision === 'approved'
          ? 'Instructor waiver required'
          : 'Weekly check-in reviewed',
      message:
        checkIn.isLate && data.decision === 'approved'
          ? 'The adviser accepted the late justification. The assigned instructor must issue a waiver before progression.'
          : `The adviser ${data.decision === 'approved' ? 'approved' : 'requested revisions to'} the weekly check-in.`,
      metadata: { projectId: project._id, checkInId: checkIn._id, status: checkIn.status },
    });
    return { project, checkIn };
  }

  async reviewWeeklyCheckInWaiver(projectId, reviewerId, checkInId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);
    const team = await Team.findById(project.teamId)
      .populate('leaderId', 'instructorId sectionId')
      .select('leaderId sectionId');
    let assignedInstructorId = team?.leaderId?.instructorId;
    const sectionId = team?.sectionId || team?.leaderId?.sectionId;
    if (!assignedInstructorId && sectionId) {
      const section = await Section.findById(sectionId).select('createdBy');
      assignedInstructorId = section?.createdBy;
    }
    if (String(assignedInstructorId?._id || assignedInstructorId || '') !== String(reviewerId)) {
      throw new AppError(
        'Only the assigned course instructor can issue this late waiver.',
        403,
        'NOT_ASSIGNED_INSTRUCTOR',
      );
    }
    const checkIn = project.weeklyCheckIns?.id(checkInId);
    if (!checkIn || checkIn.status !== 'awaiting_instructor_waiver') {
      throw new AppError(
        'This weekly check-in is not waiting for an instructor waiver.',
        409,
        'WAIVER_NOT_PENDING',
      );
    }

    checkIn.instructorWaiver = {
      decision: data.decision,
      remarks: String(data.remarks || '').trim(),
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    };
    checkIn.status = data.decision === 'granted' ? 'approved' : 'waiver_denied';
    if (typeof project.save === 'function') {
      await project.save({ validateModifiedOnly: true });
    }
    await this._notifyTeamMembers(project.teamId, {
      type: 'weekly_checkin_waiver_reviewed',
      title:
        data.decision === 'granted'
          ? 'Late check-in waiver granted'
          : 'Late check-in waiver denied',
      message:
        data.decision === 'granted'
          ? 'The instructor granted the weekly check-in waiver. Capstone 2 progression can continue once all due check-ins are approved.'
          : 'The instructor denied the weekly check-in waiver. Update the check-in justification and resubmit it for review.',
      metadata: { projectId: project._id, checkInId: checkIn._id, status: checkIn.status },
    });
    return { project, checkIn };
  }

  /* ═══════════════════ Title workflow ═══════════════════ */

  /**
   * Set or update chapter/proposal deadlines for a project.
   * @param {string} projectId
   * @param {Object} data - { chapter1?, chapter2?, chapter3?, proposal? }
   * @param {Object} requester - Authenticated requester context.
   * @returns {Object} { project }
   */
  async setDeadlines(projectId, data, requester) {
    const project = await this._getProjectOrFail(projectId);
    const applyToSection = data.applyToSection === true;
    if (!applyToSection) this._assertProjectWritable(project);
    const requesterId = requester?._id?.toString?.();

    if (applyToSection && requester?.role !== ROLES.INSTRUCTOR) {
      throw new AppError(
        'Only instructors can apply deadlines to an entire section.',
        403,
        'FORBIDDEN',
      );
    }

    if (
      !applyToSection &&
      [ROLES.ADVISER, ROLES.FACULTY].includes(requester?.role) &&
      (!project.adviserId ||
        String(project.adviserId?._id || project.adviserId) !== String(requesterId))
    ) {
      throw new AppError(
        'You can only update deadlines for projects assigned to you.',
        403,
        'FORBIDDEN',
      );
    }

    const targetProjects = applyToSection
      ? await Project.find({
          sectionId: project.sectionId,
          isArchived: { $ne: true },
          projectStatus: { $ne: PROJECT_STATUSES.ARCHIVED },
        })
      : [project];

    const dateFields = [
      'chapter1',
      'chapter2',
      'chapter3',
      'proposal',
      'chapter4',
      'chapter5',
      'finalAcademic',
      'finalJournal',
      'defense',
    ];

    let updatedProject = project;

    for (const targetProject of targetProjects) {
      if (!targetProject.deadlines) targetProject.deadlines = {};
      if (!Array.isArray(targetProject.deadlines.removed)) targetProject.deadlines.removed = [];
      if (!targetProject.deadlines.moved || typeof targetProject.deadlines.moved !== 'object') {
        targetProject.deadlines.moved = {};
      }

      dateFields.forEach((key) => {
        if (data[key] !== undefined) {
          const oldVal = targetProject.deadlines[key];
          const newVal = data[key];

          if (newVal === null || newVal === '' || newVal === 'unscheduled') {
            targetProject.deadlines[key] = null;
            if (!targetProject.deadlines.removed.includes(key)) {
              targetProject.deadlines.removed.push(key);
            }
            if (targetProject.deadlines.moved?.[key]) {
              delete targetProject.deadlines.moved[key];
            }
          } else {
            const newDate = new Date(newVal);
            if (!isNaN(newDate.getTime())) {
              if (oldVal && new Date(oldVal).getTime() !== newDate.getTime()) {
                targetProject.deadlines.moved[key] = {
                  oldDate: oldVal,
                  newDate,
                  movedAt: new Date(),
                };
              }
              targetProject.deadlines[key] = newDate;
              targetProject.deadlines.removed = targetProject.deadlines.removed.filter(
                (r) => r !== key,
              );
            }
          }
        }
      });

      if (Array.isArray(data.removed)) {
        data.removed.forEach((key) => {
          if (dateFields.includes(key)) {
            targetProject.deadlines[key] = null;
            if (!targetProject.deadlines.removed.includes(key)) {
              targetProject.deadlines.removed.push(key);
            }
            if (targetProject.deadlines.moved?.[key]) {
              delete targetProject.deadlines.moved[key];
            }
          }
        });
      }

      if (data.defense === null || data.defense === '') {
        if (targetProject.defenseSchedule) {
          targetProject.defenseSchedule.date = null;
          if (targetProject.defenseSchedule.status === 'scheduled') {
            targetProject.defenseSchedule.status = 'unscheduled';
          }
        }
      }

      // Sync TBA flags — fields marked TBA have their date cleared.
      if (data.tba !== undefined) {
        targetProject.deadlines.tba = data.tba;
        data.tba.forEach((key) => {
          targetProject.deadlines[key] = null;
        });
      }

      await targetProject.save();

      await this._notifyTeamMembers(targetProject.teamId, {
        type: 'system',
        title: 'Deadlines Updated',
        message: 'Your project deadlines have been updated. Please check the new schedule.',
        metadata: { projectId: targetProject._id },
      });

      if (targetProject._id.toString() === projectId.toString()) {
        updatedProject = targetProject;
      }
    }

    return { project: updatedProject };
  }

  /* ═══════════════ Project-Level Status ═══════════════ */

  /**
   * Reject a project entirely (instructor action).
   * Sets projectStatus to REJECTED — "Create Another Project" pathway.
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} data - { reason }
   * @returns {Object} { project }
   */
  async rejectProject(projectId, instructorId, data) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);

    project.projectStatus = PROJECT_STATUSES.REJECTED;
    project.rejectionReason = data.reason;
    await project.save();
    await this._invalidateProjectCache(project._id);

    await this._notifyTeamMembers(project.teamId, {
      type: 'project_rejected',
      title: 'Project Rejected',
      message: `Your project "${project.title}" has been rejected. Reason: ${data.reason}. You may create a new project.`,
      metadata: { projectId: project._id, rejectedBy: instructorId },
    });

    return { project };
  }

  /* ═══════════════ Capstone Phase Progression ═══════════════ */

  /**
   * Advance a project to the next capstone phase (instructor action).
   *
   * Phase transitions:
   * - 1 → 2: Requires Capstone 1 ADM, released passing evaluations, and an approved proposal.
   * - 2 → 3: Requires Capstone 2 ADM, released passing evaluations, and approved development gates.
   * - 3 → (none): Capstone 3 is the final course; archival is a separate lifecycle stage.
   *
   * @param {string} projectId
   * @param {string} instructorId - Requesting instructor
   * @returns {Object} { project, previousPhase, newPhase }
   */
  async advancePhase(projectId, instructorId) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);
    const currentPhase = Number(project.capstonePhase ?? CAPSTONE_COURSES.CAPSTONE_1);

    if (currentPhase >= CAPSTONE_COURSES.CAPSTONE_3) {
      throw new AppError(
        'This project is already in Capstone 3, the final course.',
        400,
        'ALREADY_FINAL_PHASE',
      );
    }
    const blocker = await this._getPhaseExitBlocker(project, currentPhase);
    if (blocker) throw new AppError(blocker.message, 400, blocker.code);

    const previousPhase = currentPhase;
    project.capstonePhase = Math.min(CAPSTONE_COURSES.CAPSTONE_3, currentPhase + 1);
    project.workflowPhase = Math.min(CAPSTONE_PHASES.PHASE_4, currentPhase + 2);
    project.capstoneCourse = `Capstone ${project.capstonePhase}`;
    project.stage = `capstone_${project.capstonePhase}`;
    project.admStatus = 'not_started';
    project.projectStatus = PROJECT_STATUSES.ACTIVE;
    await project.save();
    await this._invalidateProjectCache(project._id);

    try {
      await Team.findByIdAndUpdate(project.teamId, {
        $set: { currentCapstonePhase: project.capstonePhase },
      });
    } catch {
      // Non-blocking team sync
    }

    try {
      await cacheService.del(`project:meta:${project._id}`);
      await cacheService.del(`project:detail:${project._id}`);
    } catch {
      // Non-blocking cache eviction
    }

    try {
      emitToRoom(`project:${project._id}`, 'project:phase_advanced', {
        projectId: project._id,
        capstonePhase: project.capstonePhase,
        workflowPhase: project.workflowPhase,
        capstoneCourse: project.capstoneCourse,
      });
      emitToRoom(`project:${project._id}`, 'project:updated', { projectId: project._id });
    } catch {
      // Non-blocking socket emit
    }

    await this._notifyTeamMembers(project.teamId, {
      type: 'phase_advanced',
      title: 'Capstone Phase Advanced',
      message: `Your project "${project.title}" has advanced from Capstone ${previousPhase} to Capstone ${project.capstonePhase}.`,
      metadata: {
        projectId: project._id,
        previousPhase,
        newPhase: project.capstonePhase,
        advancedBy: instructorId,
      },
    });

    return { project, previousPhase, newPhase: project.capstonePhase };
  }

  async advanceAfterADMCompletion(project) {
    const currentPhase = Number(project?.capstonePhase ?? CAPSTONE_COURSES.CAPSTONE_1);
    if (currentPhase >= CAPSTONE_COURSES.CAPSTONE_3) return { advanced: false, project };

    const milestone = currentPhase === 1 ? 'CAPSTONE_1' : 'CAPSTONE_2';
    if (!isADMComplete(project, milestone)) return { advanced: false, project };

    project.admStatus = 'approved';
    const blocker = await this._getPhaseExitBlocker(project, currentPhase);
    if (blocker) return { advanced: false, project, blocker };

    const previousPhase = currentPhase;
    project.capstonePhase = Math.min(CAPSTONE_COURSES.CAPSTONE_3, currentPhase + 1);
    project.workflowPhase = Math.min(CAPSTONE_PHASES.PHASE_4, currentPhase + 2);
    project.capstoneCourse = `Capstone ${project.capstonePhase}`;
    project.stage = `capstone_${project.capstonePhase}`;
    project.admStatus = 'not_started';
    project.projectStatus = PROJECT_STATUSES.ACTIVE;
    if (typeof project.save === 'function') {
      await project.save({ validateModifiedOnly: true });
    }

    try {
      await Team.findByIdAndUpdate(project.teamId, {
        $set: { currentCapstonePhase: project.capstonePhase },
      });
    } catch {
      // Non-blocking team sync
    }

    try {
      await cacheService.del(`project:meta:${project._id}`);
      await cacheService.del(`project:detail:${project._id}`);
    } catch {
      // Non-blocking cache eviction
    }

    try {
      emitToRoom(`project:${project._id}`, 'project:phase_advanced', {
        projectId: project._id,
        capstonePhase: project.capstonePhase,
        workflowPhase: project.workflowPhase,
        capstoneCourse: project.capstoneCourse,
      });
      emitToRoom(`project:${project._id}`, 'project:updated', { projectId: project._id });
    } catch {
      // Non-blocking socket emit
    }

    await this._notifyTeamMembers(project.teamId, {
      type: 'phase_advanced',
      title: `Capstone ${project.capstonePhase} is ready`,
      message: `Your project "${project.title}" has completed Capstone ${previousPhase} and advanced to Capstone ${project.capstonePhase}.`,
      metadata: { projectId: project._id, previousPhase, newPhase: project.capstonePhase },
    });
    return { advanced: true, project, previousPhase, newPhase: project.capstonePhase };
  }

  /* ═══════════════ Prototype Showcasing ═══════════════ */

  /**
   * Add a prototype to a project (student/team leader action).
   * Prototype artifacts can only be added during Capstone 2.
   *
   * For media (image/video): pass file buffer, filename, etc.
   * For link: pass url in the data object.
   *
   * @param {string} projectId
   * @param {string} userId - Requesting student
   * @param {Object} data - { title, description?, type, url? }
   * @param {Object|null} file - multer file object (for media types)
   * @returns {Object} { project, prototype }
   */
  async addPrototype(projectId, userId, data, file = null) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);

    await this._assertTeamMember(project.teamId, userId);
    this._assertCapstone2ADMApproved(project);

    // System development artifacts are mutable only during Capstone 2.
    if (project.capstonePhase !== CAPSTONE_COURSES.CAPSTONE_2) {
      throw new AppError(
        'Prototypes can only be added during Capstone 2.',
        400,
        'INVALID_PHASE_FOR_PROTOTYPE',
      );
    }

    if (project.prototypes.length >= 20) {
      throw new AppError(
        'A project can have at most 20 prototypes.',
        400,
        'MAX_PROTOTYPES_REACHED',
      );
    }

    const prototypeData = {
      title: data.title,
      description: data.description || '',
      uploadedBy: userId,
    };

    // Determine prototype type and validate input
    if (data.type === PROTOTYPE_TYPES.LINK) {
      if (!data.url) {
        throw new AppError('A URL is required for link-type prototypes.', 400, 'URL_REQUIRED');
      }
      prototypeData.type = PROTOTYPE_TYPES.LINK;
      prototypeData.url = data.url;
    } else {
      if (!file) {
        throw new AppError('A file is required for media-type prototypes.', 400, 'FILE_REQUIRED');
      }
      const mime = file.validatedMime || file.mimetype;
      if (mime.startsWith('image/')) {
        prototypeData.type = PROTOTYPE_TYPES.IMAGE;
      } else if (mime.startsWith('video/')) {
        prototypeData.type = PROTOTYPE_TYPES.VIDEO;
      } else {
        throw new AppError(
          'Unsupported media type. Upload an image or video.',
          400,
          'UNSUPPORTED_MEDIA_TYPE',
        );
      }
    }

    // Push prototype to get its Mongoose subdocument _id
    this._invalidateSystemDefenseApproval(project);
    project.prototypes.push(prototypeData);
    const proto = project.prototypes[project.prototypes.length - 1];

    // Upload media file to S3 if present
    if (file && proto.type !== PROTOTYPE_TYPES.LINK) {
      const mime = file.validatedMime || file.mimetype;
      const key = storageService.buildPrototypeKey(
        project._id.toString(),
        proto._id.toString(),
        file.originalname,
      );

      try {
        await storageService.uploadFile(file.buffer, key, mime, {
          projectId: project._id.toString(),
          prototypeId: proto._id.toString(),
          uploadedBy: userId.toString(),
        });
      } catch (error) {
        // Remove the prototype from array since upload failed
        project.prototypes.pull(proto._id);
        if (error.isOperational) {
          console.error('[ProjectService] Prototype upload failed:', error.code, error.message);
          throw error;
        }
        console.error('[ProjectService] Unexpected prototype upload error:', error);
        throw new AppError(
          'Failed to upload prototype file. Please try again later.',
          500,
          'PROTOTYPE_UPLOAD_ERROR',
        );
      }

      proto.storageKey = key;
      proto.fileName = file.originalname;
      proto.fileSize = file.size;
      proto.mimeType = mime;
    }

    await project.save();
    await this._invalidateProjectCache(project._id);

    await this._notifyAdviser(project, {
      type: 'prototype_added',
      title: 'New Prototype Added',
      message: `A prototype "${data.title}" has been added to the project "${project.title}".`,
      metadata: { projectId: project._id, prototypeId: proto._id },
    });

    return { project, prototype: proto };
  }

  /**
   * Remove a prototype from a project (student/team member action).
   * Also deletes the associated file from S3 if it is a media-type prototype.
   *
   * @param {string} projectId
   * @param {string} prototypeId
   * @param {string} userId - Requesting student
   * @returns {Object} { project }
   */
  async removePrototype(projectId, prototypeId, userId) {
    const project = await this._getProjectOrFail(projectId);
    this._assertProjectWritable(project);

    await this._assertTeamMember(project.teamId, userId);
    this._assertCapstone2ADMApproved(project);

    const proto = project.prototypes.id(prototypeId);
    if (!proto) {
      throw new AppError('Prototype not found.', 404, 'PROTOTYPE_NOT_FOUND');
    }

    // Delete S3 file if media-type
    if (proto.storageKey) {
      try {
        await storageService.deleteFile(proto.storageKey);
      } catch (err) {
        // Log but don't block removal — orphaned S3 objects can be cleaned up later
        console.warn(`[Prototype] Failed to delete S3 object: ${proto.storageKey}`, err.message);
      }
    }

    project.prototypes.pull({ _id: prototypeId });
    this._invalidateSystemDefenseApproval(project);
    await project.save();
    await this._invalidateProjectCache(project._id);

    return { project };
  }

  /**
   * Get all prototypes for a project, with signed URLs for media types.
   *
   * @param {string} projectId
   * @param {string} userId - Requesting user
   * @returns {Object} { prototypes }
   */
  async getPrototypes(projectId, user) {
    const project = await this._getProjectOrFail(projectId);

    if (user?.role === ROLES.STUDENT || (typeof user === 'string' && user)) {
      const uid = user?._id || user?.id || user;
      await this._assertTeamMember(project.teamId, uid);
    }

    const prototypes = [];
    for (const proto of project.prototypes) {
      const item = proto.toObject();

      // Generate signed URL for media types
      if (item.storageKey) {
        try {
          item.signedUrl = await storageService.getSignedUrl(item.storageKey, 900);
        } catch {
          item.signedUrl = null;
        }
      }

      prototypes.push(item);
    }

    return { prototypes };
  }

  /* ═══════════════════ Archive & Completion ═══════════════════ */
}

export default new ProjectCoreService();
