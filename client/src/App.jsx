import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from 'sonner';

// Lazy-loaded page imports
import { lazy, Suspense } from 'react';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const VerifyOtpPage = lazy(() => import('./pages/auth/VerifyOtpPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const TeamsPage = lazy(() => import('./pages/teams/TeamsPage'));
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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));

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

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="cms-ui-theme">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Guest routes (redirect to dashboard if already logged in) */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <GuestRoute>
                <ResetPasswordPage />
              </GuestRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <TeamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <TeamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Project routes */}
          <Route
            path="/project/create"
            element={
              <ProtectedRoute>
                <CreateProjectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project"
            element={
              <ProtectedRoute>
                <MyProjectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Submission routes */}
          <Route
            path="/project/submissions"
            element={
              <ProtectedRoute>
                <ProjectSubmissionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/submissions/upload"
            element={
              <ProtectedRoute>
                <ChapterUploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/proposal"
            element={
              <ProtectedRoute>
                <ProposalCompilationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/submissions/:submissionId"
            element={
              <ProtectedRoute>
                <SubmissionDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Error pages */}
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
