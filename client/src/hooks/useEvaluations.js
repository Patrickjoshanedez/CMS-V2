/**
 * React Query hooks for the Evaluations module.
 *
 * Provides query hooks (data fetching) and mutation hooks (write actions)
 * for defense evaluations: panelist scoring, submission, release, and retrieval.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evaluationService } from '../services/evaluationService';
import { projectKeys } from './useProjects';

/* ────────── Query Keys ────────── */

export const evaluationKeys = {
  all: ['evaluations'],
  lists: () => [...evaluationKeys.all, 'list'],
  byProject: (projectId, defenseType) => [...evaluationKeys.lists(), projectId, defenseType],
  details: () => [...evaluationKeys.all, 'detail'],
  detail: (id) => [...evaluationKeys.details(), id],
  my: (projectId, defenseType) => [...evaluationKeys.all, 'my', projectId, defenseType],
};

/* ────────── Query Hooks ────────── */

/**
 * Fetch (or create) the current panelist's evaluation for a project + defense type.
 */
export function useMyEvaluation(projectId, defenseType, options = {}) {
  return useQuery({
    queryKey: evaluationKeys.my(projectId, defenseType),
    queryFn: async () => {
      const { data } = await evaluationService.getMyEvaluation(projectId, defenseType);
      return data.data.evaluation;
    },
    enabled: !!projectId && !!defenseType,
    ...options,
  });
}

/**
 * Fetch all evaluations for a given project + defense type.
 * Students will only see released evaluations (enforced server-side).
 */
export function useProjectEvaluations(projectId, defenseType, options = {}) {
  return useQuery({
    queryKey: evaluationKeys.byProject(projectId, defenseType),
    queryFn: async () => {
      const { data } = await evaluationService.getProjectEvaluations(projectId, defenseType);
      return data.data; // { evaluations, summary }
    },
    enabled: !!projectId && !!defenseType,
    ...options,
  });
}

/**
 * Fetch a single evaluation by ID.
 */
export function useEvaluation(evaluationId, options = {}) {
  return useQuery({
    queryKey: evaluationKeys.detail(evaluationId),
    queryFn: async () => {
      const { data } = await evaluationService.getEvaluation(evaluationId);
      return data.data.evaluation;
    },
    enabled: !!evaluationId,
    ...options,
  });
}

/* ────────── Mutation Hooks ────────── */

/**
 * Shared mutation helper — invalidates both evaluation and project queries
 * after a successful mutation, since evaluations relate to projects.
 */
function useEvaluationMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      options.onSuccess?.(...args);
    },
    onError: options.onError,
    ...options,
  });
}

/**
 * Update evaluation scores/comments (panelist only, draft status).
 * Expects: { evaluationId, criteria: [{name, score, comment}], overallComment }
 */
export function useUpdateEvaluation(options = {}) {
  return useEvaluationMutation(async ({ evaluationId, ...data }) => {
    const res = await evaluationService.updateEvaluation(evaluationId, data);
    return res.data;
  }, options);
}

/**
 * Submit a completed evaluation (panelist only).
 * Expects: evaluationId
 */
export function useSubmitEvaluation(options = {}) {
  return useEvaluationMutation(async (evaluationId) => {
    const res = await evaluationService.submitEvaluation(evaluationId);
    return res.data;
  }, options);
}

/**
 * Release evaluations for a project + defense type (instructor only).
 * Expects: { projectId, defenseType }
 */
export function useReleaseEvaluations(options = {}) {
  return useEvaluationMutation(async ({ projectId, defenseType }) => {
    const res = await evaluationService.releaseEvaluations(projectId, defenseType);
    return res.data;
  }, options);
}
