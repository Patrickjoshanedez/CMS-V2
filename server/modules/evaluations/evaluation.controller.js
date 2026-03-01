/**
 * EvaluationController — Thin handlers delegating to EvaluationService.
 *
 * Each handler:
 *  1. Extracts data from req (params, body, user)
 *  2. Delegates to the service layer
 *  3. Returns a consistent JSON response
 */
import evaluationService from './evaluation.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';

/* ═══════════════════ Panelist ═══════════════════ */

/** GET /api/evaluations/:projectId/:defenseType — Get or create a draft evaluation */
export const getOrCreateEvaluation = catchAsync(async (req, res) => {
  const { evaluation } = await evaluationService.getOrCreateEvaluation(
    req.user._id,
    req.params.projectId,
    req.params.defenseType,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { evaluation },
  });
});

/** PATCH /api/evaluations/:evaluationId — Update draft evaluation criteria/comments */
export const updateEvaluation = catchAsync(async (req, res) => {
  const { evaluation } = await evaluationService.updateEvaluation(
    req.user._id,
    req.params.evaluationId,
    req.body,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Evaluation updated successfully.',
    data: { evaluation },
  });
});

/** POST /api/evaluations/:evaluationId/submit — Submit a draft evaluation */
export const submitEvaluation = catchAsync(async (req, res) => {
  const { evaluation } = await evaluationService.submitEvaluation(
    req.user._id,
    req.params.evaluationId,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Evaluation submitted successfully.',
    data: { evaluation },
  });
});

/* ═══════════════════ Instructor ═══════════════════ */

/** POST /api/evaluations/:projectId/:defenseType/release — Release evaluations to students */
export const releaseEvaluations = catchAsync(async (req, res) => {
  const { releasedCount } = await evaluationService.releaseEvaluations(
    req.params.projectId,
    req.params.defenseType,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `${releasedCount} evaluation(s) released to students.`,
    data: { releasedCount },
  });
});

/* ═══════════════════ Read ═══════════════════ */

/** GET /api/evaluations/project/:projectId/:defenseType — List all evaluations for a defense */
export const getProjectEvaluations = catchAsync(async (req, res) => {
  const { evaluations, summary } = await evaluationService.getProjectEvaluations(
    req.user,
    req.params.projectId,
    req.params.defenseType,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { evaluations, summary },
  });
});

/** GET /api/evaluations/:evaluationId — Get a single evaluation */
export const getEvaluation = catchAsync(async (req, res) => {
  const { evaluation } = await evaluationService.getEvaluation(req.params.evaluationId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { evaluation },
  });
});
