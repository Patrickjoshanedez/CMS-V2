import api from './api';

/**
 * Dashboard API service — all dashboard-related HTTP calls.
 *
 * Covers: role-aware dashboard stats, adviser workload, adviser analytics.
 */
export const dashboardService = {
  /* ────── General Dashboard ────── */

  /**
   * Get dashboard statistics based on user role.
   * Returns role-specific data (student, adviser, instructor, panelist).
   */
  getStats: () => api.get('/dashboard/stats'),

  /* ────── PHASE 2: Adviser Dashboard ────── */

  /**
   * Get adviser's detailed workload.
   * Returns: students awaiting review, under review, overdue, upcoming deadlines.
   */
  getAdviserWorkload: () => api.get('/dashboard/adviser/workload'),

  /**
   * Get adviser's review analytics.
   * Returns: approval rate, review velocity, avg review time, breakdown by status.
   */
  getAdviserAnalytics: () => api.get('/dashboard/adviser/analytics'),

  /* ────── PHASE 3: Panelist Dashboard ────── */

  /**
   * Get panelist topic cards: assigned and available projects.
   */
  getPanelistTopics: () => api.get('/dashboard/panelist/topics'),

  /**
   * Select a project/topic for paneling.
   * @param {string} projectId
   */
  selectPanelistTopic: (projectId) => api.post(`/dashboard/panelist/topics/${projectId}/select`),

  /* ────── PHASE 4: Instructor Command Center ────── */

  /** Get instructor KPI cards data. */
  getInstructorKpis: () => api.get('/dashboard/instructor/kpis'),

  /** Get cross-adviser workload matrix for instructor. */
  getInstructorWorkload: () => api.get('/dashboard/instructor/workload'),

  /** Get workload balancing suggestions. */
  optimizeInstructorWorkload: () => api.post('/dashboard/instructor/optimize'),
};
