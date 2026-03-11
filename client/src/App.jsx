import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from 'sonner';

// Lazy-loaded page imports
import { lazy, Suspense, useEffect, useRef } from 'react';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const VerifyOtpPage = lazy(() => import('./pages/auth/VerifyOtpPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const TeamsPage = lazy(() => import('./pages/teams/TeamsPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const CreateProjectPage = lazy(() => import('./pages/projects/CreateProjectPage'));
const MyProjectPage = lazy(() => import('./pages/projects/MyProjectPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage'));
const ChapterUploadPage = lazy(() => import('./pages/submissions/ChapterUploadPage'));
const ProposalCompilationPage = lazy(() => import('./pages/submissions/ProposalCompilationPage'));
const ProjectSubmissionsPage = lazy(() => import('./pages/submissions/ProjectSubmissionsPage'));
const SubmissionDetailPage = lazy(() => import('./pages/submissions/SubmissionDetailPage'));
const PlagiarismReportPage = lazy(() => import('./pages/submissions/PlagiarismReportPage'));
const ArchiveSearchPage = lazy(() => import('./pages/archive/ArchiveSearchPage'));
const CertificatePage = lazy(() => import('./pages/projects/CertificatePage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const BulkUploadPage = lazy(() => import('./pages/reports/BulkUploadPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));
const TemplateManagementPage = lazy(() => import('./pages/documents/TemplateManagementPage'));
const DocumentEditorPage = lazy(() => import('./pages/documents/DocumentEditorPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

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
  { path: '/teams', Component: TeamsPage },
  { path: '/team', Component: TeamsPage },
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
  { path: '/documents/templates', Component: TemplateManagementPage },
  { path: '/projects/:projectId/documents/:docId', Component: DocumentEditorPage },
  // Submissions
  { path: '/project/submissions', Component: ProjectSubmissionsPage },
  { path: '/project/submissions/upload', Component: ChapterUploadPage },
  { path: '/project/proposal', Component: ProposalCompilationPage },
  { path: '/project/submissions/:submissionId', Component: SubmissionDetailPage },
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
