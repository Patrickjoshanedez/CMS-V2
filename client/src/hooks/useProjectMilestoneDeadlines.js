import { useQuery } from '@tanstack/react-query';
import settingsService from '@/services/settingsService';
import { getProjectMilestoneScope } from '@/utils/milestoneDeadlines';

export const projectMilestoneDeadlineKeys = {
  all: ['milestone-deadlines'],
  forProject: (batchYear, sectionId) => [
    'milestone-deadlines',
    'project-scope',
    batchYear,
    sectionId || 'batch-only',
  ],
};

/** Fetch deadline records scoped to the active project's batch and section. */
export function useProjectMilestoneDeadlines(project, options = {}) {
  const { batchYear, sectionId } = getProjectMilestoneScope(project);

  return useQuery({
    queryKey: projectMilestoneDeadlineKeys.forProject(batchYear, sectionId),
    queryFn: async () => {
      const params = { batchYear };
      if (sectionId) params.sectionId = sectionId;

      const response = await settingsService.getMilestoneDeadlines(params);
      const records = response?.data?.data ?? response?.data ?? [];
      return Array.isArray(records) ? records : [];
    },
    enabled: Boolean(batchYear) && (options.enabled ?? true),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
    ...options,
  });
}
