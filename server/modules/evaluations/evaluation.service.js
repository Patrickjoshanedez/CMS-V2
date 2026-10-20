/**
 * EvaluationService — Business logic for defense grading and evaluation workflows.
 *
 * Panelists create/update draft evaluations, then submit them.
 * Instructors release evaluations so students can view grades.
 * Aggregation provides averaged scores across all panelists for a project.
 */
import Evaluation from './evaluation.model.js';
import Project from '../projects/project.model.js';
import Notification from '../notifications/notification.model.js';
import { emitToUser, emitToProject } from '../../services/socket.service.js';
import AppError from '../../utils/AppError.js';
import { assertProjectWritable } from '../projects/services/projectCore.service.js';
import {
  ROLES,
  EVALUATION_STATUSES,
  DEFENSE_TYPES,
  DEFENSE_DECISIONS,
  computeBukSUGrade,
} from '@cms/shared';

const toUserId = (value) => String(value?._id || value || '');

function getAssignedPanelistIds(project) {
  const secretaryId = toUserId(project.secretaryId);
  const assignedIds = [
    ...(project.panelists || [])
      .filter((panelist) => String(panelist.role || '').toLowerCase() !== 'secretary')
      .map((panelist) => toUserId(panelist.userId)),
    ...(project.panelistIds || []).map(toUserId),
  ];

  return [...new Set(assignedIds.filter((id) => id && id !== secretaryId))];
}

