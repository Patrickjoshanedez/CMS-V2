import { z } from 'zod';

/**
 * Zod schemas for audit log query validation.
 */

export const queryLogsSchema = z.object({
  action: z.string().max(100).optional(),
  actor: z.string().optional(),
  targetType: z
    .enum(['User', 'Team', 'Project', 'Submission', 'Evaluation', 'Settings', 'System'])
    .optional(),
  targetId: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).optional().or(z.string().date().optional()),
  endDate: z.string().datetime({ offset: true }).optional().or(z.string().date().optional()),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});
