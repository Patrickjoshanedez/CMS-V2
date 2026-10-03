/**
 * Route Prefetching Engine — Anticipatory Chunk Pre-caching
 *
 * Pre-fetches lazy route chunks on hover or focus so route transitions
 * occur in < 100ms without noticeable network loading delay.
 */

const PREFETCH_CACHE = new Set();

export const routeRegistry = {
  '/login': () => import('../pages/auth/LoginPage'),
  '/register': () => import('../pages/auth/RegisterPage'),
  '/verify-otp': () => import('../pages/auth/VerifyOtpPage'),
  '/forgot-password': () => import('../pages/auth/ForgotPasswordPage'),
  '/reset-password': () => import('../pages/auth/ResetPasswordPage'),
  '/dashboard': () => import('../pages/dashboard/DashboardPage'),
  '/teams': () => import('../pages/teams/TeamsPage'),
  '/users': () => import('../pages/users/UsersPage'),
  '/profile': () => import('../pages/profile/ProfilePage'),
  '/settings': () => import('../pages/settings/SettingsPage'),
  '/notifications': () => import('../pages/notifications/NotificationsPage'),
  '/project': () => import('../pages/projects/MyProjectPage'),
  '/my-project': () => import('../pages/projects/MyProjectPage'),
  '/project/create': () => import('../pages/projects/CreateProjectPage'),
  '/project/approval': () => import('../pages/projects/TitleApprovalPage'),
  '/project/submissions': () => import('../pages/submissions/ProjectSubmissionsPage'),
  '/project/submissions/upload': () => import('../pages/submissions/ChapterUploadPage'),
  '/project/proposal': () => import('../pages/submissions/ProposalCompilationPage'),
  '/projects': () => import('../pages/projects/ProjectsPage'),
  '/secretary-review': () => import('../pages/projects/SecretaryReviewPage'),
  '/adviser/team-review': () => import('../pages/adviser/TeamReviewWorkflowPage'),
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
  '/scheduling-center': () => import('../pages/instructor/DefenseSchedulingPage'),
  '/committee-assignments': () => import('../pages/instructor/CommitteeAssignmentsPage'),
  '/forbidden': () => import('../pages/ForbiddenPage'),
};

/**
 * Registry of data prefetchers for high-traffic data views.
 */
export const dataPrefetchRegistry = {
  '/teams': (queryClient) => {
    if (!queryClient) return;
    import('../services/authService')
      .then(({ teamService }) => {
        queryClient
          .prefetchQuery({
            queryKey: ['teams', 'list', {}],
            queryFn: async () => {
              const { data } = await teamService.listTeams({});
              return data.data;
            },
            staleTime: 3 * 60 * 1000,
          })
          .catch(() => {});
      })
      .catch(() => {});
  },
  '/projects': (queryClient) => {
    if (!queryClient) return;
    import('../services/authService')
      .then(({ projectService }) => {
        // 1. Primary task category queue ('action_needed' is the default view)
        queryClient
          .prefetchQuery({
            queryKey: [
              'projects',
              'list',
              { excludeArchived: true, page: 1, limit: 10, actionNeeded: true },
            ],
            queryFn: async () => {
              const { data } = await projectService.listProjects({
                excludeArchived: true,
                page: 1,
                limit: 10,
                actionNeeded: true,
              });
              return data.data;
            },
            staleTime: 3 * 60 * 1000,
          })
          .catch(() => {});

        // 2. Background counter query across active projects
        queryClient
          .prefetchQuery({
            queryKey: ['projects', 'list', { excludeArchived: true, limit: 100 }],
            queryFn: async () => {
              const { data } = await projectService.listProjects({
                excludeArchived: true,
                limit: 100,
              });
              return data.data;
            },
            staleTime: 3 * 60 * 1000,
          })
          .catch(() => {});
      })
      .catch(() => {});
  },
  '/secretary-review': (queryClient) => {
    if (!queryClient) return;
    import('../services/authService')
      .then(({ projectService }) => {
        queryClient
          .prefetchQuery({
            queryKey: ['projects', 'list', { excludeArchived: false }],
            queryFn: async () => {
              const { data } = await projectService.listProjects({ excludeArchived: false });
              return data.data;
            },
            staleTime: 3 * 60 * 1000,
          })
          .catch(() => {});
      })
      .catch(() => {});
  },
  '/adviser/team-review': (queryClient) => {
    if (!queryClient) return;
    import('../services/dashboardService')
      .then(({ dashboardService }) => {
        queryClient
          .prefetchQuery({
            queryKey: ['adviserWorkload', 'teamReviewWorkflow'],
            queryFn: async () => {
              const res = await dashboardService.getAdviserWorkload();
              return res.data?.data || res.data;
            },
            staleTime: 3 * 60 * 1000,
          })
          .catch(() => {});
      })
      .catch(() => {});
  },
  '/dashboard': (queryClient) => {
    if (!queryClient) return;
    import('../services/dashboardService')
      .then(({ dashboardService }) => {
        queryClient
          .prefetchQuery({
            queryKey: ['dashboard', 'stats'],
            queryFn: async () => {
              const res = await dashboardService.getStats();
              return res.data?.data || res.data;
            },
            staleTime: 2 * 60 * 1000,
          })
          .catch(() => {});
      })
      .catch(() => {});
  },
};

