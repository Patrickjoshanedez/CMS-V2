/**
 * React Query hooks for the Plagiarism / Originality module.
 *
 * Provides a query hook that polls the plagiarism result for a submission
 * until it reaches a terminal state (completed or failed).
 */
import { useQuery } from '@tanstack/react-query';
import { plagiarismService } from '../services/plagiarismService';
import { PLAGIARISM_STATUSES } from '@cms/shared';

/* ────────── Query Keys ────────── */

export const plagiarismKeys = {
  all: ['plagiarism'],
  details: () => [...plagiarismKeys.all, 'detail'],
  detail: (submissionId) => [...plagiarismKeys.details(), submissionId],
};

/* ────────── Query Hooks ────────── */

/**
 * Fetch — and optionally poll — the plagiarism result for a submission.
 *
 * While the check is still queued or processing the hook automatically
 * refetches every `pollInterval` ms (default 5 s).  Once the status
 * reaches COMPLETED or FAILED, polling stops.
 *
 * @param {string}  submissionId  - The submission to query.
 * @param {Object}  [options]     - Extra useQuery options.
 * @param {number}  [options.pollInterval=5000] - Polling interval in ms.
 */
export function usePlagiarismResult(submissionId, options = {}) {
  const { pollInterval = 5000, ...queryOptions } = options;

  return useQuery({
    queryKey: plagiarismKeys.detail(submissionId),
    queryFn: async () => {
      const { data } = await plagiarismService.getPlagiarismStatus(submissionId);
      return data.data.plagiarismResult;
    },
    enabled: !!submissionId,

    // Poll while the check is still in progress
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === PLAGIARISM_STATUSES.QUEUED || status === PLAGIARISM_STATUSES.PROCESSING) {
        return pollInterval;
      }
      return false; // stop polling on COMPLETED / FAILED / undefined
    },

    // Keep stale data visible while refetching
    staleTime: 30_000,

    ...queryOptions,
  });
}
