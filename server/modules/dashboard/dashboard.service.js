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
import Evaluation from '../evaluations/evaluation.model.js';
import Notification from '../notifications/notification.model.js';
import { WorkloadOptimizationContext } from '../optimization/WorkloadOptimizationContext.js';
import {
  ROLES,
  TITLE_STATUSES,
  SUBMISSION_STATUSES,
  PROJECT_STATUSES,
  EVALUATION_STATUSES,
} from '@cms/shared';

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
    const adviserProjectIds = await Project.find({ adviserId: user._id })
      .select('_id')
      .lean()
      .then((projects) => projects.map((p) => p._id));

    const [assignedProjects, pendingReviews, recentNotifications] = await Promise.all([
      Project.find({ adviserId: user._id })
        .populate('teamId', 'name members')
        .sort({ updatedAt: -1 })
        .lean(),
      adviserProjectIds.length > 0
        ? Submission.find({
            projectId: { $in: adviserProjectIds },
            status: { $in: [SUBMISSION_STATUSES.PENDING, SUBMISSION_STATUSES.UNDER_REVIEW] },
          })
            .populate('projectId', 'title')
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve([]),
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
        activeProjects: assignedProjects.filter((p) => p.projectStatus === PROJECT_STATUSES.ACTIVE)
          .length,
      },
      recentNotifications,
    };
  }

  /**
   * Phase 2: Get adviser's detailed workload with deadline awareness.
   * @param {string} adviserId
   * @returns {Promise<Object>}
   */
  async getAdviserWorkload(adviserId) {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const adviserProjectIds = await Project.find({ adviserId })
      .select('_id')
      .lean()
      .then((projects) => projects.map((p) => p._id));

    if (adviserProjectIds.length === 0) {
      return {
        awaitingReview: [],
        underReview: [],
        overdue: [],
        upcomingDeadline: [],
        summary: {
          totalToReview: 0,
          currentlyReviewing: 0,
          overdue: 0,
          upcomingDeadline: 0,
        },
      };
    }

    const submissions = await Submission.find({ projectId: { $in: adviserProjectIds } })
      .populate({
        path: 'projectId',
        select: 'title teamId',
        populate: { path: 'teamId', select: 'name' },
      })
      .populate('submittedBy', 'firstName lastName')
      .sort({ submittedAt: -1 })
      .lean();

    const awaitingReview = submissions.filter((s) => s.status === SUBMISSION_STATUSES.PENDING);
    const underReview = submissions.filter(
      (s) =>
        s.status === SUBMISSION_STATUSES.UNDER_REVIEW ||
        s.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED,
    );
    const overdue = underReview.filter((s) => s.revisionDeadline && s.revisionDeadline < now);
    const upcomingDeadline = underReview.filter(
      (s) =>
        s.revisionDeadline && s.revisionDeadline >= now && s.revisionDeadline <= sevenDaysLater,
    );

    const calculateDaysRemaining = (deadline) => {
      if (!deadline) return null;
      return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    };

    return {
      awaitingReview: awaitingReview.map((s) => ({
        _id: s._id,
        chapter: s.chapter,
        version: s.version,
        status: s.status,
        projectTitle: s.projectId?.title || 'Unknown',
        teamName: s.projectId?.teamId?.name || 'Unknown Team',
        submittedBy: s.submittedBy
          ? `${s.submittedBy.firstName} ${s.submittedBy.lastName}`
          : 'Unknown',
        submittedAt: s.submittedAt,
        annotationCount: s.annotations?.length || 0,
      })),
      underReview: underReview.map((s) => ({
        _id: s._id,
        chapter: s.chapter,
        version: s.version,
        status: s.status,
        projectTitle: s.projectId?.title || 'Unknown',
        teamName: s.projectId?.teamId?.name || 'Unknown Team',
        submittedBy: s.submittedBy
          ? `${s.submittedBy.firstName} ${s.submittedBy.lastName}`
          : 'Unknown',
        reviewedAt: s.reviewedAt,
        revisionDeadline: s.revisionDeadline,
        daysRemaining: calculateDaysRemaining(s.revisionDeadline),
        annotationCount: s.annotations?.length || 0,
      })),
      overdue: overdue.map((s) => ({
        _id: s._id,
        chapter: s.chapter,
        projectTitle: s.projectId?.title || 'Unknown',
        submittedBy: s.submittedBy
          ? `${s.submittedBy.firstName} ${s.submittedBy.lastName}`
          : 'Unknown',
        daysOverdue: Math.abs(calculateDaysRemaining(s.revisionDeadline) ?? 0),
        revisionDeadline: s.revisionDeadline,
      })),
      upcomingDeadline: upcomingDeadline.map((s) => ({
        _id: s._id,
        chapter: s.chapter,
        projectTitle: s.projectId?.title || 'Unknown',
        daysRemaining: calculateDaysRemaining(s.revisionDeadline),
        revisionDeadline: s.revisionDeadline,
      })),
      summary: {
        totalToReview: awaitingReview.length,
        currentlyReviewing: underReview.length,
        overdue: overdue.length,
        upcomingDeadline: upcomingDeadline.length,
      },
    };
  }

  /**
   * Phase 2: Get adviser review analytics.
   * @param {string} adviserId
   * @returns {Promise<Object>}
   */
  async getAdviserAnalytics(adviserId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const adviserProjectIds = await Project.find({ adviserId })
      .select('_id')
      .lean()
      .then((projects) => projects.map((p) => p._id));

    if (adviserProjectIds.length === 0) {
      return {
        period: 'Last 30 days',
        metrics: {
          totalReviewed: 0,
          approved: 0,
          revisionRequested: 0,
          rejected: 0,
          approvalRatePercent: 0,
          avgReviewTimeHours: 0,
          reviewVelocityPerDay: 0,
        },
        breakdown: {
          approved: { count: 0, percentage: 0 },
          revisionRequested: { count: 0, percentage: 0 },
          rejected: { count: 0, percentage: 0 },
        },
      };
    }

    const reviewedSubmissions = await Submission.find({
      projectId: { $in: adviserProjectIds },
      reviewedAt: { $gte: thirtyDaysAgo },
    }).lean();

    const approved = reviewedSubmissions.filter(
      (s) => s.status === SUBMISSION_STATUSES.APPROVED,
    ).length;
    const revisionRequested = reviewedSubmissions.filter(
      (s) => s.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED,
    ).length;
    const rejected = reviewedSubmissions.filter(
      (s) => s.status === SUBMISSION_STATUSES.REJECTED,
    ).length;

    const totalReviewed = reviewedSubmissions.length;
    const approvalRatePercent = totalReviewed > 0 ? (approved / totalReviewed) * 100 : 0;

    let totalReviewTimeHours = 0;
    let timedEntries = 0;
    reviewedSubmissions.forEach((s) => {
      if (s.submittedAt && s.reviewedAt) {
        totalReviewTimeHours +=
          (new Date(s.reviewedAt) - new Date(s.submittedAt)) / (1000 * 60 * 60);
        timedEntries += 1;
      }
    });

    const avgReviewTimeHours = timedEntries > 0 ? totalReviewTimeHours / timedEntries : 0;
    const reviewVelocityPerDay = totalReviewed / 30;

    return {
      period: 'Last 30 days',
      metrics: {
        totalReviewed,
        approved,
        revisionRequested,
        rejected,
        approvalRatePercent: Number(approvalRatePercent.toFixed(2)),
        avgReviewTimeHours: Number(avgReviewTimeHours.toFixed(2)),
        reviewVelocityPerDay: Number(reviewVelocityPerDay.toFixed(2)),
      },
      breakdown: {
        approved: {
          count: approved,
          percentage: Number((totalReviewed > 0 ? (approved / totalReviewed) * 100 : 0).toFixed(2)),
        },
        revisionRequested: {
          count: revisionRequested,
          percentage: Number(
            (totalReviewed > 0 ? (revisionRequested / totalReviewed) * 100 : 0).toFixed(2),
          ),
        },
        rejected: {
          count: rejected,
          percentage: Number((totalReviewed > 0 ? (rejected / totalReviewed) * 100 : 0).toFixed(2)),
        },
      },
    };
  }

  /**
   * Phase 3: List panelist topic cards (assigned + available projects).
   * @param {string} panelistId
   * @returns {Promise<Object>}
   */
  async getPanelistTopics(panelistId) {
    const [assignedProjects, availableProjects] = await Promise.all([
      Project.find({ panelistIds: panelistId })
        .populate('teamId', 'name members')
        .populate('adviserId', 'firstName lastName')
        .sort({ updatedAt: -1 })
        .lean(),
      Project.find({
        panelistIds: { $ne: panelistId },
        projectStatus: PROJECT_STATUSES.ACTIVE,
      })
        .populate('teamId', 'name members')
        .populate('adviserId', 'firstName lastName')
        .sort({ updatedAt: -1 })
        .limit(30)
        .lean(),
    ]);

    const toCard = (project, isAssigned) => ({
      _id: project._id,
      title: project.title,
      titleStatus: project.titleStatus,
      projectStatus: project.projectStatus,
      capstonePhase: project.capstonePhase,
      team: {
        name: project.teamId?.name || 'Unknown Team',
        memberCount: project.teamId?.members?.length || 0,
      },
      adviser: project.adviserId
        ? `${project.adviserId.firstName} ${project.adviserId.lastName}`
        : 'Unassigned Adviser',
      panelistCount: project.panelistIds?.length || 0,
      hasSlot: (project.panelistIds?.length || 0) < 3,
      isAssigned,
      updatedAt: project.updatedAt,
    });

    return {
      assigned: assignedProjects.map((p) => toCard(p, true)),
      available: availableProjects
        .filter((p) => (p.panelistIds?.length || 0) < 3)
        .map((p) => toCard(p, false)),
      summary: {
        assigned: assignedProjects.length,
        available: availableProjects.filter((p) => (p.panelistIds?.length || 0) < 3).length,
      },
    };
  }

  /**
   * Phase 3: Assign a panelist to a project topic.
   * @param {string} projectId
   * @param {string} panelistId
   * @returns {Promise<Object>}
   */
  async selectPanelistTopic(projectId, panelistId) {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new Error('Project not found.');
    }

    if (project.projectStatus !== PROJECT_STATUSES.ACTIVE) {
      throw new Error('Only active projects can be selected.');
    }

    const alreadyAssigned = project.panelistIds.some(
      (id) => id.toString() === panelistId.toString(),
    );
    if (alreadyAssigned) {
      return {
        alreadyAssigned: true,
        project: {
          _id: project._id,
          title: project.title,
          panelistCount: project.panelistIds.length,
        },
      };
    }

    if (project.panelistIds.length >= 3) {
      throw new Error('This project has reached the maximum number of panelists.');
    }

    project.panelistIds.push(panelistId);
    await project.save();

    return {
      alreadyAssigned: false,
      project: {
        _id: project._id,
        title: project.title,
        panelistCount: project.panelistIds.length,
      },
    };
  }

  /**
   * Phase 4: Instructor KPI aggregates for command center.
   * @returns {Promise<Object>}
   */
  async getInstructorKpis() {
    const [totalProjects, activeProjects, completedProjects, submissions, evaluations] =
      await Promise.all([
        Project.countDocuments(),
        Project.countDocuments({ projectStatus: PROJECT_STATUSES.ACTIVE }),
        Project.countDocuments({ projectStatus: PROJECT_STATUSES.ARCHIVED }),
        Submission.find().select('submittedAt reviewedAt status').lean(),
        Evaluation.find().select('score').lean(),
      ]);

    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

    const reviewed = submissions.filter((s) => !!s.reviewedAt);
    const avgTurnaroundHours = reviewed.length
      ? reviewed.reduce((acc, s) => {
          const turnaround = (new Date(s.reviewedAt) - new Date(s.submittedAt)) / (1000 * 60 * 60);
          return acc + (Number.isFinite(turnaround) ? turnaround : 0);
        }, 0) / reviewed.length
      : 0;

    const avgEvaluationScore = evaluations.length
      ? evaluations.reduce((acc, e) => acc + (Number(e.score) || 0), 0) / evaluations.length
      : 0;

    return {
      totals: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalSubmissions: submissions.length,
      },
      performance: {
        completionRatePercent: Number(completionRate.toFixed(2)),
        avgReviewTurnaroundHours: Number(avgTurnaroundHours.toFixed(2)),
        avgEvaluationScore: Number(avgEvaluationScore.toFixed(2)),
      },
      pipeline: {
        pendingSubmissions: submissions.filter((s) => s.status === SUBMISSION_STATUSES.PENDING)
          .length,
        underReview: submissions.filter(
          (s) =>
            s.status === SUBMISSION_STATUSES.UNDER_REVIEW ||
            s.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED,
        ).length,
        approved: submissions.filter((s) => s.status === SUBMISSION_STATUSES.APPROVED).length,
      },
    };
  }

  /**
   * Phase 4: Cross-adviser workload matrix.
   * @returns {Promise<Object>}
   */
  async getInstructorWorkload() {
    const advisers = await User.find({ role: ROLES.ADVISER, isActive: true })
      .select('firstName lastName')
      .lean();

    const adviserRows = await Promise.all(
      advisers.map(async (adviser) => {
        const projectIds = await Project.find({ adviserId: adviser._id }).select('_id').lean();
        const ids = projectIds.map((p) => p._id);

        if (ids.length === 0) {
          return {
            adviserId: adviser._id,
            adviserName: `${adviser.firstName} ${adviser.lastName}`,
            projectCount: 0,
            pending: 0,
            revisions: 0,
            overdue: 0,
            workloadScore: 0,
          };
        }

        const submissions = await Submission.find({ projectId: { $in: ids } })
          .select('status revisionDeadline')
          .lean();

        const now = new Date();
        const pending = submissions.filter((s) => s.status === SUBMISSION_STATUSES.PENDING).length;
        const revisions = submissions.filter(
          (s) => s.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED,
        ).length;
        const overdue = submissions.filter(
          (s) => s.revisionDeadline && new Date(s.revisionDeadline) < now,
        ).length;
        const workloadScore = pending * 2 + revisions * 1.5 + overdue * 3;

        return {
          adviserId: adviser._id,
          adviserName: `${adviser.firstName} ${adviser.lastName}`,
          projectCount: ids.length,
          pending,
          revisions,
          overdue,
          workloadScore: Number(workloadScore.toFixed(2)),
        };
      }),
    );

    adviserRows.sort((a, b) => b.workloadScore - a.workloadScore);

    return {
      advisers: adviserRows,
      summary: {
        adviserCount: adviserRows.length,
        averageScore:
          adviserRows.length > 0
            ? Number(
                (
                  adviserRows.reduce((acc, row) => acc + row.workloadScore, 0) / adviserRows.length
                ).toFixed(2),
              )
            : 0,
      },
    };
  }

  /**
   * Phase 4: Suggest balancing actions for adviser workload.
   *
   * Delegates to the Strategy Design Pattern via WorkloadOptimizationContext.
   * The active strategy is resolved from the provided `mode` parameter, which
   * maps to the current academic phase. If no mode is specified, the default
   * mid-semester balancing strategy is applied.
   *
   * @param {string} [_instructorId] - Authenticated instructor ID (reserved for future scoping).
   * @param {string} [mode='mid_semester'] - Optimization mode key. One of:
   *   - 'mid_semester': Aggressive rebalancing for mid-semester phase.
   *   - 'end_semester': Conservative audit mode with transfer restrictions.
   * @returns {Promise<Object>} Optimization result with strategy metadata.
   */
  async optimizeInstructorWorkload(_instructorId, mode = 'mid_semester') {
    const workload = await this.getInstructorWorkload();

    const context = new WorkloadOptimizationContext();
    context.resolveStrategy(mode);

    return context.executeOptimization(workload);
  }

  /**
   * Panelist dashboard — assigned projects summary.
   */
  async _getPanelistStats(user) {
    const [assignedProjects, pendingEvaluations, recentNotifications] = await Promise.all([
      Project.find({ panelistIds: user._id })
        .populate('teamId', 'name')
        .sort({ updatedAt: -1 })
        .lean(),
      Evaluation.countDocuments({
        panelistId: user._id,
        status: EVALUATION_STATUSES.DRAFT,
      }),
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
        activeProjects: assignedProjects.filter((p) => p.projectStatus === PROJECT_STATUSES.ACTIVE)
          .length,
        pendingEvaluations,
      },
      recentNotifications,
    };
  }
}

export default new DashboardService();
