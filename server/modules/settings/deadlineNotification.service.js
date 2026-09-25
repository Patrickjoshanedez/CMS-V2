/**
 * DeadlineNotificationService — Centralized notification dispatcher for milestone deadlines.
 * Handles:
 * 1. Immediate notification broadcast when instructors set or modify milestone deadlines.
 * 2. Automated background and on-demand deadline hit detection (when submissions hit the deadline date).
 * 3. Idempotent notification creation with real-time Socket.IO emission to affected students.
 */
import MilestoneDeadline from './milestoneDeadline.model.js';
import Notification from '../notifications/notification.model.js';
import User from '../users/user.model.js';
import Project from '../projects/project.model.js';
import Submission from '../submissions/submission.model.js';
import { emitToUser } from '../../services/socket.service.js';
import { ROLES, DELIVERABLE_TYPES } from '@cms/shared';

const DELIVERABLE_LABELS = {
  title_proposal: 'Title Proposal',
  chapter_1: 'Chapter 1',
  chapter_2: 'Chapter 2',
  chapter_3: 'Chapter 3',
  chapters_1_3: 'Chapters 1–3 Manuscript',
  chapter_4: 'Chapter 4',
  chapter_5: 'Chapter 5',
  full_prototype: 'Full System Prototype',
  final_manuscript: 'Final Manuscript (Chapters 1–5)',
  full_academic_paper: 'Full Academic Paper',
  condensed_journal_paper: 'Condensed Journal Paper',
};

export class DeadlineNotificationService {
  /**
   * Format deliverable key to human-readable label
   * @param {string} deliverable
   * @returns {string}
   */
  getDeliverableLabel(deliverable) {
    return DELIVERABLE_LABELS[deliverable] || deliverable.replace(/_/g, ' ');
  }

  /**
   * Format deadline date into user-friendly localized string
   * @param {Date|string} date
   * @returns {string}
   */
  formatDeadlineDate(date) {
    if (!date) return 'TBD';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Check if a project has already submitted the given deliverable
   * @param {Object} project
   * @param {string} deliverable
   * @returns {Promise<boolean>}
   */
  async isDeliverableSubmitted(project, deliverable) {
    if (!project?._id) return false;

    if (deliverable === 'title_proposal') {
      return Boolean(project.titleApproved || project.titleStatus === 'approved');
    }

    if (deliverable === 'chapter_1') {
      const sub = await Submission.findOne({
        projectId: project._id,
        type: 'chapter',
        chapter: 1,
        status: { $in: ['pending', 'under_review', 'approved'] },
      }).lean();
      return Boolean(sub);
    }

    if (deliverable === 'chapter_2') {
      const sub = await Submission.findOne({
        projectId: project._id,
        type: 'chapter',
        chapter: 2,
        status: { $in: ['pending', 'under_review', 'approved'] },
      }).lean();
      return Boolean(sub);
    }

    if (deliverable === 'chapter_3') {
      const sub = await Submission.findOne({
        projectId: project._id,
        type: 'chapter',
        chapter: 3,
        status: { $in: ['pending', 'under_review', 'approved'] },
      }).lean();
      return Boolean(sub);
    }

    if (deliverable === 'chapters_1_3') {
      const sub = await Submission.findOne({
        projectId: project._id,
        type: { $in: ['proposal', 'chapter'] },
        status: { $in: ['pending', 'under_review', 'approved'] },
      }).lean();
      return Boolean(sub);
    }

    if (deliverable === 'chapter_4') {
      const sub = await Submission.findOne({
        projectId: project._id,
        type: 'chapter',
        chapter: 4,
        status: { $in: ['pending', 'under_review', 'approved'] },
      }).lean();
      return Boolean(sub);
    }

    if (deliverable === 'chapter_5') {
      const sub = await Submission.findOne({
        projectId: project._id,
        type: 'chapter',
        chapter: 5,
        status: { $in: ['pending', 'under_review', 'approved'] },
      }).lean();
      return Boolean(sub);
    }

    if (deliverable === 'full_academic_paper') {
      const sub = await Submission.findOne({
        projectId: project._id,
        type: 'final_academic',
        status: { $in: ['pending', 'under_review', 'approved'] },
      }).lean();
      return Boolean(sub);
    }

    if (deliverable === 'condensed_journal_paper') {
      const sub = await Submission.findOne({
        projectId: project._id,
        type: 'final_journal',
        status: { $in: ['pending', 'under_review', 'approved'] },
      }).lean();
      return Boolean(sub);
    }

    if (deliverable === 'final_manuscript') {
      const sub = await Submission.findOne({
        projectId: project._id,
        type: { $in: ['final_academic', 'final_journal', 'chapter'] },
        status: { $in: ['pending', 'under_review', 'approved'] },
      }).lean();
      return Boolean(sub);
    }

    return false;
  }

  /**
   * Notify students when a milestone deadline is created or updated in Scheduling Center.
   * @param {Object} deadline - MilestoneDeadline document
   * @returns {Promise<number>} Dispatched notifications count
   */
  async notifyDeadlineScheduled(deadline) {
    if (!deadline) return 0;

    const studentQuery = { role: ROLES.STUDENT };
    if (deadline.targetType === 'section' && deadline.sectionId) {
      studentQuery.sectionId = deadline.sectionId;
    }

    const students = await User.find(studentQuery).select('_id firstName lastName email').lean();
    if (!students.length) return 0;

    const deliverableLabel = this.getDeliverableLabel(deadline.deliverable);
    const formattedDate = this.formatDeadlineDate(deadline.deadlineDate);

    const title = `Milestone Deadline Scheduled: ${deadline.title}`;
    const message = `A submission deadline for ${deliverableLabel} has been scheduled for ${formattedDate}. Check your project workspace for details.`;

    let count = 0;
    for (const student of students) {
      try {
        const notif = await Notification.create({
          userId: student._id,
          type: 'deadlines_set',
          title,
          message,
          metadata: {
            deadlineId: deadline._id,
            deliverable: deadline.deliverable,
            stage: deadline.stage,
            deadlineDate: deadline.deadlineDate,
            targetType: deadline.targetType,
            sectionId: deadline.sectionId,
          },
        });

        emitToUser(student._id, 'notification:new', notif);
        count++;
      } catch (err) {
        // Continue if single user notification fails
      }
    }

    return count;
  }

  /**
   * Check for deadlines that have reached or passed their deadlineDate,
   * and dispatch high-priority deadline notifications to affected students.
   * Idempotent: students only receive one deadline_due notification per milestone.
   *
   * @param {string|null} specificUserId - Optional: scope check to a single student (e.g. on notifications load)
   * @returns {Promise<{ deadlinesChecked: number, notificationsCreated: number }>}
   */
  async checkAndDispatchDueDeadlines(specificUserId = null) {
    const now = new Date();
    // Scan active deadlines where deadlineDate <= now (within last 30 days to avoid ancient records)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const deadlines = await MilestoneDeadline.find({
      deadlineDate: { $lte: now, $gte: thirtyDaysAgo },
    })
      .sort({ deadlineDate: -1 })
      .lean();

