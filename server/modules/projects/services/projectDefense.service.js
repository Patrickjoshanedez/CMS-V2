import Project from '../project.model.js';
import Team from '../../teams/team.model.js';
import Notification from '../../notifications/notification.model.js';
import Submission from '../../submissions/submission.model.js';
import AppError from '../../../utils/AppError.js';
import cacheService from '../../../services/cache.service.js';
import { emitToRoom, emitToUser } from '../../../services/socket.service.js';
import { CAPSTONE_PHASES, DEFENSE_TYPES, resolveWorkflowPhase, TITLE_STATUSES } from '@cms/shared';
import { assertProjectWritable, ganttScheduleHash } from './projectCore.service.js';

class ProjectDefenseService {
  async _requireApprovedSubmission(projectId, type, chapter = null) {
    const query = { projectId, type };
    if (chapter !== null) query.chapter = chapter;
    const submission = await Submission.findOne(query).sort({ version: -1 }).select('status');
    if (!submission || !['approved', 'accepted', 'locked'].includes(submission.status)) {
      throw new AppError(
        'The required manuscript must be approved by the adviser before this defense can be scheduled.',
        400,
        'DEFENSE_MANUSCRIPT_NOT_APPROVED',
      );
    }
  }

  async _assertDefenseReadiness(project, requestedType) {
    const defenseType =
      requestedType === 'midterm'
        ? DEFENSE_TYPES.PROGRESS
        : requestedType === 'paper'
          ? DEFENSE_TYPES.FINAL
          : requestedType;

    const isTitleReviewHearing =
      defenseType === DEFENSE_TYPES.PROPOSAL &&
      project.titleStatus === TITLE_STATUSES.SUBMITTED &&
      Number(project.capstonePhase) === 1 &&
      resolveWorkflowPhase(project) === CAPSTONE_PHASES.PHASE_1;

    if (isTitleReviewHearing) {
      const team = await Team.findById(project.teamId);
      if (!team?.isLocked) {
        throw new AppError(
          'The team roster must be locked before scheduling its title hearing.',
          400,
          'TEAM_ROSTER_NOT_LOCKED',
        );
      }

      const panelistIds = (project.panelistIds || []).map((id) => String(id?._id || id));
      const committeeIds = [
        project.adviserId?._id || project.adviserId,
        project.secretaryId?._id || project.secretaryId,
        ...panelistIds,
      ]
        .filter(Boolean)
        .map(String);
      if (
        !project.secretaryId ||
        panelistIds.length !== 3 ||
        new Set(panelistIds).size !== 3 ||
        new Set(committeeIds).size !== committeeIds.length
      ) {
        throw new AppError(
          'A complete title hearing committee requires one secretary and three distinct panelists (adviser is appointed after title approval based on the capstone field).',
          400,
          'TITLE_HEARING_COMMITTEE_INCOMPLETE',
        );
      }

      return true;
    }

    if (project.titleStatus !== TITLE_STATUSES.APPROVED) {
      throw new AppError(
        'The project title must be approved before defense scheduling.',
        400,
        'TITLE_NOT_APPROVED',
      );
    }

    if (defenseType === DEFENSE_TYPES.PROPOSAL) {
      if (Number(project.capstonePhase) !== 1) {
        throw new AppError(
          'Capstone 1 proposal defense can only be scheduled during Capstone 1.',
          400,
          'WRONG_PHASE',
        );
      }
      await this._requireApprovedSubmission(project._id, 'proposal');
      return false;
    }

    if (defenseType === DEFENSE_TYPES.PROGRESS) {
      if (Number(project.capstonePhase) !== 2) {
        throw new AppError(
          'Capstone 2 system defense can only be scheduled during Capstone 2.',
          400,
          'WRONG_PHASE',
        );
      }
      if (
        !project.ganttApproval?.approved ||
        project.ganttApproval.scheduleHash !== ganttScheduleHash(project.ganttPlan || {}) ||
        !(project.ganttPlan?.tasks || []).length
      ) {
        throw new AppError(
          'The Capstone 2 Gantt plan needs adviser approval before scheduling.',
          400,
          'GANTT_APPROVAL_REQUIRED',
        );
      }
      if (!project.systemDefenseApproval?.approved) {
        throw new AppError(
          'The adviser must clear the working system before scheduling its defense.',
          400,
          'SYSTEM_DEFENSE_CLEARANCE_REQUIRED',
        );
      }
      return false;
    }

    if (defenseType === DEFENSE_TYPES.FINAL) {
      if (Number(project.capstonePhase) !== 3) {
        throw new AppError(
          'The final defense can only be scheduled during Capstone 3.',
          400,
          'WRONG_PHASE',
        );
      }
      for (const chapter of [1, 2, 3, 4, 5]) {
        await this._requireApprovedSubmission(project._id, 'chapter', chapter);
      }
      await this._requireApprovedSubmission(project._id, 'final_academic');
      await this._requireApprovedSubmission(project._id, 'final_journal');
      return false;
    }

    throw new AppError('Unknown defense type.', 400, 'INVALID_DEFENSE_TYPE');
  }

