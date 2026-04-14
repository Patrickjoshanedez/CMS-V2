import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from 'sonner';

// Lazy-loaded page imports
import { lazy, Suspense, useEffect, useRef } from 'react';

const isChunkLoadError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror') ||
    message.includes('mime type')
  );
};

const lazyPage = (importer) =>
  lazy(() =>
    importer().catch((error) => {
      if (typeof window !== 'undefined' && isChunkLoadError(error)) {
        const retryKey = `cms:chunk-reload:${window.location.pathname}`;
        const hasRetried = window.sessionStorage.getItem(retryKey) === '1';

        if (!hasRetried) {
          window.sessionStorage.setItem(retryKey, '1');
          window.location.reload();
          return new Promise(() => {});
        }

        window.sessionStorage.removeItem(retryKey);
      }

      throw error;
    }),
  );

const LoginPage = lazyPage(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazyPage(() => import('./pages/auth/RegisterPage'));
const VerifyOtpPage = lazyPage(() => import('./pages/auth/VerifyOtpPage'));
const ForgotPasswordPage = lazyPage(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazyPage(() => import('./pages/auth/ResetPasswordPage'));
const DashboardPage = lazyPage(() => import('./pages/dashboard/DashboardPage'));
const UsersPage = lazyPage(() => import('./pages/users/UsersPage'));
const ProfilePage = lazyPage(() => import('./pages/profile/ProfilePage'));
const SettingsPage = lazyPage(() => import('./pages/settings/SettingsPage'));
const NotificationsPage = lazyPage(() => import('./pages/notifications/NotificationsPage'));
const CreateProjectPage = lazyPage(() => import('./pages/projects/CreateProjectPage'));
const MyProjectPage = lazyPage(() => import('./pages/projects/MyProjectPage'));
const ProjectsPage = lazyPage(() => import('./pages/projects/ProjectsPage'));
const ProjectDetailPage = lazyPage(() => import('./pages/projects/ProjectDetailPage'));
const ChapterUploadPage = lazyPage(() => import('./pages/submissions/ChapterUploadPage'));
const ProjectSubmissionsPage = lazyPage(() => import('./pages/submissions/ProjectSubmissionsPage'));
const SubmissionDetailPage = lazyPage(() => import('./pages/submissions/SubmissionDetailPage'));
const SubmissionReviewPage = lazyPage(() => import('./pages/submissions/SubmissionReviewPage'));
const PlagiarismReportPage = lazyPage(() => import('./pages/submissions/PlagiarismReportPage'));
const ArchiveSearchPage = lazyPage(() => import('./pages/archive/ArchiveSearchPage'));
const CertificatePage = lazyPage(() => import('./pages/projects/CertificatePage'));
const ReportsPage = lazyPage(() => import('./pages/reports/ReportsPage'));
const BulkUploadPage = lazyPage(() => import('./pages/reports/BulkUploadPage'));
const AuditLogPage = lazyPage(() => import('./pages/admin/AuditLogPage'));
const TemplateManagementPage = lazyPage(() => import('./pages/documents/TemplateManagementPage'));
const DocumentEditorPage = lazyPage(() => import('./pages/documents/DocumentEditorPage'));
const TeamReviewWorkflowPage = lazyPage(() => import('./pages/adviser/TeamReviewWorkflowPage'));
const NotFoundPage = lazyPage(() => import('./pages/NotFoundPage'));
const ForbiddenPage = lazyPage(() => import('./pages/ForbiddenPage'));
const LandingPage = lazyPage(() => import('./pages/LandingPage'));

/**
 * App — Root component with routing and theme management.
 */

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ---------------------------------------------------------------------------
// Route configuration — eliminates repetitive wrapper boilerplate
// ---------------------------------------------------------------------------

const GUEST_ROUTES = [
  { path: '/login', Component: LoginPage },
  { path: '/register', Component: RegisterPage },
  { path: '/forgot-password', Component: ForgotPasswordPage },
  { path: '/reset-password', Component: ResetPasswordPage },
];

const PROTECTED_ROUTES = [
  // General
  { path: '/dashboard', Component: DashboardPage },
  { path: '/users', Component: UsersPage },
  { path: '/profile', Component: ProfilePage },
  { path: '/settings', Component: SettingsPage },
  { path: '/notifications', Component: NotificationsPage },
  // Projects
  { path: '/project/create', Component: CreateProjectPage },
  { path: '/project', Component: MyProjectPage },
  { path: '/projects', Component: ProjectsPage },
  { path: '/projects/:id', Component: ProjectDetailPage },
  // Archive & Reports
  { path: '/archive', Component: ArchiveSearchPage },
  { path: '/projects/:projectId/certificate', Component: CertificatePage },
  { path: '/reports', Component: ReportsPage },
  { path: '/reports/bulk-upload', Component: BulkUploadPage },
  // Admin
  { path: '/admin/audit-log', Component: AuditLogPage },
  // Documents
  { path: '/documents/manuscripts', Component: TemplateManagementPage },
  { path: '/documents/templates', Component: TemplateManagementPage },
  { path: '/projects/:projectId/documents/:docId', Component: DocumentEditorPage },
  { path: '/adviser/team-review', Component: TeamReviewWorkflowPage },
  // Submissions
  { path: '/project/submissions', Component: ProjectSubmissionsPage },
  { path: '/project/submissions/upload', Component: ChapterUploadPage },
  { path: '/project/submissions/:submissionId', Component: SubmissionDetailPage },
  { path: '/project/submissions/:submissionId/review', Component: SubmissionReviewPage },
  { path: '/project/submissions/:submissionId/plagiarism-report', Component: PlagiarismReportPage },
];

export default function App() {
  const { sessionLoading, fetchUser } = useAuthStore();
  const hasFetchedSession = useRef(false);

  // Restore session on every hard refresh / first load.
  // We must wait for this to complete before rendering protected/guest routes,
  // otherwise ProtectedRoute will always redirect to /login on a fresh page load
  // because Zustand state resets (cookies persist but in-memory state does not).
  useEffect(() => {
    if (hasFetchedSession.current) {
      return;
    }
    hasFetchedSession.current = true;
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show a full-screen spinner while we confirm the session.
  if (sessionLoading) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="cms-ui-theme">
        <LoadingSpinner />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="cms-ui-theme">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Guest routes — redirect to dashboard if already authenticated */}
          {GUEST_ROUTES.map(({ path, Component }) => (
            <Route
              key={path}
              path={path}
              element={
                <GuestRoute>
                  <Component />
                </GuestRoute>
              }
            />
          ))}

          {/* Auth route — accessible without guard */}
          <Route path="/verify-otp" element={<VerifyOtpPage />} />

          {/* Protected routes — redirect to login if not authenticated */}
          {PROTECTED_ROUTES.map(({ path, Component }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute>
                  <Component />
                </ProtectedRoute>
              }
            />
          ))}

          {/* Public routes */}
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route
            path="/"
            element={
              <GuestRoute>
                <LandingPage />
              </GuestRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
