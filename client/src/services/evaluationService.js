import api from './api';

/**
 * Evaluation API service — all evaluation-related HTTP calls.
 *
 * Endpoints are mounted at /api/evaluations on the server.
 */

export const evaluationService = {
  /** Get or create the current panelist's evaluation (panelist only). */
  getMyEvaluation: (projectId, defenseType) =>
    api.get(`/evaluations/${projectId}/${defenseType}`),

  /** Update evaluation scores/comments (panelist only, draft status). */
  updateEvaluation: (evaluationId, data) =>
    api.patch(`/evaluations/${evaluationId}`, data),

  /** Submit a completed evaluation (panelist only). */
  submitEvaluation: (evaluationId) =>
    api.post(`/evaluations/${evaluationId}/submit`),

  /** Release all evaluations for a project + defense type (instructor only). */
  releaseEvaluations: (projectId, defenseType) =>
    api.post(`/evaluations/${projectId}/${defenseType}/release`),

  /** Get all evaluations for a project + defense type (RBAC: students see only released). */
  getProjectEvaluations: (projectId, defenseType) =>
    api.get(`/evaluations/project/${projectId}/${defenseType}`),

  /** Get a single evaluation by ID. */
  getEvaluation: (evaluationId) =>
    api.get(`/evaluations/detail/${evaluationId}`),
};
