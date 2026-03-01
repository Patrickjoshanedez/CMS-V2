import { z } from 'zod';

/**
 * Zod schemas for system settings validation.
 */

export const updateSettingsSchema = z
  .object({
    plagiarismThreshold: z
      .number()
      .min(0, 'Plagiarism threshold must be at least 0')
      .max(100, 'Plagiarism threshold must be at most 100')
      .optional(),
    titleSimilarityThreshold: z
      .number()
      .min(0, 'Title similarity threshold must be at least 0')
      .max(1, 'Title similarity threshold must be at most 1')
      .optional(),
    maxFileSize: z
      .number()
      .min(1024, 'Max file size must be at least 1KB')
      .max(100 * 1024 * 1024, 'Max file size must be at most 100MB')
      .optional(),
    systemAnnouncement: z
      .string()
      .max(500, 'System announcement must be at most 500 characters')
      .optional(),
  })
  .strict();
