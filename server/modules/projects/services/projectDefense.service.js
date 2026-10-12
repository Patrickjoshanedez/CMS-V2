import Project from '../project.model.js';
import Team from '../../teams/team.model.js';
import Notification from '../../notifications/notification.model.js';
import AppError from '../../../utils/AppError.js';
import { emitToRoom, emitToUser } from '../../../services/socket.service.js';

class ProjectDefenseService {
  /**
   * Schedule or update defense hearing for a project (Instructor only).
   */
  async scheduleDefense(projectId, data, user) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    const {
      date,
      time = '',
      venue = 'COT Conference Room',
      round = '1st',
      defenseType = 'midterm',
      clientName = 'Dr. Sales G. Aribe Jr.',
      status,
    } = data;

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

        const notifs = uniqueRecipients.map((uid) => ({
          userId: uid,
          type: 'defense_scheduled',
          title: 'Capstone 2 Defense Scheduled',
          message: `Defense hearing for "${project.title}" has been scheduled on ${dateStr} at ${project.defenseSchedule.time || '9:00 AM'} in ${project.defenseSchedule.venue}.`,
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
