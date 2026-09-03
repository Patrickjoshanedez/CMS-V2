import { z } from 'zod';

const deckSectionSchema = z
  .string()
  .trim()
  .min(2, 'Each deck section must be at least 2 characters long');

export const generateDeckSchema = z.object({
  proposalId: z.string().trim().min(1, 'Proposal ID is required'),
  title: z.string().trim().min(5, 'Proposal title must be at least 5 characters').max(300),
  deckData: z.object({
    problemStatement: deckSectionSchema,
    proposedSolution: deckSectionSchema,
    uniqueContribution: deckSectionSchema,
    targetUsers: deckSectionSchema,
    expectedImpact: deckSectionSchema,
  }),
});
