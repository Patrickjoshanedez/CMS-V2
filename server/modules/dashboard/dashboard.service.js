/**
 * DashboardService — role-aware aggregation for dashboard statistics.
 *
 * Each role gets a tailored snapshot of the system's current state:
 *   - Student: team info, project status, chapter progress, recent activity
 *   - Instructor: system-wide counts, pending approvals, recent submissions
 *   - Adviser: assigned projects, pending reviews, recent chapters
 *   - Panelist: assigned projects count, upcoming defenses
 */
import User from '../users/user.model.js';
import Team from '../teams/team.model.js';
import Project from '../projects/project.model.js';
import Submission from '../submissions/submission.model.js';
import Notification from '../notifications/notification.model.js';
import { ROLES, TITLE_STATUSES, SUBMISSION_STATUSES, PROJECT_STATUSES } from '@cms/shared';

class DashboardService {
  /**
   * Get dashboard statistics based on the user's role.
   * @param {Object} user - The authenticated user document.
   * @returns {Promise<Object>} Role-specific dashboard data.
   */
  async getStats(user) {
    switch (user.role) {
      case ROLES.STUDENT:
        return this._getStudentStats(user);
      case ROLES.INSTRUCTOR:
        return this._getInstructorStats(user);
      case ROLES.ADVISER:
        return this._getAdviserStats(user);
      case ROLES.PANELIST:
        return this._getPanelistStats(user);
      default:
        return { role: user.role, message: 'No dashboard data available.' };
    }
  }

  /**
   * Student dashboard — team info, project title status, chapter progress, recent notifications.
   */
  async _getStudentStats(user) {
    const [team, project, recentNotifications] = await Promise.all([
      user.teamId
        ? Team.findById(user.teamId).populate('members', 'firstName lastName email')
        : null,
      user.teamId ? Project.findOne({ teamId: user.teamId }) : null,
      Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // Build chapter progress map (Ch 1-5) if project exists
    let chapterProgress = [];
    if (project) {
      const latestSubmissions = await Submission.aggregate([
        { $match: { projectId: project._id } },
        { $sort: { chapter: 1, version: -1 } },
        {
          $group: {
            _id: '$chapter',
            status: { $first: '$status' },
            version: { $first: '$version' },
            updatedAt: { $first: '$updatedAt' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Map chapters 1-5 with their status
      chapterProgress = [1, 2, 3, 4, 5].map((ch) => {
        const sub = latestSubmissions.find((s) => s._id === ch);
        return {
          chapter: ch,
          status: sub ? sub.status : 'not_started',
          version: sub ? sub.version : 0,
          updatedAt: sub ? sub.updatedAt : null,
        };
      });
    }

    return {
      role: ROLES.STUDENT,
      team: team
        ? {
            _id: team._id,
            name: team.name,
            memberCount: team.members.length,
            isLocked: team.isLocked,
            members: team.members.map((m) => ({
              _id: m._id,
              firstName: m.firstName,
              lastName: m.lastName,
            })),
          }
        : null,
      project: project
        ? {
            _id: project._id,
            title: project.title,
            titleStatus: project.titleStatus,
            projectStatus: project.projectStatus,
            capstonePhase: project.capstonePhase,
            adviserId: project.adviserId,
            deadlines: project.deadlines,
          }
        : null,
      chapterProgress,
      recentNotifications,
    };
  }

  /**
   * Instructor dashboard — system-wide counts, pending title approvals, recent submissions.
   */
  async _getInstructorStats(user) {
    const [
      totalUsers,
      totalTeams,
      totalProjects,
      pendingTitles,
      recentSubmissions,
      projectsByStatus,
      recentNotifications,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Team.countDocuments(),
      Project.countDocuments(),
      Project.find({ titleStatus: TITLE_STATUSES.SUBMITTED })
        .populate('teamId', 'name')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean(),
      Submission.find({ status: SUBMISSION_STATUSES.PENDING })
        .populate('projectId', 'title teamId')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Project.aggregate([{ $group: { _id: '$projectStatus', count: { $sum: 1 } } }]),
      Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // Convert projectsByStatus array to object
    const statusCounts = {};
    for (const item of projectsByStatus) {
      statusCounts[item._id] = item.count;
    }

    return {
      role: ROLES.INSTRUCTOR,
      counts: {
        users: totalUsers,
        teams: totalTeams,
        projects: totalProjects,
        pendingTitles: pendingTitles.length,
      },
      pendingTitleApprovals: pendingTitles.map((p) => ({
        _id: p._id,
        title: p.title,
        teamName: p.teamId?.name || 'Unknown',
        updatedAt: p.updatedAt,
      })),
      recentSubmissions: recentSubmissions.map((s) => ({
        _id: s._id,
        chapter: s.chapter,
        version: s.version,
        projectTitle: s.projectId?.title || 'Unknown',
        fileName: s.fileName,
        createdAt: s.createdAt,
      })),
      projectsByStatus: statusCounts,
      recentNotifications,
    };
  }

  /**
   * Adviser dashboard — assigned projects, pending reviews, recent chapters.
   */
  async _getAdviserStats(user) {
    const [assignedProjects, pendingReviews, recentNotifications] = await Promise.all([
      Project.find({ adviserId: user._id })
        .populate('teamId', 'name members')
        .sort({ updatedAt: -1 })
        .lean(),
      // Find submissions that are pending/under_review for projects assigned to this adviser
      Submission.find({
        status: { $in: [SUBMISSION_STATUSES.PENDING, SUBMISSION_STATUSES.UNDER_REVIEW] },
      })
        .populate('projectId', 'title adviserId teamId')
        .sort({ createdAt: -1 })
        .lean()
        .then((subs) =>
          subs.filter((s) => s.projectId?.adviserId?.toString() === user._id.toString()),
        ),
      Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return {
      role: ROLES.ADVISER,
      assignedProjects: assignedProjects.map((p) => ({
        _id: p._id,
        title: p.title,
        titleStatus: p.titleStatus,
        projectStatus: p.projectStatus,
        teamName: p.teamId?.name || 'Unknown',
        memberCount: p.teamId?.members?.length || 0,
      })),
      pendingReviews: pendingReviews.map((s) => ({
        _id: s._id,
        chapter: s.chapter,
        version: s.version,
        status: s.status,
        projectTitle: s.projectId?.title || 'Unknown',
        fileName: s.fileName,
        createdAt: s.createdAt,
      })),
      counts: {
        assignedProjects: assignedProjects.length,
        pendingReviews: pendingReviews.length,
      },
      recentNotifications,
    };
  }

  /**
   * Panelist dashboard — assigned projects summary.
   */
  async _getPanelistStats(user) {
    const [assignedProjects, recentNotifications] = await Promise.all([
      Project.find({ panelistIds: user._id })
        .populate('teamId', 'name')
        .sort({ updatedAt: -1 })
        .lean(),
      Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return {
      role: ROLES.PANELIST,
      assignedProjects: assignedProjects.map((p) => ({
        _id: p._id,
        title: p.title,
        titleStatus: p.titleStatus,
        projectStatus: p.projectStatus,
        teamName: p.teamId?.name || 'Unknown',
      })),
      counts: {
        assignedProjects: assignedProjects.length,
      },
      recentNotifications,
    };
  }
}

export default new DashboardService();
