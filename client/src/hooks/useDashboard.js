import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/authService';

/**
 * React Query hooks for the dashboard stats endpoint.
 */

export const dashboardKeys = {
  all: ['dashboard'],
  stats: () => [...dashboardKeys.all, 'stats'],
};

/**
 * Fetch role-aware dashboard statistics.
 * Automatically refetches every 60 seconds and caches for 30 seconds.
 *
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      const res = await dashboardService.getStats();
      return res.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
