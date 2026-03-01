import api from './api';

/**
 * Service layer for audit log API.
 * Communicates with /api/audit endpoints.
 */
const auditService = {
  /**
   * Query audit logs with filters and pagination.
   * @param {Object} [params]
   * @param {string} [params.action] - Filter by action (regex)
   * @param {string} [params.actor] - Filter by actor user ID
   * @param {string} [params.targetType] - e.g. 'User', 'Project', 'Submission'
   * @param {string} [params.targetId] - Filter by target entity ID
   * @param {string} [params.startDate] - ISO date string
   * @param {string} [params.endDate] - ISO date string
   * @param {number} [params.page] - Page number (default 1)
   * @param {number} [params.limit] - Results per page (default 50)
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  queryLogs: (params = {}) => api.get('/audit', { params }),

  /**
   * Get the audit trail for a specific entity.
   * @param {string} targetType - e.g. 'User', 'Project'
   * @param {string} targetId - MongoDB ObjectId
   * @param {number} [limit=20] - Max results
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getEntityHistory: (targetType, targetId, limit = 20) =>
    api.get(`/audit/${targetType}/${targetId}`, { params: { limit } }),
};

export default auditService;
