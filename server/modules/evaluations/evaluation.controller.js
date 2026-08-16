/**
 * EvaluationController — Thin handlers delegating to EvaluationService.
 *
 * Each handler:
 *  1. Extracts data from req (params, body, user)
 *  2. Delegates to the service layer
 *  3. Returns a consistent JSON response
 */
import evaluationService from './evaluation.service.js';
import { generateEvaluationReportPdf } from './evaluation.report.js';
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

/** POST /api/evaluations/:evaluationId/unlock — Reopen an evaluation for editing */
export const unlockEvaluation = catchAsync(async (req, res) => {
  const { evaluation } = await evaluationService.unlockEvaluation(
    req.user._id,
    req.params.evaluationId,
    req.body.reason,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Evaluation unlocked successfully.',
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

/** GET /api/evaluations/:evaluationId/pdf — Download official evaluation & similarity PDF report */
export const downloadEvaluationReportPdf = catchAsync(async (req, res) => {
  const pdfBytes = await generateEvaluationReportPdf(req.params.evaluationId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="evaluation-report-${req.params.evaluationId}.pdf"`,
  );
  res.send(Buffer.from(pdfBytes));
});

/** GET /api/evaluations/project/:projectId/consolidated-grades — Grade Visibility Guard */
export const getStudentConsolidatedGrades = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const { defenseType } = req.query;

  const result = await evaluationService.getStudentConsolidatedGrades(
    req.user,
    projectId,
    defenseType || 'proposal',
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    status: 'grades_released',
    data: result,
  });
});