class EvaluationService {
  async _assertEvaluationProjectWritable(evaluation) {
    const project = await Project.findById(evaluation.projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    assertProjectWritable(project);
  }

  /* ═══════════════════ Default Rubric ═══════════════════ */

  /**
   * Returns the default grading criteria for a given defense type.
   * Instructors/panelists can customize, but this provides a starting template.
   */
  getDefaultCriteria(defenseType) {
    if (defenseType === DEFENSE_TYPES.PROPOSAL) {
      // Capstone 1 — Proposal & Manuscript Evaluation (Chapters 1–3)
      // Scoring: 1 = Needs Improvement, 2 = Meets Expectations, 3 = Exceeds Expectations
      return [
        { name: 'Problem Definition and Objectives', maxScore: 3, score: null, comment: '' },
        { name: 'Methodology and Technical Approach', maxScore: 3, score: null, comment: '' },
        { name: 'Originality and Innovation', maxScore: 3, score: null, comment: '' },
        { name: 'Presentation and Writing Quality', maxScore: 3, score: null, comment: '' },
        { name: 'Independence and Feasibility', maxScore: 3, score: null, comment: '' },
      ];
    }
    if (defenseType === DEFENSE_TYPES.PROGRESS || defenseType === 'midterm') {
      // Capstone 2 — System Development & Prototype Demonstration
      // Scoring: 1 = Needs Improvement, 2 = Satisfactory, 3 = Proficient, 4 = Excellent
      return [
        {
          name: 'System Development Progress & Implementation',
          maxScore: 4,
          score: null,
          comment: '',
        },
        { name: 'Technical Architecture & Code Quality', maxScore: 4, score: null, comment: '' },
        { name: 'Alignment with Capstone Objectives', maxScore: 4, score: null, comment: '' },
        {
          name: 'Interactive Gantt Chart & Milestone Adherence',
          maxScore: 4,
          score: null,
          comment: '',
        },
        {
          name: 'Working Prototype Demonstration & Functionality',
          maxScore: 4,
          score: null,
          comment: '',
        },
        { name: 'Problem Identification and Resolution', maxScore: 4, score: null, comment: '' },
        { name: 'Presentation Quality & Q&A Response', maxScore: 4, score: null, comment: '' },
      ];
    }
    // Capstone 3 (and legacy 'paper') — Final Oral Defense & Academic Journal Evaluation
    return [
      {
        name: 'Presentation of Results & Analysis (Chapter 4)',
        maxScore: 20,
        score: null,
        comment: '',
      },
      {
        name: 'Summary, Conclusions & Recommendations (Chapter 5)',
        maxScore: 15,
        score: null,
        comment: '',
      },
      {
        name: 'Academic Journal Manuscript Quality (IMRAD/IEEE format)',
        maxScore: 20,
        score: null,
        comment: '',
      },
      {
        name: 'System Functionality & Prototype Completeness',
        maxScore: 20,
        score: null,
        comment: '',
      },
      { name: 'Oral Defense Presentation Quality', maxScore: 15, score: null, comment: '' },
      {
        name: 'Defense Committee Q&A & Rebuttal Responses',
        maxScore: 10,
        score: null,
        comment: '',
      },
    ];
  }

  /* ═══════════════════ Create / Get Draft ═══════════════════ */

  /**
   * Get or create an evaluation for a panelist on a project.
   * If no evaluation exists, creates a draft with default criteria.
   *
   * @param {string} panelistId - The authenticated panelist
   * @param {string} projectId - Target project
   * @param {string} defenseType - 'proposal' or 'final'
   * @returns {Object} { evaluation }
   */
  async getOrCreateEvaluation(panelistId, projectId, defenseType) {
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    // Verify panelist is assigned to this project
    const isPanelist = project.panelistIds.some((id) => id.toString() === panelistId.toString());
    if (!isPanelist) {
      throw new AppError(
        'You are not assigned as a panelist for this project.',
        403,
        'NOT_ASSIGNED_PANELIST',
      );
    }

    let evaluation = await Evaluation.findOne({
      projectId,
      panelistId,
      defenseType,
    });

    if (!evaluation) {
      assertProjectWritable(project);
      evaluation = await Evaluation.create({
        projectId,
        panelistId,
        defenseType,
        criteria: this.getDefaultCriteria(defenseType),
      });
    }

    return { evaluation };
  }

  /* ═══════════════════ Update Draft ═══════════════════ */

  /**
   * Update an evaluation's criteria scores and comments.
   * Only allowed while evaluation is in draft status.
   *
   * @param {string} panelistId - The authenticated panelist
   * @param {string} evaluationId - The evaluation to update
   * @param {Object} data - { criteria, overallComment }
   * @returns {Object} { evaluation }
   */
  async updateEvaluation(panelistId, evaluationId, data) {
    const evaluation = await Evaluation.findById(evaluationId);
    if (!evaluation) throw new AppError('Evaluation not found.', 404, 'EVALUATION_NOT_FOUND');
    await this._assertEvaluationProjectWritable(evaluation);

    if (evaluation.panelistId.toString() !== panelistId.toString()) {
      throw new AppError('You can only edit your own evaluation.', 403, 'FORBIDDEN');
    }

    if (evaluation.status !== EVALUATION_STATUSES.DRAFT) {
      throw new AppError(
        'Cannot edit a submitted or released evaluation.',
        400,
        'EVALUATION_NOT_EDITABLE',
      );
    }

    if (data.criteria) {
      evaluation.criteria = data.criteria;
    }
    if (data.overallComment !== undefined) {
      evaluation.overallComment = data.overallComment;
    }
    if (data.decision !== undefined) {
      evaluation.decision = data.decision;
    }

    await evaluation.save();
    return { evaluation };
  }

  /* ═══════════════════ Submit Evaluation ═══════════════════ */

  /**
   * Submit a draft evaluation. Computes total scores and locks the evaluation.
   *
   * @param {string} panelistId - The authenticated panelist
   * @param {string} evaluationId - The evaluation to submit
   * @returns {Object} { evaluation }
   */
  async submitEvaluation(panelistId, evaluationId) {
    const evaluation = await Evaluation.findById(evaluationId);
    if (!evaluation) throw new AppError('Evaluation not found.', 404, 'EVALUATION_NOT_FOUND');
    await this._assertEvaluationProjectWritable(evaluation);

    if (evaluation.panelistId.toString() !== panelistId.toString()) {
      throw new AppError('You can only submit your own evaluation.', 403, 'FORBIDDEN');
    }

    if (evaluation.status !== EVALUATION_STATUSES.DRAFT) {
      throw new AppError(
        'Evaluation has already been submitted.',
        400,
        'EVALUATION_ALREADY_SUBMITTED',
      );
    }

    // Validate all criteria are scored
    const unscoredCriteria = evaluation.criteria.filter(
      (c) => c.score === null || c.score === undefined,
    );
    if (unscoredCriteria.length > 0) {
      throw new AppError(
        `All criteria must be scored before submission. Missing: ${unscoredCriteria.map((c) => c.name).join(', ')}`,
        400,
        'INCOMPLETE_EVALUATION',
      );
    }

    // Validate each score does not exceed maxScore
    for (const criterion of evaluation.criteria) {
      if (criterion.score > criterion.maxScore) {
        throw new AppError(
          `Score for "${criterion.name}" (${criterion.score}) exceeds max (${criterion.maxScore}).`,
          400,
          'SCORE_EXCEEDS_MAX',
        );
      }
    }

    // Default decision if not set
    if (!evaluation.decision) {
      evaluation.decision = 'passed';
    }

    // Compute totals
    evaluation.totalScore = evaluation.criteria.reduce((sum, c) => sum + c.score, 0);
    evaluation.maxTotalScore = evaluation.criteria.reduce((sum, c) => sum + c.maxScore, 0);
    if (evaluation.maxTotalScore > 0) {
      evaluation.percentage =
        Math.round((evaluation.totalScore / evaluation.maxTotalScore) * 10000) / 100;
      evaluation.buksuGrade = computeBukSUGrade(evaluation.percentage);
    } else {
      evaluation.percentage = null;
      evaluation.buksuGrade = null;
    }
    evaluation.status = EVALUATION_STATUSES.SUBMITTED;
    evaluation.submittedAt = new Date();

    await evaluation.save();

    // Notify the project's adviser
    const project = await Project.findById(evaluation.projectId);
    if (project?.adviserId) {
      const evalNotif = await Notification.create({
        userId: project.adviserId,
        type: 'evaluation_submitted',
        title: 'Defense Evaluation Submitted',
        message: `A panelist has submitted their ${evaluation.defenseType} defense evaluation.`,
        metadata: {
          projectId: evaluation.projectId,
          evaluationId: evaluation._id,
          defenseType: evaluation.defenseType,
        },
      });
      emitToUser(project.adviserId, 'notification:new', evalNotif);
    }

    // Notify the project room in real-time
    emitToProject(evaluation.projectId, 'defense:score_updated', {
      projectId: evaluation.projectId,
      evaluationId: evaluation._id,
      defenseType: evaluation.defenseType,
      totalScore: evaluation.totalScore,
      maxTotalScore: evaluation.maxTotalScore,
      status: evaluation.status,
      decision: evaluation.decision,
      panelistId: evaluation.panelistId,
    });

    return { evaluation };
  }

  /* ═══════════════════ Unlock Evaluation (Instructor) ═══════════════════ */

  /**
   * Reopen a submitted or released evaluation for editing.
   *
   * @param {string} instructorId
   * @param {string} evaluationId
   * @param {string} reason
   * @returns {Object} { evaluation }
   */
  async unlockEvaluation(instructorId, evaluationId, reason) {
    const evaluation = await Evaluation.findById(evaluationId);
    if (!evaluation) throw new AppError('Evaluation not found.', 404, 'EVALUATION_NOT_FOUND');
    await this._assertEvaluationProjectWritable(evaluation);

    if (!reason || !reason.trim()) {
      throw new AppError('Unlock reason is required.', 400, 'UNLOCK_REASON_REQUIRED');
    }

    if (evaluation.status === EVALUATION_STATUSES.DRAFT) {
      throw new AppError('Draft evaluations do not need to be unlocked.', 400, 'ALREADY_DRAFT');
    }

    evaluation.status = EVALUATION_STATUSES.DRAFT;
    evaluation.totalScore = null;
    evaluation.maxTotalScore = null;
    evaluation.percentage = null;
    evaluation.buksuGrade = null;
    evaluation.submittedAt = null;
    evaluation.releasedAt = null;
    await evaluation.save();

    const notification = await Notification.create({
      userId: evaluation.panelistId,
      type: 'evaluation_unlocked',
      title: 'Evaluation Unlocked',
      message: `Your ${evaluation.defenseType} evaluation was unlocked for revision. Reason: ${reason}`,
      metadata: {
        projectId: evaluation.projectId,
        evaluationId: evaluation._id,
        defenseType: evaluation.defenseType,
        reason,
        unlockedBy: instructorId,
      },
    });
    emitToUser(evaluation.panelistId, 'notification:new', notification);

    return { evaluation };
  }

  /* ═══════════════════ Release Evaluations (Instructor) ═══════════════════ */

  /**
   * Release all submitted evaluations for a project's defense so students can view grades.
   * Only instructors can release.
   *
   * Grade Leakage Prevention (Abella #1):
   * Release is blocked unless every assigned panelist has submitted their evaluation.
   *
   * @param {string} projectId - The project
   * @param {string} defenseType - 'proposal' or 'final'
   * @returns {Object} { releasedCount }
   */
  async releaseEvaluations(projectId, defenseType) {
    const project = await Project.findById(projectId).populate('teamId');
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    assertProjectWritable(project);

    // --- Grade Leakage Prevention Guard ---
    // All assigned panelists must have submitted before grades can be released.
    const assignedPanelistIds = getAssignedPanelistIds(project);
    if (assignedPanelistIds.length > 0) {
      const submittedEvals = await Evaluation.find({
        projectId,
        defenseType,
        status: { $in: [EVALUATION_STATUSES.SUBMITTED, EVALUATION_STATUSES.RELEASED] },
      }).select('panelistId');

      const submittedIds = submittedEvals.map((e) => String(e.panelistId));
      const pendingPanelistIds = assignedPanelistIds.filter((id) => !submittedIds.includes(id));

      if (pendingPanelistIds.length > 0) {
        throw new AppError(
          `Cannot release grades: ${pendingPanelistIds.length} panelist(s) have not yet submitted their evaluations. ` +
            'All panel members must complete their scoring and remarks before grades can be released to students.',
          403,
          'EVALUATIONS_INCOMPLETE',
        );
      }
    }

    const result = await Evaluation.updateMany(
      {
        projectId,
        defenseType,
        status: EVALUATION_STATUSES.SUBMITTED,
      },
      {
        $set: {
          status: EVALUATION_STATUSES.RELEASED,
          releasedAt: new Date(),
        },
      },
    );

    // A released passing final evaluation is a prerequisite for archival, not an archive trigger.
    const allEvaluations = await Evaluation.find({ projectId, defenseType });
    const isPassedVerdict =
      allEvaluations.length > 0 &&
      allEvaluations.every(
        (e) =>
          [DEFENSE_DECISIONS.PASSED, DEFENSE_DECISIONS.PASSED_WITH_REVISIONS].includes(
            String(e.decision || '').toLowerCase(),
          ),
      );

    if (isPassedVerdict && defenseType === DEFENSE_TYPES.FINAL) {
      project.defenseSchedule = project.defenseSchedule || {};
      project.defenseSchedule.verdict = 'Passed';
      await project.save();

      try {
        const { default: projectService } = await import('../projects/project.service.js');
        await projectService.evaluatePostApprovalUnlocks(projectId);
      } catch {
        // Unlock calculation is independent of grade release and archival readiness.
      }
    }

    const { default: projectService } = await import('../projects/project.service.js');
    if ([DEFENSE_TYPES.PROPOSAL, DEFENSE_TYPES.PROGRESS, 'midterm'].includes(defenseType)) {
      const progression = await projectService.advanceAfterADMCompletion(project);
      if (progression.advanced) await project.save();
    } else if ([DEFENSE_TYPES.FINAL, 'paper'].includes(defenseType)) {
      await projectService.tryAutoArchiveProject(projectId);
    }

    // Notify team members that grades are available
    if (result.modifiedCount > 0 && project.teamId?.members) {
      const notifications = project.teamId.members.map((memberId) => ({
        userId: memberId,
        type: 'evaluation_released',
        title: 'Defense Grades Released',
        message: `Your ${defenseType} defense evaluation grades have been released.`,
        metadata: {
          projectId,
          defenseType,
          isArchived: project.isArchived,
        },
      }));
      const releasedNotifs = await Notification.insertMany(notifications);
      releasedNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
    }

    emitToProject(projectId, 'defense:scores_released', { projectId, defenseType });

    return { releasedCount: result.modifiedCount, isArchived: project.isArchived };
  }

  /* ═══════════════════ Read ═══════════════════ */

  /**
   * Get all evaluations for a project's defense.
   * Faculty see all; students see only released evaluations.
   *
   * @param {Object} user - The authenticated user
   * @param {string} projectId - The project
   * @param {string} defenseType - 'proposal' or 'final'
   * @returns {Object} { evaluations, summary }
   */
  async getProjectEvaluations(user, projectId, defenseType) {
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    const query = { projectId, defenseType };

    // Students can only see released evaluations for their own team's project
    if (user.role === ROLES.STUDENT) {
      const Team = (await import('../teams/team.model.js')).default;
      const team = project.teamId
        ? await Team.findById(project.teamId).select('members leaderId').lean()
        : null;
      const userIdStr = (user._id || user.id || '').toString();
      const isMember =
        project.memberRoleAssignments?.some((m) => m.userId?.toString() === userIdStr) ||
        team?.members?.some((m) => (m?._id || m)?.toString() === userIdStr) ||
        (team?.leaderId?._id || team?.leaderId)?.toString() === userIdStr;
      if (!isMember && !project.isArchived) {
        throw new AppError(
          'You do not have permission to view evaluations for this project.',
          403,
          'FORBIDDEN',
        );
      }
      query.status = EVALUATION_STATUSES.RELEASED;
    }

    const evaluations = await Evaluation.find(query)
      .populate('panelistId', 'firstName lastName email')
      .sort({ createdAt: 1 });

    // Compute summary: average across all submitted/released evaluations
    const scoredEvals = evaluations.filter(
      (e) => typeof e.totalScore === 'number' && !isNaN(e.totalScore),
    );
    const summary = {
      totalPanelists: evaluations.length,
      submittedCount: scoredEvals.length,
      averageScore:
        scoredEvals.length > 0
          ? Math.round(
              (scoredEvals.reduce((sum, e) => sum + e.totalScore, 0) / scoredEvals.length) * 100,
            ) / 100
          : null,
      averageMaxScore:
        scoredEvals.length > 0
          ? Math.round(
              (scoredEvals.reduce((sum, e) => sum + (e.maxTotalScore || 100), 0) /
                scoredEvals.length) *
                100,
            ) / 100
          : null,
      averagePercentage: null,
    };

    if (summary.averageScore !== null && summary.averageMaxScore > 0) {
      summary.averagePercentage =
        Math.round((summary.averageScore / summary.averageMaxScore) * 10000) / 100;
      summary.buksuGrade = computeBukSUGrade(summary.averagePercentage);
    } else {
      summary.buksuGrade = null;
    }

    const mappedEvaluations = evaluations.map((e) => {
      const obj = e.toObject ? e.toObject() : { ...e };
      if (
        (!obj.percentage || !obj.buksuGrade) &&
        typeof obj.totalScore === 'number' &&
        obj.maxTotalScore > 0
      ) {
        obj.percentage = Math.round((obj.totalScore / obj.maxTotalScore) * 10000) / 100;
        obj.buksuGrade = computeBukSUGrade(obj.percentage);
      }
      return obj;
    });

    return { evaluations: mappedEvaluations, summary };
  }

  /**
   * Get a single evaluation by ID.
   *
   * @param {string} evaluationId
   * @param {Object} [user] - Optional authenticated user for RBAC/team verification
   * @returns {Object} { evaluation }
   */
  async getEvaluation(evaluationId, user = null) {
    const evaluation = await Evaluation.findById(evaluationId)
      .populate('panelistId', 'firstName lastName email')
      .populate('projectId', 'title teamId memberRoleAssignments isArchived');

    if (!evaluation) throw new AppError('Evaluation not found.', 404, 'EVALUATION_NOT_FOUND');

    if (user?.role === ROLES.STUDENT) {
      const project = evaluation.projectId;
      const Team = (await import('../teams/team.model.js')).default;
      const team = project?.teamId
        ? await Team.findById(project.teamId).select('members leaderId').lean()
        : null;
      const userIdStr = (user._id || user.id || '').toString();
      const isMember =
        project?.memberRoleAssignments?.some((m) => m.userId?.toString() === userIdStr) ||
        team?.members?.some((m) => (m?._id || m)?.toString() === userIdStr) ||
        (team?.leaderId?._id || team?.leaderId)?.toString() === userIdStr;

      if (!isMember && !project?.isArchived) {
        throw new AppError(
          'You do not have permission to view this evaluation.',
          403,
          'FORBIDDEN',
        );
      }

      if (evaluation.status !== EVALUATION_STATUSES.RELEASED) {
        throw new AppError(
          'This evaluation has not been released to students yet.',
          403,
          'FORBIDDEN',
        );
      }
    }

    return { evaluation };
  }

  /**
   * Grade Visibility Guard — Retrieve consolidated defense grades for students.
   * Locked until all assigned panelists have submitted their criteria ratings and remarks.
   */
  async getStudentConsolidatedGrades(user, projectId, defenseType = 'proposal') {
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    const assignedPanelistIds = getAssignedPanelistIds(project);

    // Fetch submitted or released evaluations
    const submittedEvaluations = await Evaluation.find({
      projectId,
      defenseType,
      ...(assignedPanelistIds.length ? { panelistId: { $in: assignedPanelistIds } } : {}),
      status: { $in: [EVALUATION_STATUSES.SUBMITTED, EVALUATION_STATUSES.RELEASED] },
    }).select('panelistId');

    const submittedPanelistIds = new Set(submittedEvaluations.map((evaluation) => toUserId(evaluation.panelistId)));
    const allAssignedPanelistsSubmitted = assignedPanelistIds.length
      ? assignedPanelistIds.every((panelistId) => submittedPanelistIds.has(panelistId))
      : submittedEvaluations.length >= 1;

    if (user.role === ROLES.STUDENT && !allAssignedPanelistsSubmitted) {
      throw new AppError(
        'Defense results and grading rubrics are locked. Scores will be made visible once all panel members have submitted their criteria ratings and final remarks.',
        403,
        'GRADES_LOCKED_PENDING_PANEL_COMPLETION',
      );
    }

    return this.getProjectEvaluations(user, projectId, defenseType);
  }

  /**
   * Generate a structured evaluation report for a project defense (FRINS6).
   * Includes all panelist scores, decisions, and overall comments.
   *
   * @param {string} projectId
   * @param {string} defenseType
   * @returns {Object} { report }
   */
  async generateReport(projectId, defenseType) {
    const project = await Project.findById(projectId)
      .populate('teamId', 'name members')
      .populate('adviserId', 'firstName lastName')
      .populate('panelistIds', 'firstName lastName facultyRole')
      .populate('panelists.userId', 'firstName lastName facultyRole');
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    const evaluations = await Evaluation.find({ projectId, defenseType })
      .populate('panelistId', 'firstName lastName facultyRole')
      .sort({ createdAt: 1 });

    const assignedById = new Map();
    for (const panelist of project.panelistIds || []) {
      if (panelist?._id) assignedById.set(String(panelist._id), panelist);
    }
    // Older projects may only have the structured assignments populated.
    for (const assignment of project.panelists || []) {
      const user = assignment.userId;
      if (assignment.role?.toLowerCase() !== 'secretary' && user?._id) {
        assignedById.set(String(user._id), user);
      }
    }

    const evaluationByPanelistId = new Map(
      evaluations.map((evaluation) => [
        String(evaluation.panelistId?._id || evaluation.panelistId),
        evaluation,
      ]),
    );
    const reportRows = [...assignedById.entries()].map(([panelistId, panelist]) => {
      const ev = evaluationByPanelistId.get(panelistId);
      const assignment = (project.panelists || []).find(
        (item) => String(item.userId?._id || item.userId) === panelistId,
      );
      if (!ev) {
        return {
          panelistName:
            `${panelist.firstName || ''} ${panelist.lastName || ''}`.trim() || 'Unknown',
          panelRole: assignment?.role || 'member',
          status: 'pending',
          decision: null,
          totalScore: null,
          maxTotalScore: null,
          percentage: null,
          buksuGrade: null,
          overallComment: '',
          submittedAt: null,
          criteria: [],
        };
      }
      const percentage =
        typeof ev.totalScore === 'number' && ev.maxTotalScore > 0
          ? Math.round((ev.totalScore / ev.maxTotalScore) * 10000) / 100
          : null;
      return {
        panelistName:
          `${panelist.firstName || ''} ${panelist.lastName || ''}`.trim() || 'Unknown',
        panelRole: assignment?.role || 'member',
        status: ev.status,
        decision: ev.decision,
        totalScore: ev.totalScore,
        maxTotalScore: ev.maxTotalScore,
        percentage,
        buksuGrade: percentage !== null ? computeBukSUGrade(percentage) : null,
        overallComment: ev.overallComment,
        submittedAt: ev.submittedAt,
        criteria: ev.criteria.map((c) => ({
          name: c.name,
          maxScore: c.maxScore,
          score: c.score,
          comment: c.comment,
        })),
      };
    });

    const submittedRows = reportRows.filter((row) =>
      [EVALUATION_STATUSES.SUBMITTED, EVALUATION_STATUSES.RELEASED].includes(row.status),
    );
    const avgScore = submittedRows.length
      ? submittedRows.reduce((sum, row) => sum + (row.totalScore || 0), 0) /
        submittedRows.length
      : null;
    const avgMax = submittedRows.length
      ? submittedRows.reduce((sum, row) => sum + (row.maxTotalScore || 100), 0) /
        submittedRows.length
      : 100;
    const avgPercentage =
      avgScore !== null && avgMax > 0 ? Math.round((avgScore / avgMax) * 10000) / 100 : null;

    return {
      report: {
        projectId,
        projectTitle: project.title,
        defenseType,
        generatedAt: new Date().toISOString(),
        panelists: reportRows,
        summary: {
          totalPanelists: reportRows.length,
          submitted: submittedRows.length,
          averageScore: avgScore !== null ? Math.round(avgScore * 100) / 100 : null,
          averagePercentage: avgPercentage,
          buksuGrade: avgPercentage !== null ? computeBukSUGrade(avgPercentage) : null,
          overallDecision:
            assignedById.size > 0 &&
            submittedRows.length === assignedById.size &&
            submittedRows.every((row) =>
              [DEFENSE_DECISIONS.PASSED, DEFENSE_DECISIONS.PASSED_WITH_REVISIONS].includes(
                row.decision,
              ),
            )
              ? 'passed'
              : 'pending',
        },
      },
    };
  }
}

export default new EvaluationService();
