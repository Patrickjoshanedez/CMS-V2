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
import AuditLog from '../audit/audit.model.js';
import projectService from '../projects/project.service.js';
import Submission from '../submissions/submission.model.js';
import Evaluation from '../evaluations/evaluation.model.js';
import Notification from '../notifications/notification.model.js';
import AppError from '../../utils/AppError.js';
import {
  ROLES,
  TITLE_STATUSES,
  SUBMISSION_STATUSES,
  PROJECT_STATUSES,
  EVALUATION_STATUSES,
} from '@cms/shared';
import { WorkloadOptimizationContext } from '../optimization/WorkloadOptimizationContext.js';

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
      case ROLES.FACULTY:
        return this._getFacultyStats(user);
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
    let submissionHistory = [];
    let teamActivityTrail = [];
    let progressReport = null;
    if (project) {
      const [latestSubmissions, projectSubmissions] = await Promise.all([
        Submission.aggregate([
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
        ]),
        Submission.find({ projectId: project._id })
          .select(
            '_id chapter type version status submittedAt updatedAt fileName fileSize plagiarismResult originalityScore submittedBy',
          )
          .populate('submittedBy', 'firstName lastName role')
          .sort({ submittedAt: -1, createdAt: -1 })
          .limit(100)
          .lean(),
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

      submissionHistory = projectSubmissions.map((item) => ({
        _id: item._id,
        chapter: item.chapter,
        type: item.type,
        version: item.version,
        status: item.status,
        fileName: item.fileName,
        fileSize: item.fileSize,
        submittedAt: item.submittedAt,
        updatedAt: item.updatedAt,
        originalityScore: item.originalityScore ?? null,
        plagiarismStatus: item.plagiarismResult?.status || null,
        submittedBy: item.submittedBy
          ? {
              _id: item.submittedBy._id,
              firstName: item.submittedBy.firstName,
              lastName: item.submittedBy.lastName,
              role: item.submittedBy.role,
            }
          : null,
      }));

      const submissionIds = projectSubmissions.map((item) => item._id.toString());
      const projectAuditLogs = await AuditLog.find({
        $or: [
          { targetType: 'Project', targetId: project._id.toString() },
          { targetType: 'Submission', targetId: { $in: submissionIds } },
        ],
        action: {
          $not: /^(user\.|settings\.|auth\.|system\.|audit\.)/i,
        },
      })
        .populate('actor', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .limit(150)
        .lean();

      teamActivityTrail = projectAuditLogs.map((entry) => ({
        _id: entry._id,
        action: entry.action,
        actorRole: entry.actorRole,
        targetType: entry.targetType,
        targetId: entry.targetId,
        description: entry.description,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
        actor: entry.actor
          ? {
              _id: entry.actor._id,
              firstName: entry.actor.firstName,
              lastName: entry.actor.lastName,
              role: entry.actor.role,
            }
          : null,
      }));

      const totalMilestones = chapterProgress.length;
      const approvedMilestones = chapterProgress.filter(
        (item) => item.status === 'approved',
      ).length;
      const inReviewMilestones = chapterProgress.filter((item) =>
        [SUBMISSION_STATUSES.PENDING, SUBMISSION_STATUSES.UNDER_REVIEW].includes(item.status),
      ).length;

      progressReport = {
        totalMilestones,
        approvedMilestones,
        inReviewMilestones,
        completionPercent: totalMilestones
          ? Math.round((approvedMilestones / totalMilestones) * 100)
          : 0,
      };
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
      progressReport,
      chapterProgress,
      submissionHistory,
      teamActivityTrail,
      recentNotifications,
    };
  }

  /**
   * Instructor dashboard — system-wide counts, pending title approvals, recent submissions.
   */
  async _getInstructorStats(user) {
    const adviserProjectIds = await Project.find({ adviserId: user._id, isArchived: { $ne: true } })
      .select('_id')
      .lean()
      .then((projects) => projects.map((p) => p._id));

    const [
      totalUsers,
      totalTeams,
      totalProjects,
      pendingTitles,
      recentSubmissions,
      projectsByStatus,
      recentNotifications,
      assignedProjects,
      pendingReviews,
      panelProjects,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Team.countDocuments(),
      Project.countDocuments(),
      Project.find({ titleStatus: TITLE_STATUSES.SUBMITTED, isArchived: { $ne: true } })
        .populate('teamId', 'name')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean(),
      Submission.find({ status: SUBMISSION_STATUSES.PENDING })
        .populate({
          path: 'projectId',
          select: 'title teamId isArchived',
          match: { isArchived: { $ne: true } },
        })
        .sort({ createdAt: -1 })
        .lean()
        .then((subs) => subs.filter((s) => s.projectId).slice(0, 10)),
      Project.aggregate([{ $group: { _id: '$projectStatus', count: { $sum: 1 } } }]),
      Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
      Project.find({ adviserId: user._id })
        .populate({
          path: 'teamId',
          select: 'name members memberRoles leaderId githubUrl googleDocUrl isLocked',
          populate: [
            { path: 'members', select: 'firstName lastName email fullName' },
            { path: 'memberRoles.userId', select: 'firstName lastName email fullName' },
            { path: 'leaderId', select: 'firstName lastName email fullName' },
          ],
        })
        .sort({ updatedAt: -1 })
        .lean(),
      adviserProjectIds.length > 0
        ? Submission.find({
            projectId: { $in: adviserProjectIds },
            status: { $in: [SUBMISSION_STATUSES.PENDING, SUBMISSION_STATUSES.UNDER_REVIEW] },
          })
            .populate('projectId', 'title isArchived projectStatus')
            .populate('submittedBy', 'firstName lastName email fullName')
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve([]),
      Project.find({ panelistIds: user._id, isArchived: { $ne: true } })
        .populate('teamId', 'name members')
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    const hydratedAssignedProjects = await this._hydrateAssignedProjects(assignedProjects);

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
        assignedProjects: assignedProjects.length,
        pendingReviews: pendingReviews.length,
        panelAssignments: panelProjects.length,
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
      assignedProjects: hydratedAssignedProjects,
      pendingReviews: pendingReviews.map((s) => ({
        _id: s._id,
        chapter: s.chapter,
        version: s.version,
        status: s.status,
        projectTitle: s.projectId?.title || 'Unknown',
        isArchived: s.projectId?.isArchived || false,
        projectStatus: s.projectId?.projectStatus || null,
        fileName: s.fileName,
        createdAt: s.createdAt,
        submittedBy: s.submittedBy
          ? `${s.submittedBy.firstName || ''} ${s.submittedBy.lastName || ''}`.trim() ||
            s.submittedBy.fullName
          : 'Proponent Team',
      })),
      panelAssignments: panelProjects.map((p) => ({
        _id: p._id,
        title: p.title,
        titleStatus: p.titleStatus,
        projectStatus: p.projectStatus,
        capstonePhase: p.capstonePhase,
        teamName: p.teamId?.name || 'Unknown',
        memberCount: p.teamId?.members?.length || 0,
      })),
      projectsByStatus: statusCounts,
      recentNotifications,
    };
  }

  /**
   * Adviser dashboard — assigned projects, pending reviews, recent chapters.
   */
  async _getAdviserStats(user) {
    const adviserProjectIds = await Project.find({ adviserId: user._id, isArchived: { $ne: true } })
      .select('_id')
      .lean()
      .then((projects) => projects.map((p) => p._id));

    const [assignedProjects, pendingReviews, recentNotifications] = await Promise.all([
      Project.find({ adviserId: user._id })
        .populate({
          path: 'teamId',
          select: 'name members memberRoles leaderId githubUrl googleDocUrl isLocked',
          populate: [
            { path: 'members', select: 'firstName lastName email fullName' },
            { path: 'memberRoles.userId', select: 'firstName lastName email fullName' },
            { path: 'leaderId', select: 'firstName lastName email fullName' },
          ],
        })
        .sort({ updatedAt: -1 })
        .lean(),
      adviserProjectIds.length > 0
        ? Submission.find({
            projectId: { $in: adviserProjectIds },
            status: { $in: [SUBMISSION_STATUSES.PENDING, SUBMISSION_STATUSES.UNDER_REVIEW] },
          })
            .populate('projectId', 'title isArchived projectStatus')
            .populate('submittedBy', 'firstName lastName email fullName')
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve([]),
      Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const hydratedAssignedProjects = await this._hydrateAssignedProjects(assignedProjects);

    return {
      role: ROLES.ADVISER,
      assignedProjects: hydratedAssignedProjects,
      adviserProjects: hydratedAssignedProjects,
      pendingReviews: pendingReviews.map((s) => ({
        _id: s._id,
        projectId: s.projectId?._id || s.projectId,
        chapter: s.chapter,
        version: s.version,
        status: s.status,
        projectTitle: s.projectId?.title || 'Unknown',
        isArchived: s.projectId?.isArchived || false,
        projectStatus: s.projectId?.projectStatus || null,
        fileName: s.fileName,
        createdAt: s.createdAt,
        submittedBy: s.submittedBy
          ? `${s.submittedBy.firstName || ''} ${s.submittedBy.lastName || ''}`.trim() ||
            s.submittedBy.fullName
          : 'Proponent Team',
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

    const adviserProjectIds = await Project.find({ adviserId, isArchived: { $ne: true } })
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

    const adviserProjectIds = await Project.find({ adviserId, isArchived: { $ne: true } })
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
      Project.find({ panelistIds: panelistId, isArchived: { $ne: true } })
        .populate('teamId', 'name members')
        .populate('adviserId', 'firstName lastName')
        .sort({ updatedAt: -1 })
        .lean(),
      Project.find({
        panelistIds: { $ne: panelistId },
        projectStatus: PROJECT_STATUSES.ACTIVE,
        isArchived: { $ne: true },
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
    const project = await Project.findById(projectId)
      .select('_id title panelistIds projectStatus isArchived')
      .lean();

    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    if (
      ![
        PROJECT_STATUSES.ACTIVE,
        PROJECT_STATUSES.PENDING_FOR_SUBMISSION,
        PROJECT_STATUSES.PENDING_IN_REVIEW,
        PROJECT_STATUSES.REVISION_NEEDED,
      ].includes(project.projectStatus) ||
      project.isArchived
    ) {
      throw new AppError('Only active projects can be selected.', 400, 'PROJECT_NOT_ACTIVE');
    }

    if (project.panelistIds?.some((id) => id.toString() === panelistId.toString())) {
      return {
        alreadyAssigned: true,
        project: {
          _id: project._id,
          title: project.title,
          panelistCount: project.panelistIds.length,
        },
      };
    }

    const { project: updatedProject } = await projectService.selectAsPanelist(
      projectId,
      panelistId,
    );

    return {
      alreadyAssigned: false,
      project: {
        _id: updatedProject._id,
        title: updatedProject.title,
        panelistCount: updatedProject.panelistIds.length,
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
   * Phase 4: Cross-faculty workload matrix (advisers, panelists, and full committee load).
   * @returns {Promise<Object>}
   */
  async getInstructorWorkload() {
    const faculty = await User.find({
      role: { $in: [ROLES.FACULTY, ROLES.ADVISER, ROLES.PANELIST] },
      isActive: true,
    })
      .select('firstName lastName role email')
      .lean();

    const facultyIds = faculty.map((f) => f._id);

    // Fetch all active projects involving any of these faculty members
    const allProjects = await Project.find({
      isArchived: { $ne: true },
      $or: [{ adviserId: { $in: facultyIds } }, { panelistIds: { $in: facultyIds } }],
    })
      .select('_id adviserId panelistIds')
      .lean();

    const projectIds = allProjects.map((p) => p._id);

    // Fetch relevant submissions & draft evaluations in batch
    const [allSubmissions, draftEvaluations] = await Promise.all([
      Submission.find({ projectId: { $in: projectIds } })
        .select('projectId status revisionDeadline')
        .lean(),
      Evaluation.find({
        panelistId: { $in: facultyIds },
        status: EVALUATION_STATUSES.DRAFT,
      })
        .select('panelistId projectId')
        .lean(),
    ]);

    // Index submissions by projectId
    const subsByProject = new Map();
    for (const sub of allSubmissions) {
      const pid = sub.projectId?.toString();
      if (!pid) continue;
      if (!subsByProject.has(pid)) subsByProject.set(pid, []);
      subsByProject.get(pid).push(sub);
    }

    // Index draft evaluations by panelistId
    const evalsByPanelist = new Map();
    for (const ev of draftEvaluations) {
      const pid = ev.panelistId?.toString();
      if (!pid) continue;
      if (!evalsByPanelist.has(pid)) evalsByPanelist.set(pid, []);
      evalsByPanelist.get(pid).push(ev);
    }

    const now = new Date();

    const adviserRows = [];
    const panelistRows = [];
    const facultyRows = [];

    for (const member of faculty) {
      const mId = member._id.toString();
      const fullName = `${member.firstName} ${member.lastName}`.trim();

      // 1. Advisory projects & metrics
      const advProjects = allProjects.filter((p) => p.adviserId?.toString() === mId);
      const advSubs = advProjects.flatMap((p) => subsByProject.get(p._id.toString()) || []);
      const advPending = advSubs.filter((s) => s.status === SUBMISSION_STATUSES.PENDING).length;
      const advRevisions = advSubs.filter(
        (s) => s.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED,
      ).length;
      const advOverdue = advSubs.filter(
        (s) => s.revisionDeadline && new Date(s.revisionDeadline) < now,
      ).length;
      const advScore = Number((advPending * 2 + advRevisions * 1.5 + advOverdue * 3).toFixed(2));

      // 2. Panelist projects & metrics
      const panProjects = allProjects.filter((p) =>
        p.panelistIds?.some((id) => id?.toString() === mId),
      );
      const draftEvals = evalsByPanelist.get(mId) || [];
      const panPending = draftEvals.length;
      const panScore = Number((panProjects.length * 1.5 + panPending * 2).toFixed(2));

      // 3. Combined load
      const totalProjectIds = new Set([
        ...advProjects.map((p) => p._id.toString()),
        ...panProjects.map((p) => p._id.toString()),
      ]);
      const combinedScore = Number((advScore + panScore).toFixed(2));

      const baseInfo = {
        facultyId: member._id,
        facultyName: fullName,
        email: member.email,
        role: member.role,
      };

      const advRow = {
        ...baseInfo,
        adviserId: member._id,
        adviserName: fullName,
        roleType: 'adviser',
        projectCount: advProjects.length,
        pending: advPending,
        revisions: advRevisions,
        overdue: advOverdue,
        workloadScore: advScore,
      };

      const panRow = {
        ...baseInfo,
        panelistId: member._id,
        panelistName: fullName,
        roleType: 'panelist',
        projectCount: panProjects.length,
        pending: panPending,
        revisions: 0,
        overdue: 0,
        workloadScore: panScore,
      };

      const facRow = {
        ...baseInfo,
        adviserId: member._id,
        adviserName: fullName,
        roleType: 'committee',
        adviserProjectCount: advProjects.length,
        panelistProjectCount: panProjects.length,
        projectCount: totalProjectIds.size,
        pending: advPending + panPending,
        revisions: advRevisions,
        overdue: advOverdue,
        workloadScore: combinedScore,
      };

      adviserRows.push(advRow);
      panelistRows.push(panRow);
      facultyRows.push(facRow);
    }

    adviserRows.sort((a, b) => b.workloadScore - a.workloadScore);
    panelistRows.sort((a, b) => b.workloadScore - a.workloadScore);
    facultyRows.sort((a, b) => b.workloadScore - a.workloadScore);

    const calcAvg = (rows) =>
      rows.length > 0
        ? Number((rows.reduce((sum, r) => sum + r.workloadScore, 0) / rows.length).toFixed(2))
        : 0;

    return {
      advisers: adviserRows,
      panelists: panelistRows,
      faculty: facultyRows,
      summary: {
        adviserCount: adviserRows.length,
        panelistCount: panelistRows.length,
        facultyCount: facultyRows.length,
        averageScore: calcAvg(facultyRows),
        adviserAverageScore: calcAvg(adviserRows),
        panelistAverageScore: calcAvg(panelistRows),
      },
    };
  }

  /**
   * Phase 4: Suggest balancing actions for faculty workload (Strategy Pattern).
   * Supports roleScope ('all' | 'adviser' | 'panelist') and mode ('mid_semester' | 'end_semester').
   * @param {string|Object} [userIdOrOptions]
   * @param {Object} [maybeOptions={}]
   * @returns {Promise<Object>}
   */
  async optimizeInstructorWorkload(userIdOrOptions, maybeOptions = {}) {
    let options = {};
    if (typeof userIdOrOptions === 'object' && userIdOrOptions !== null) {
      options = userIdOrOptions;
    } else if (typeof maybeOptions === 'object' && maybeOptions !== null) {
      options = maybeOptions;
    }

    const mode = options.mode || 'mid_semester';
    const roleScope = options.roleScope || 'all';

    const workload = await this.getInstructorWorkload();

    const context = new WorkloadOptimizationContext();
    context.resolveStrategy(mode);

    return context.executeOptimization(workload, { roleScope });
  }

  /**
   * Panelist dashboard — assigned projects summary.
   */
  async _getPanelistStats(user) {
    const [assignedProjects, pendingEvaluations, recentNotifications] = await Promise.all([
      Project.find({ panelistIds: user._id, isArchived: { $ne: true } })
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

  /**
   * Helper to format and hydrate assigned projects with team details, member roster,
   * chapter progress, and institutional capstone phase.
   */
  async _hydrateAssignedProjects(projects) {
    if (!projects || projects.length === 0) return [];

    const projectIds = projects.map((p) => p._id);
    const submissions = await Submission.find({
      projectId: { $in: projectIds },
    })
      .select('projectId chapter type version status submittedAt updatedAt')
      .sort({ chapter: 1, version: -1 })
      .lean();

    const subsByProject = new Map();
    for (const sub of submissions) {
      const pid = sub.projectId?.toString();
      if (!pid) continue;
      if (!subsByProject.has(pid)) subsByProject.set(pid, []);
      subsByProject.get(pid).push(sub);
    }

    const hydrated = [];
    const updatesToPersist = [];

    for (const p of projects) {
      const pid = p._id?.toString();
      const projSubs = subsByProject.get(pid) || [];

      // Calculate chapter progress
      const latestChaptersMap = new Map();
      for (const sub of projSubs) {
        if (sub.type === 'chapter' && sub.chapter) {
          if (!latestChaptersMap.has(sub.chapter)) {
            latestChaptersMap.set(sub.chapter, sub);
          }
        }
      }

      let approvedChaptersCount = 0;
      let pendingChapter = null;
      for (const ch of [1, 2, 3, 4, 5]) {
        const s = latestChaptersMap.get(ch);
        if (s) {
          if (['approved', 'accepted', 'locked'].includes(s.status)) {
            approvedChaptersCount += 1;
          } else if (['pending', 'under_review'].includes(s.status) && !pendingChapter) {
            pendingChapter = ch;
          }
        }
      }

      // Determine effective capstone phase:
      // Once title is approved, project is in Capstone 2 (Chapters 1-3) or beyond.
      let effectivePhase = Number(p.capstonePhase || 1);
      if (p.titleStatus === TITLE_STATUSES.APPROVED && effectivePhase < 2) {
        effectivePhase = 2;
      }
      if (
        effectivePhase < 3 &&
        (approvedChaptersCount >= 3 || (pendingChapter && pendingChapter >= 4))
      ) {
        effectivePhase = 3;
      }
      if (
        p.projectStatus === PROJECT_STATUSES.DEFENDED ||
        p.projectStatus === PROJECT_STATUSES.ARCHIVED ||
        p.isArchived
      ) {
        effectivePhase = 4;
      }

      if (
        p.titleStatus === TITLE_STATUSES.APPROVED &&
        Number(p.capstonePhase || 1) < effectivePhase
      ) {
        updatesToPersist.push({ id: p._id, phase: effectivePhase });
      }

      const team = p.teamId;
      const memberRoleMap = new Map();
      if (Array.isArray(team?.memberRoles)) {
        for (const mr of team.memberRoles) {
          const uid = (mr.userId?._id || mr.userId)?.toString();
          if (uid) memberRoleMap.set(uid, mr.role);
        }
      }
      if (Array.isArray(p.memberRoleAssignments)) {
        for (const mr of p.memberRoleAssignments) {
          const uid = (mr.userId?._id || mr.userId)?.toString();
          if (uid) memberRoleMap.set(uid, mr.role);
        }
      }

      const rawMembers = Array.isArray(team?.members) ? team.members : [];
      const leaderIdStr = (team?.leaderId?._id || team?.leaderId)?.toString();

      const members = rawMembers.map((m, idx) => {
        const uid = (m._id || m)?.toString();
        const fullName = m.firstName
          ? `${m.firstName} ${m.lastName || ''}`.trim()
          : m.fullName || `Member ${idx + 1}`;
        const email = m.email || '';
        const role =
          memberRoleMap.get(uid) ||
          (uid === leaderIdStr ? 'Project Lead & Systems Analyst' : 'Proponent Member');
        return {
          _id: uid,
          fullName,
          email,
          role,
          isLeader: uid === leaderIdStr,
        };
      });

      const githubUrl =
        p.githubUrl ||
        team?.githubUrl ||
        p.prototypes?.find((pt) => pt.type === 'link' && /github/i.test(pt.url || ''))?.url ||
        '';
      const googleDocUrl = p.googleDocUrl || team?.googleDocUrl || '';

      hydrated.push({
        _id: p._id,
        title: p.title,
        titleStatus: p.titleStatus,
        projectStatus: p.projectStatus,
        capstonePhase: effectivePhase,
        capstoneType: p.capstoneType,
        teamName: team?.name || 'Unknown Team',
        memberCount: members.length || team?.members?.length || 0,
        members,
        githubUrl,
        googleDocUrl,
        approvedChaptersCount,
        pendingChapter,
        chapterProgressSummary: `${approvedChaptersCount}/5 approved`,
        isLocked: team?.isLocked || false,
      });
    }

    // Persist any updated phases in background
    if (updatesToPersist.length > 0) {
      Promise.all(
        updatesToPersist.map((u) =>
          Project.updateOne({ _id: u.id }, { $set: { capstonePhase: u.phase } }).exec(),
        ),
      ).catch(() => {});
    }

    return hydrated;
  }

  /**
   * Faculty dashboard — unified multi-hat aggregation across Adviser, Panelist, and Secretary duties.
   */
  async _getFacultyStats(user) {
    const userId = user._id;

    // 1. Adviser query (single authoritative fetch, eliminating duplicate sequential query)
    const adviserProjects = await Project.find({ adviserId: userId, isArchived: { $ne: true } })
      .populate({
        path: 'teamId',
        select: 'name members memberRoles leaderId githubUrl googleDocUrl isLocked',
        populate: [
          { path: 'members', select: 'firstName lastName email fullName' },
          { path: 'memberRoles.userId', select: 'firstName lastName email fullName' },
          { path: 'leaderId', select: 'firstName lastName email fullName' },
        ],
      })
      .sort({ updatedAt: -1 })
      .lean();

    const adviserProjectIds = adviserProjects.map((p) => p._id);

    // 2. Panelist query
    const panelistFilter = {
      $or: [{ panelistIds: userId }, { 'panelists.userId': userId }],
      isArchived: { $ne: true },
    };

    // 3. Secretary query
    const secretaryFilter = {
      $or: [{ secretaryId: userId }, { 'panelists.userId': userId, 'panelists.role': 'secretary' }],
      isArchived: { $ne: true },
    };

    const [
      pendingReviews,
      panelProjects,
      pendingEvaluations,
      secretaryProjects,
      recentNotifications,
    ] = await Promise.all([
      adviserProjectIds.length > 0
        ? Submission.find({
            projectId: { $in: adviserProjectIds },
            status: { $in: [SUBMISSION_STATUSES.PENDING, SUBMISSION_STATUSES.UNDER_REVIEW] },
          })
            .populate('projectId', 'title isArchived projectStatus')
            .populate('submittedBy', 'firstName lastName email fullName')
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve([]),
      Project.find(panelistFilter)
        .populate('teamId', 'name members')
        .sort({ updatedAt: -1 })
        .lean(),
      Evaluation.countDocuments({
        panelistId: userId,
        status: EVALUATION_STATUSES.DRAFT,
      }),
      Project.find(secretaryFilter)
        .populate('teamId', 'name members')
        .populate('adviserId', 'firstName lastName fullName email')
        .sort({ updatedAt: -1 })
        .lean(),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    // Secretary metrics
    const pendingSecretaryMinutes = secretaryProjects.filter(
      (p) =>
        !p.actionDoneMatrix ||
        p.actionDoneMatrix.length === 0 ||
        p.admStatus === 'awaiting_minutes_upload' ||
        p.admStatus === 'not_started',
    ).length;

    const pendingSecretaryEndorsement = secretaryProjects.filter(
      (p) =>
        p.actionDoneMatrix &&
        p.actionDoneMatrix.length > 0 &&
        !p.admSignatures?.secretary?.endorsed,
    ).length;

    const endorsedSecretaryMatrices = secretaryProjects.filter(
      (p) => p.admSignatures?.secretary?.endorsed === true,
    ).length;

    const hydratedAssignedProjects = await this._hydrateAssignedProjects(adviserProjects);

    return {
      role: ROLES.FACULTY,
      counts: {
        assignedProjects: adviserProjects.length,
        adviserProjects: adviserProjects.length,
        activeProjects: adviserProjects.filter(
          (p) => p.projectStatus !== PROJECT_STATUSES.ARCHIVED && p.isArchived !== true,
        ).length,
        activeAdviserProjects: adviserProjects.filter(
          (p) => p.projectStatus !== PROJECT_STATUSES.ARCHIVED && p.isArchived !== true,
        ).length,
        pendingReviews: pendingReviews.length,
        panelAssignments: panelProjects.length,
        pendingEvaluations,
        secretaryProjects: secretaryProjects.length,
        pendingSecretaryMinutes,
        pendingSecretaryEndorsement,
        endorsedSecretaryMatrices,
      },
      assignedProjects: hydratedAssignedProjects,
      adviserProjects: hydratedAssignedProjects,
      pendingReviews: pendingReviews.map((s) => ({
        _id: s._id,
        projectId: s.projectId?._id || s.projectId,
        chapter: s.chapter,
        version: s.version,
        status: s.status,
        projectTitle: s.projectId?.title || 'Unknown',
        isArchived: s.projectId?.isArchived || false,
        projectStatus: s.projectId?.projectStatus || null,
        fileName: s.fileName,
        createdAt: s.createdAt,
        submittedBy: s.submittedBy
          ? `${s.submittedBy.firstName || ''} ${s.submittedBy.lastName || ''}`.trim() ||
            s.submittedBy.fullName
          : 'Proponent Team',
      })),
      panelAssignments: panelProjects.map((p) => ({
        _id: p._id,
        title: p.title,
        titleStatus: p.titleStatus,
        projectStatus: p.projectStatus,
        capstonePhase: p.capstonePhase,
        teamName: p.teamId?.name || 'Unknown Team',
        memberCount: p.teamId?.members?.length || 0,
      })),
      secretaryProjects: secretaryProjects.map((p) => ({
        _id: p._id,
        title: p.title,
        titleStatus: p.titleStatus,
        projectStatus: p.projectStatus,
        capstonePhase: p.capstonePhase,
        teamName: p.teamId?.name || 'Unknown Team',
        memberCount: p.teamId?.members?.length || 0,
        admStatus: p.admStatus || 'not_started',
        admSignatures: p.admSignatures || {},
        actionDoneMatrixCount: p.actionDoneMatrix?.length || 0,
        adviserName: p.adviserId
          ? `${p.adviserId.firstName || ''} ${p.adviserId.lastName || ''}`.trim()
          : 'Unassigned',
      })),
      recentNotifications,
    };
  }
}

export default new DashboardService();
