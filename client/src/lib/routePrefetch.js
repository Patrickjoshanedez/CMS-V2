/**
 * Route Prefetching Engine — Anticipatory Chunk Pre-caching
 *
 * Pre-fetches lazy route chunks on hover or focus so route transitions
 * occur in < 100ms without noticeable network loading delay.
 */

const PREFETCH_CACHE = new Set();

export const routeRegistry = {
  '/dashboard': () => import('../pages/dashboard/DashboardPage'),
  '/teams': () => import('../pages/teams/TeamsPage'),
  '/users': () => import('../pages/users/UsersPage'),
  '/profile': () => import('../pages/profile/ProfilePage'),
  '/settings': () => import('../pages/settings/SettingsPage'),
  '/notifications': () => import('../pages/notifications/NotificationsPage'),
  '/project': () => import('../pages/projects/MyProjectPage'),
  '/project/create': () => import('../pages/projects/CreateProjectPage'),
  '/project/approval': () => import('../pages/projects/TitleApprovalPage'),
  '/project/submissions': () => import('../pages/submissions/ProjectSubmissionsPage'),
  '/projects': () => import('../pages/projects/ProjectsPage'),
  '/archive': () => import('../pages/archive/ArchiveSearchPage'),
  '/archive/document': () => import('../pages/archive/ArchiveDocumentViewerPage'),
  '/archive/upload': () => import('../pages/archive/ExistingCapstoneUploadPage'),
  '/archive/upload/academic-paper': () => import('../pages/archive/AcademicPaperArchiveUploadPage'),
  '/archive/upload/academic-journal': () =>
    import('../pages/archive/AcademicJournalArchiveUploadPage'),
  '/reports': () => import('../pages/reports/ReportsPage'),
  '/audit-logs': () => import('../pages/admin/AuditLogPage'),
  '/evaluation-templates': () => import('../pages/admin/EvaluationTemplateBuilderPage'),
  '/templates': () => import('../pages/documents/TemplateManagementPage'),
  '/plagiarism-checker': () => import('../pages/plagiarism/ArchivePlagiarismCheckerPage'),
  '/defense-scheduling': () => import('../pages/instructor/DefenseSchedulingPage'),
};

/**
 * Prefetches a route's code chunk if it has a registered dynamic loader.
 * Safe to call multiple times; cached after first invocation.
 *
 * @param {string} path - Target path e.g. '/dashboard'
 */
export function prefetchRoute(path) {
  if (!path || typeof path !== 'string') return;

  // Clean path of query parameters or trailing slashes
  const cleanPath = path.split('?')[0].replace(/\/$/, '') || '/';

  if (PREFETCH_CACHE.has(cleanPath)) return;

  const loader = routeRegistry[cleanPath];
  if (typeof loader === 'function') {
    PREFETCH_CACHE.add(cleanPath);
    // Execute dynamic import in low-priority idle callback or microtask
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        loader().catch(() => {
          PREFETCH_CACHE.delete(cleanPath);
        });
      });
    } else {
      setTimeout(() => {
        loader().catch(() => {
          PREFETCH_CACHE.delete(cleanPath);
        });
      }, 0);
    }
  }
}

/**
 * Hook or helper attributes to attach to anchor or navigation buttons
 *
 * @param {string} to - Destination path
 * @returns {Object} onMouseEnter and onFocus handlers
 */
export function prefetchHandlers(to) {
  return {
    onMouseEnter: () => prefetchRoute(to),
    onFocus: () => prefetchRoute(to),
  };
}

export default prefetchRoute;
