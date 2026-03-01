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
import { emitToUser } from '../../services/socket.service.js';
import AppError from '../../utils/AppError.js';
import {
  ROLES,
  EVALUATION_STATUSES,
  DEFENSE_TYPES,
  PROJECT_STATUSES,
} from '@cms/shared';

class EvaluationService {
  /* ═══════════════════ Default Rubric ═══════════════════ */

  /**
   * Returns the default grading criteria for a given defense type.
   * Instructors/panelists can customize, but this provides a starting template.
   */
  getDefaultCriteria(defenseType) {
    if (defenseType === DEFENSE_TYPES.PROPOSAL) {
      return [
        { name: 'Problem Statement & Objectives', maxScore: 20, score: null, comment: '' },
        { name: 'Review of Related Literature', maxScore: 20, score: null, comment: '' },
        { name: 'Methodology & Design', maxScore: 20, score: null, comment: '' },
        { name: 'Feasibility & Significance', maxScore: 15, score: null, comment: '' },
        { name: 'Presentation & Communication', maxScore: 15, score: null, comment: '' },
        { name: 'Q&A / Defense of Proposal', maxScore: 10, score: null, comment: '' },
      ];
    }
    // Final defense criteria
    return [
      { name: 'System Functionality & Completeness', maxScore: 25, score: null, comment: '' },
      { name: 'Technical Implementation', maxScore: 20, score: null, comment: '' },
      { name: 'Documentation Quality', maxScore: 15, score: null, comment: '' },
      { name: 'Innovation & Contribution', maxScore: 15, score: null, comment: '' },
      { name: 'Presentation & Communication', maxScore: 15, score: null, comment: '' },
      { name: 'Q&A / Defense Responses', maxScore: 10, score: null, comment: '' },
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
    const isPanelist = project.panelistIds.some(
      (id) => id.toString() === panelistId.toString(),
    );
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

    // Compute totals
    evaluation.totalScore = evaluation.criteria.reduce((sum, c) => sum + c.score, 0);
    evaluation.maxTotalScore = evaluation.criteria.reduce((sum, c) => sum + c.maxScore, 0);
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

    return { evaluation };
  }

  /* ═══════════════════ Release Evaluations (Instructor) ═══════════════════ */

  /**
   * Release all submitted evaluations for a project's defense so students can view grades.
   * Only instructors can release.
   *
   * @param {string} projectId - The project
   * @param {string} defenseType - 'proposal' or 'final'
   * @returns {Object} { releasedCount }
   */
  async releaseEvaluations(projectId, defenseType) {
    const project = await Project.findById(projectId).populate('teamId');
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
        },
      }));
      const releasedNotifs = await Notification.insertMany(notifications);
      releasedNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
    }

    return { releasedCount: result.modifiedCount };
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

    // Students can only see released evaluations
    if (user.role === ROLES.STUDENT) {
      query.status = EVALUATION_STATUSES.RELEASED;
    }

    const evaluations = await Evaluation.find(query)
      .populate('panelistId', 'firstName lastName email')
      .sort({ createdAt: 1 });

    // Compute summary: average across all submitted/released evaluations
    const scoredEvals = evaluations.filter((e) => e.totalScore !== null);
    const summary = {
      totalPanelists: evaluations.length,
      submittedCount: scoredEvals.length,
      averageScore: scoredEvals.length > 0
        ? Math.round(
            (scoredEvals.reduce((sum, e) => sum + e.totalScore, 0) / scoredEvals.length) * 100,
          ) / 100
        : null,
      averageMaxScore: scoredEvals.length > 0
        ? Math.round(
            (scoredEvals.reduce((sum, e) => sum + e.maxTotalScore, 0) / scoredEvals.length) * 100,
          ) / 100
        : null,
      averagePercentage: null,
    };

    if (summary.averageScore !== null && summary.averageMaxScore > 0) {
      summary.averagePercentage =
        Math.round((summary.averageScore / summary.averageMaxScore) * 10000) / 100;
    }

    return { evaluations, summary };
  }

  /**
   * Get a single evaluation by ID.
   *
   * @param {string} evaluationId
   * @returns {Object} { evaluation }
   */
  async getEvaluation(evaluationId) {
    const evaluation = await Evaluation.findById(evaluationId)
      .populate('panelistId', 'firstName lastName email')
      .populate('projectId', 'title teamId');

    if (!evaluation) throw new AppError('Evaluation not found.', 404, 'EVALUATION_NOT_FOUND');
    return { evaluation };
  }
}

export default new EvaluationService();
