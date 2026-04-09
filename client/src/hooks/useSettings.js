import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import settingsService from '@/services/settingsService';

/**
 * React Query hooks for system settings.
 */

export const settingsKeys = {
  all: ['settings'],
  detail: () => [...settingsKeys.all, 'detail'],
};

/**
 * Fetch current system settings.
 * Caches for 5 minutes since settings change infrequently.
 *
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: async () => {
      const res = await settingsService.getSettings();
      return res.data?.data || res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation hook to update system settings.
 * Invalidates settings cache on success.
 *
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      const res = await settingsService.updateSettings(updates);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
