/**
 * Zod validation schemas for evaluation endpoints.
 * Validates request body, query params, and URL params.
 */
import { z } from 'zod';
import { DEFENSE_TYPE_VALUES, DEFENSE_DECISION_VALUES } from '@cms/shared';

/* ═══════════════════ Reusable fields ═══════════════════ */

const objectIdField = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');

/* ═══════════════════ Params ═══════════════════ */

export const projectDefenseParamSchema = z.object({
  projectId: objectIdField,
  defenseType: z.enum(DEFENSE_TYPE_VALUES, {
    errorMap: () => ({
      message: 'Defense type must be "proposal", "midterm", "paper", or "final"',
    }),
  }),
});

export const evaluationIdParamSchema = z.object({
  evaluationId: objectIdField,
});

export const unlockEvaluationSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Unlock reason must be at least 10 characters')
    .max(1000, 'Unlock reason must not exceed 1000 characters'),
});

export const projectIdParamSchema = z.object({
  projectId: objectIdField,
});

/* ═══════════════════ Body ═══════════════════ */

const criterionSchema = z.object({
  name: z.string().trim().min(1, 'Criterion name is required').max(200),
  maxScore: z.number().int().min(1).max(100),
  score: z.number().min(0).max(100).nullable().optional(),
  comment: z.string().trim().max(500).optional().default(''),
});

export const updateEvaluationSchema = z.object({
  criteria: z.array(criterionSchema).min(1).max(20).optional(),
  overallComment: z.string().trim().max(2000).optional(),
  decision: z.enum(DEFENSE_DECISION_VALUES).nullable().optional(),
});