/**
 * Prefetches a route's code chunk if it has a registered dynamic loader.
 * Safe to call multiple times; cached after first invocation.
 *
 * @param {string} path - Target path e.g. '/dashboard'
 * @param {Object} [queryClient] - Optional TanStack Query client for background data pre-warming
 */
export function prefetchRoute(path, queryClient) {
  if (!path || typeof path !== 'string') return;

  // Clean path of query parameters or trailing slashes
  const cleanPath = path.split('?')[0].replace(/\/$/, '') || '/';

  // Trigger optional data prefetch
  if (queryClient) {
    if (dataPrefetchRegistry[cleanPath]) {
      dataPrefetchRegistry[cleanPath](queryClient);
    } else if (
      (cleanPath.startsWith('/submissions/') || cleanPath.startsWith('/project/submissions/')) &&
      cleanPath.endsWith('/review')
    ) {
      // Dynamic submission review workspace pre-fetch
      const parts = cleanPath.split('/');
      const submissionId = parts[cleanPath.startsWith('/project/') ? 3 : 2];
      if (submissionId) {
        import('../services/authService')
          .then(({ submissionService }) => {
            queryClient
              .prefetchQuery({
                queryKey: ['submissions', 'review-workspace', submissionId],
                queryFn: async () => {
                  const { data } = await submissionService.getReviewWorkspace(submissionId);
                  return data.data.workspace;
                },
                staleTime: 3 * 60 * 1000,
              })
              .catch(() => {});
          })
          .catch(() => {});
      }
    }
  }

  if (PREFETCH_CACHE.has(cleanPath)) return;

  let loader = routeRegistry[cleanPath];
  if (!loader) {
    if (
      (cleanPath.startsWith('/submissions/') || cleanPath.startsWith('/project/submissions/')) &&
      cleanPath.endsWith('/review')
    ) {
      loader = () => import('../pages/submissions/SubmissionReviewPage');
    } else if (cleanPath.startsWith('/project/submissions/')) {
      loader = () => import('../pages/submissions/SubmissionDetailPage');
    } else if (cleanPath.startsWith('/projects/')) {
      loader = () => import('../pages/projects/ProjectDetailPage');
    }
  }

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
 * @param {Object} [queryClient] - Optional TanStack Query client
 * @returns {Object} onMouseEnter, onFocus, and onTouchStart handlers
 */
export function prefetchHandlers(to, queryClient) {
  return {
    onMouseEnter: () => prefetchRoute(to, queryClient),
    onFocus: () => prefetchRoute(to, queryClient),
    onTouchStart: () => prefetchRoute(to, queryClient),
  };
}

export default prefetchRoute;