  /**
   * Schedule or update defense hearing for a project (Instructor only).
   */
  async scheduleDefense(projectId, data, user) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }
    assertProjectWritable(project);

    const {
      date,
      time = '',
      venue = 'COT Conference Room',
      round = '1st',
      defenseType = 'midterm',
      clientName = 'Dr. Sales G. Aribe Jr.',
      status,
    } = data;

    const isClearingRequest =
      ['pending_scheduling', 'unscheduled', 'cancelled'].includes(status) ||
      date === null ||
      date === '';
    const isTitleReviewHearing = !isClearingRequest
      ? await this._assertDefenseReadiness(project, defenseType)
      : false;

    const isClearingSchedule =
      status === 'pending_scheduling' ||
      status === 'unscheduled' ||
      status === 'cancelled' ||
      date === null ||
      date === '' ||
      (date === undefined && (!project.defenseSchedule?.date || status === 'pending_scheduling'));

    const targetStatus = isClearingSchedule
      ? status === 'pending_scheduling'
        ? 'pending_scheduling'
        : 'unscheduled'
      : status || 'scheduled';

    const scheduledDate = isClearingSchedule
      ? null
      : date !== undefined
        ? date
          ? new Date(date)
          : null
        : project.defenseSchedule?.date;

    const previousSchedule = project.defenseSchedule
      ? { ...(project.defenseSchedule.toObject?.() || project.defenseSchedule) }
      : null;

    project.defenseSchedule = {
      date: scheduledDate,
      time: isClearingSchedule ? '' : time || project.defenseSchedule?.time || '',
      venue: isClearingSchedule
        ? ''
        : venue || project.defenseSchedule?.venue || 'COT Conference Room',
      round: round || project.defenseSchedule?.round || '1st',
      defenseType: defenseType || project.defenseSchedule?.defenseType || 'midterm',
      clientName: isClearingSchedule
        ? ''
        : clientName || project.defenseSchedule?.clientName || 'Dr. Sales G. Aribe Jr.',
      scheduledBy: user._id,
      scheduledAt: isClearingSchedule ? null : new Date(),
      status: targetStatus,
    };

    const updateOps = {
      $set: {
        defenseSchedule: project.defenseSchedule,
      },
    };

    if (scheduledDate) {
      if (!project.deadlines) project.deadlines = {};
      const previousDate = previousSchedule?.date || project.deadlines.defense;
      const isMoved =
        previousDate && new Date(previousDate).getTime() !== new Date(scheduledDate).getTime();

      project.deadlines.defense = scheduledDate;
      updateOps.$set['deadlines.defense'] = scheduledDate;

      if (!updateOps.$pull) updateOps.$pull = {};
      updateOps.$pull['deadlines.removed'] = 'defense';
      if (project.deadlines.removed) {
        project.deadlines.removed = project.deadlines.removed.filter((r) => r !== 'defense');
      }

      if (isMoved) {
        updateOps.$set['deadlines.moved.defense'] = {
          oldDate: previousDate,
          newDate: scheduledDate,
          movedAt: new Date(),
        };
      }
    } else {
      if (!project.deadlines) project.deadlines = {};
      delete project.deadlines.defense;
      if (!project.deadlines.removed) project.deadlines.removed = [];
      if (!project.deadlines.removed.includes('defense')) {
        project.deadlines.removed.push('defense');
      }
      if (!updateOps.$unset) updateOps.$unset = {};
      updateOps.$unset['deadlines.defense'] = '';

      if (project.deadlines?.moved?.defense) {
        delete project.deadlines.moved.defense;
        updateOps.$unset['deadlines.moved.defense'] = '';
      }

      if (!updateOps.$addToSet) updateOps.$addToSet = {};
      updateOps.$addToSet['deadlines.removed'] = 'defense';
    }

    await Project.findByIdAndUpdate(projectId, updateOps);

    // Broadcast WebSocket event
    try {
      const eventName = isClearingSchedule
        ? 'project:defense_unscheduled'
        : 'project:defense_scheduled';
      emitToRoom(`project:${projectId}`, eventName, {
        projectId,
        defenseSchedule: project.defenseSchedule,
      });
      if (isClearingSchedule) {
        emitToRoom(`project:${projectId}`, 'project:defense_scheduled', {
          projectId,
          defenseSchedule: project.defenseSchedule,
        });
      }
    } catch {
      // Non-blocking
    }

    // Dispatch notifications
    try {
      const recipients = [
        ...(project.panelistIds || []),
        project.adviserId,
        project.secretaryId,
      ].filter(Boolean);

      const team = await Team.findById(project.teamId);
      if (team?.members?.length) {
        recipients.push(...team.members);
      }

      const uniqueRecipients = [...new Set(recipients.map((r) => String(r?._id || r)))];
      if (isClearingSchedule) {
        const unscheduledNotifs = uniqueRecipients.map((uid) => ({
          userId: uid,
          type: 'defense_unscheduled',
          title: 'Capstone Defense Hearing Postponed / Unscheduled',
          message: `The defense hearing schedule for "${project.title}" has been removed.`,
          metadata: { projectId: project._id, defenseSchedule: project.defenseSchedule },
        }));

        if (unscheduledNotifs.length > 0) {
          const createdNotifs = await Notification.insertMany(unscheduledNotifs);
          createdNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
        }
      } else {
        const dateStr = scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'TBA';
        const phaseNum = Number(project.capstonePhase ?? 1);
        const defensePhaseLabel =
          defenseType === 'proposal'
            ? 'Capstone 1 Proposal Defense'
            : defenseType === 'final'
              ? 'Capstone 3 Final Defense'
              : phaseNum === 1
                ? 'Capstone 1 Proposal Defense'
                : phaseNum === 3
                  ? 'Capstone 3 Final Defense'
                  : 'Capstone 2 System Defense';

        const notifs = uniqueRecipients.map((uid) => ({
          userId: uid,
          type: isTitleReviewHearing ? 'title_hearing_scheduled' : 'defense_scheduled',
          title: isTitleReviewHearing
            ? 'Title Proposal Hearing Scheduled'
            : `${defensePhaseLabel} Scheduled`,
          message: isTitleReviewHearing
            ? `The title proposal hearing for "${project.title}" has been scheduled on ${dateStr} at ${project.defenseSchedule.time || '9:00 AM'} in ${project.defenseSchedule.venue}.`
            : `${defensePhaseLabel} hearing for "${project.title}" has been scheduled on ${dateStr} at ${project.defenseSchedule.time || '9:00 AM'} in ${project.defenseSchedule.venue}.`,
          metadata: { projectId: project._id, defenseSchedule: project.defenseSchedule },
        }));

        // Idempotency check: skip sending duplicate notifications if already scheduled with identical details
        const isExactSameSchedule =
          previousSchedule?.status === 'scheduled' &&
          previousSchedule?.date &&
          scheduledDate &&
          new Date(previousSchedule.date).toISOString().split('T')[0] ===
            new Date(scheduledDate).toISOString().split('T')[0] &&
          previousSchedule?.time === project.defenseSchedule.time &&
          previousSchedule?.venue === project.defenseSchedule.venue;

        if (!isExactSameSchedule && notifs.length > 0) {
          const createdNotifs = await Notification.insertMany(notifs);
          createdNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
        }
      }
    } catch {
      // Non-blocking
    }

    try {
      await cacheService.del(`project:meta:${projectId}`);
      await cacheService.del(`project:detail:${projectId}`);
    } catch {
      // Non-blocking cache eviction
    }

    return {
      defenseSchedule: project.defenseSchedule,
      project: {
        _id: project._id,
        title: project.title,
        defenseSchedule: project.defenseSchedule,
      },
    };
  }

  /**
   * Get defense schedule for a project.
   */
  async getDefenseSchedule(projectId) {
    const project = await Project.findById(projectId)
      .select('title defenseSchedule deadlines adviserId secretaryId panelists panelistIds teamId')
      .populate('adviserId', 'firstName lastName email')
      .populate('secretaryId', 'firstName lastName email')
      .populate('panelists.userId', 'firstName lastName email');

    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    return {
      defenseSchedule: project.defenseSchedule,
      deadlines: project.deadlines,
      project: {
        _id: project._id,
        title: project.title,
        adviser: project.adviserId,
        secretary: project.secretaryId,
        panelists: project.panelists,
      },
    };
  }
}

export default new ProjectDefenseService();
