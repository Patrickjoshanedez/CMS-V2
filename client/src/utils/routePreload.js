/**
 * Route Preloader Utility for BukSU CMS-V2
 * Allows dynamic code-split chunk prefetching on button hover, focus, or click.
 */

// Registry of route loaders matching App.jsx lazy components
const routeLoaders = {
  '/login': () => import('../pages/auth/LoginPage'),
  '/register': () => import('../pages/auth/RegisterPage'),
  '/verify-otp': () => import('../pages/auth/VerifyOtpPage'),
  '/forgot-password': () => import('../pages/auth/ForgotPasswordPage'),
  '/reset-password': () => import('../pages/auth/ResetPasswordPage'),
  '/dashboard': () => import('../pages/dashboard/DashboardPage'),
  '/teams': () => import('../pages/teams/TeamsPage'),
  '/team': () => import('../pages/teams/TeamsPage'),
  '/users': () => import('../pages/users/UsersPage'),
  '/admin/users': () => import('../pages/users/UsersPage'),
  '/profile': () => import('../pages/profile/ProfilePage'),
  '/settings': () => import('../pages/settings/SettingsPage'),
  '/notifications': () => import('../pages/notifications/NotificationsPage'),
  '/project/create': () => import('../pages/projects/CreateProjectPage'),
  '/project': () => import('../pages/projects/MyProjectPage'),
  '/projects': () => import('../pages/projects/ProjectsPage'),
  '/projects/:id': () => import('../pages/projects/ProjectDetailPage'),
  '/projects/:projectId/certificate': () => import('../pages/projects/CertificatePage'),
  '/archive': () => import('../pages/archive/ArchiveSearchPage'),
  '/plagiarism-checker': () => import('../pages/plagiarism/ArchivePlagiarismCheckerPage'),
  '/archive/upload/capstone': () => import('../pages/archive/ExistingCapstoneUploadPage'),
  '/archive/upload/academic-paper': () => import('../pages/archive/AcademicPaperArchiveUploadPage'),
  '/archive/upload/academic-journal': () =>
    import('../pages/archive/AcademicJournalArchiveUploadPage'),
  '/reports': () => import('../pages/reports/ReportsPage'),
  '/reports/bulk-upload': () => import('../pages/archive/ExistingCapstoneUploadPage'),
  '/admin/audit': () => import('../pages/admin/AuditLogPage'),
  '/admin/audit-log': () => import('../pages/admin/AuditLogPage'),
  '/admin/evaluation-templates': () => import('../pages/admin/EvaluationTemplateBuilderPage'),
  '/documents/manuscripts': () => import('../pages/documents/TemplateManagementPage'),
  '/documents/templates': () => import('../pages/documents/TemplateManagementPage'),
  '/projects/:projectId/documents/:docIdOrType': () =>
    import('../pages/documents/DocumentEditorPage'),
  '/adviser/team-review': () => import('../pages/adviser/TeamReviewWorkflowPage'),
  '/project/submissions': () => import('../pages/submissions/ProjectSubmissionsPage'),
  '/project/submissions/upload': () => import('../pages/submissions/ChapterUploadPage'),
  '/project/proposal': () => import('../pages/submissions/ProposalCompilationPage'),
  '/project/submissions/:submissionId': () => import('../pages/submissions/SubmissionDetailPage'),
  '/project/submissions/:submissionId/review': () =>
    import('../pages/submissions/SubmissionReviewPage'),
  '/project/submissions/:submissionId/plagiarism-report': () =>
    import('../pages/submissions/PlagiarismReportPage'),
  '/forbidden': () => import('../pages/ForbiddenPage'),
  '/': () => import('../pages/LandingPage'),
};

const preloadedRoutes = new Set();

/**
 * Normalizes a route path or URL string by removing query parameters and hash,
 * and finding the closest route pattern.
 * @param {string} path - Target path (e.g., "/projects?filter=advisees" or "/dashboard")
 * @returns {string} - Normalized path
 */
export function normalizeRoutePath(path) {
  if (!path || typeof path !== 'string') return '';
  const cleanPath = path.split('?')[0].split('#')[0].trim();
  return cleanPath;
}

/**
 * Finds the matching loader function for a given route.
 * @param {string} path - Destination path
 * @returns {(() => Promise<any>)|null}
 */
export function getRouteLoader(path) {
  const normalized = normalizeRoutePath(path);
  if (!normalized) return null;

  // Direct exact match
  if (routeLoaders[normalized]) {
    return routeLoaders[normalized];
  }

  // Dynamic route matches (e.g., /projects/123 -> /projects/:id)
  if (
    normalized.startsWith('/projects/') &&
    !normalized.includes('/certificate') &&
    !normalized.includes('/documents/')
  ) {
    return routeLoaders['/projects/:id'] || null;
  }

  // Prefix match fallback
  for (const [routePattern, loader] of Object.entries(routeLoaders)) {
    if (normalized === routePattern || normalized.startsWith(`${routePattern}/`)) {
      return loader;
    }
  }

  return null;
}

/**
 * Asynchronously preloads a route's code-split chunk in the background.
 * @param {string} path - The route path to preload
 * @returns {Promise<any>|null}
 */
export function preloadRoute(path) {
  const normalized = normalizeRoutePath(path);
  if (!normalized || preloadedRoutes.has(normalized)) {
    return null;
  }

  const loader = getRouteLoader(normalized);
  if (!loader) {
    return null;
  }

  preloadedRoutes.add(normalized);
  return loader().catch((error) => {
    // If preloading fails (e.g. offline), remove from cache so retry is possible
    preloadedRoutes.delete(normalized);
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(`[RoutePreload] Failed to preload chunk for "${normalized}":`, error);
    }
  });
}

/**
 * Check if a route has already been preloaded into browser memory.
 * @param {string} path
 * @returns {boolean}
 */
export function isRoutePreloaded(path) {
  return preloadedRoutes.has(normalizeRoutePath(path));
}
