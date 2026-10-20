import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reviewSubmission } = vi.hoisted(() => ({ reviewSubmission: vi.fn() }));

vi.mock('../services/submissionService', () => ({
  submissionService: { reviewSubmission },
}));

import { dashboardKeys } from './useDashboard';
import { useReviewSubmission } from './useSubmissions';

describe('useSubmissionMutation', () => {
  beforeEach(() => {
    reviewSubmission.mockReset().mockResolvedValue({ data: { status: 'approved' } });
  });

  it('invalidates dashboard data after a submission review changes progress', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useReviewSubmission(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ submissionId: 'submission-1', status: 'approved' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
    queryClient.clear();
  });
});
