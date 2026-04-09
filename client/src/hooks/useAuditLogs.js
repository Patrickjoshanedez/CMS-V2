import { useQuery } from '@tanstack/react-query';
import auditService from '@/services/auditService';

/**
 * React Query hooks for audit logs.
 */

export const auditKeys = {
  all: ['audit'],
  logs: (filters) => [...auditKeys.all, 'logs', filters],
  entity: (targetType, targetId) => [...auditKeys.all, 'entity', targetType, targetId],
};

const unwrapEnvelopeData = (payload) => payload?.data || payload;

/**
 * Fetch paginated audit logs with optional filters.
 * Enabled by default for auto-refreshing audit table views; pass options.enabled=false to opt out.
 *
 * @param {Object} filters - See auditService.queryLogs params
 * @param {Object} [options] - Additional React Query options
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useAuditLogs(filters = {}, options = {}) {
  return useQuery({
    queryKey: auditKeys.logs(filters),
    queryFn: async () => {
      const res = await auditService.queryLogs(filters);
      return unwrapEnvelopeData(res.data);
    },
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
    ...options,
  });
}

/**
 * Fetch the audit history for a specific entity.
 *
 * @param {string} targetType - e.g. 'Project', 'User'
 * @param {string} targetId - MongoDB ObjectId
 * @param {number} [limit=20]
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useEntityAuditHistory(targetType, targetId, limit = 20) {
  return useQuery({
    queryKey: auditKeys.entity(targetType, targetId),
    queryFn: async () => {
      const res = await auditService.getEntityHistory(targetType, targetId, limit);
      return unwrapEnvelopeData(res.data);
    },
    enabled: !!targetType && !!targetId,
    staleTime: 30 * 1000,
  });
}
