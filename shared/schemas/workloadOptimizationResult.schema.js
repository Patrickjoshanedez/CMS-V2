/**
 * WorkloadOptimizationResultSchema — Shared Zod validation schema.
 *
 * Defines the authoritative, cross-domain contract for the workload optimization
 * result payload. Both the Node.js backend (strategy execution) and the React
 * frontend (OptimizationEngine component) import this schema directly from the
 * shared monorepo package, eliminating schema drift and ensuring end-to-end
 * type safety without duplication.
 *
 * @module shared/schemas/workloadOptimizationResult.schema
 */
import { z } from 'zod';

/**
 * Schema for a single workload reassignment suggestion.
 */
export const WorkloadSuggestionSchema = z.object({
  fromAdviserId: z.union([z.string(), z.any()]).transform(String),
  fromAdviserName: z.string().min(1),
  toAdviserId: z.union([z.string(), z.any()]).transform(String),
  toAdviserName: z.string().min(1),
  action: z.string().min(1),
  estimatedScoreGapReduction: z.number().nonnegative(),
  restrictionNote: z.string().optional(),
});

/**
 * Schema for the adviser snapshot included in the optimization result.
 */
export const AdviserSnapshotSchema = z.object({
  heaviest: z.object({
    adviserId: z.union([z.string(), z.any()]).transform(String),
    adviserName: z.string(),
    workloadScore: z.number().nonnegative(),
    projectCount: z.number().int().nonnegative().optional(),
    pending: z.number().int().nonnegative().optional(),
    revisions: z.number().int().nonnegative().optional(),
    overdue: z.number().int().nonnegative().optional(),
  }),
  lightest: z.object({
    adviserId: z.union([z.string(), z.any()]).transform(String),
    adviserName: z.string(),
    workloadScore: z.number().nonnegative(),
    projectCount: z.number().int().nonnegative().optional(),
    pending: z.number().int().nonnegative().optional(),
    revisions: z.number().int().nonnegative().optional(),
    overdue: z.number().int().nonnegative().optional(),
  }),
  scoreGap: z.number().nonnegative(),
  criticalOverloadCount: z.number().int().nonnegative().optional(),
});

/**
 * Primary result schema for the workload optimization endpoint.
 * Returned by POST /api/dashboard/instructor/optimize.
 */
export const WorkloadOptimizationResultSchema = z.object({
  /** The name of the concrete strategy that produced this result. */
  strategy: z.string().min(1),
  /** Whether actionable suggestions were generated. */
  suggested: z.boolean(),
  /** Human-readable explanation of the optimization decision. */
  reason: z.string().min(1),
  /** List of concrete reassignment actions (may be empty). */
  suggestions: z.array(WorkloadSuggestionSchema),
  /** Adviser workload snapshot used during analysis, or null if unavailable. */
  snapshot: AdviserSnapshotSchema.nullable(),
});

/**
 * Inferred TypeScript-compatible type for the optimization result.
 * Use z.infer<typeof WorkloadOptimizationResultSchema> in TypeScript contexts.
 *
 * @typedef {z.infer<typeof WorkloadOptimizationResultSchema>} WorkloadOptimizationResult
 */