    if (!deadlines.length) {
      return { deadlinesChecked: 0, notificationsCreated: 0 };
    }

    let notificationsCreated = 0;

    for (const deadline of deadlines) {
      const studentQuery = { role: ROLES.STUDENT };
      if (specificUserId) {
        studentQuery._id = specificUserId;
      }
      if (deadline.targetType === 'section' && deadline.sectionId) {
        studentQuery.sectionId = deadline.sectionId;
      }

      const students = await User.find(studentQuery).select('_id teamId sectionId').lean();
      if (!students.length) continue;

      const deliverableLabel = this.getDeliverableLabel(deadline.deliverable);
      const formattedDate = this.formatDeadlineDate(deadline.deadlineDate);

      for (const student of students) {
        // Idempotency: verify student has not already received a deadline_due notice for this deadline
        const alreadyNotified = await Notification.findOne({
          userId: student._id,
          type: 'deadline_due',
          'metadata.deadlineId': deadline._id,
        }).lean();

        if (alreadyNotified) {
          continue;
        }

        // Check if student's project already submitted this deliverable
        let project = null;
        if (student.teamId) {
          project = await Project.findOne({ teamId: student.teamId }).lean();
        }
        if (!project) {
          project = await Project.findOne({ proponents: student._id }).lean();
        }

        const isSubmitted = await this.isDeliverableSubmitted(project, deadline.deliverable);

        let notifTitle = '';
        let notifMessage = '';

        if (!isSubmitted) {
          notifTitle = `Submission Deadline Reached: ${deadline.title}`;
          notifMessage = `The deadline for ${deliverableLabel} has arrived (${formattedDate}). ${
            deadline.allowLateSubmission
              ? 'Submissions are marked late and require justification.'
              : 'Submissions are now closed.'
          }`;
        } else {
          notifTitle = `Milestone Closed: ${deadline.title}`;
          notifMessage = `The submission window for ${deliverableLabel} closed on ${formattedDate}. Your team submission was on time.`;
        }

        try {
          const notif = await Notification.create({
            userId: student._id,
            type: 'deadline_due',
            title: notifTitle,
            message: notifMessage,
            metadata: {
              deadlineId: deadline._id,
              deliverable: deadline.deliverable,
              stage: deadline.stage,
              deadlineDate: deadline.deadlineDate,
              isLate: !isSubmitted,
              isSubmitted,
              projectId: project?._id || null,
            },
          });

          emitToUser(student._id, 'notification:new', notif);
          notificationsCreated++;
        } catch (err) {
          // Non-fatal per-student creation failure
        }
      }
    }

    return {
      deadlinesChecked: deadlines.length,
      notificationsCreated,
    };
  }
}

const deadlineNotificationService = new DeadlineNotificationService();
export default deadlineNotificationService;
