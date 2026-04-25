import { Menu, Bell, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadCount } from '@/hooks/useNotifications';
import { ROLES } from '@cms/shared';

/**
 * Map route paths to human-readable page titles.
 * Ordered from most specific to least specific so the first match wins.
 */
const PAGE_TITLES = [
  // Specific with query params (must come first)
  { path: '/projects?filter=advisees', title: 'Adviser Reviews' },
  { path: '/projects?filter=panel', title: 'Panel Review' },

  // Submissions & Projects (Student)
  { path: '/project/submissions/upload', title: 'Upload Chapter' },
  { path: '/project/submissions/', title: 'Submission Detail' },
  { path: '/project/submissions', title: 'Submissions' },
  { path: '/project/create', title: 'Create Project' },
  { path: '/project/proposal', title: 'Proposal Compilation' },
  { path: '/project', title: 'My Capstone' },

  // Projects & Reviews (Faculty/Admin)
  { path: '/projects/', title: 'Project Details' },
  { path: '/projects', title: 'Instructor Review' },
  { path: '/adviser/team-review', title: 'Team Review' },

  // General
  { path: '/dashboard', title: 'Dashboard' },
  { path: '/notifications', title: 'Notifications' },
  { path: '/teams', title: 'My Team' },
  { path: '/team', title: 'My Team' },
  { path: '/users', title: 'Users' },
  { path: '/profile', title: 'Profile' },
  { path: '/settings', title: 'Settings' },

  // Archive & Reports
  { path: '/archive/upload/capstone', title: 'Upload Archived Capstone' },
  { path: '/archive/upload/academic-paper', title: 'Upload Archived Capstone' },
  { path: '/archive/upload/academic-journal', title: 'Upload Archived Capstone' },
  { path: '/reports/bulk-upload', title: 'Upload Archived Capstone' },
  { path: '/archive', title: 'Research Archive' },
  { path: '/plagiarism-checker', title: 'Plagiarism Checker' },
  { path: '/reports', title: 'Reports' },

  // Admin
  { path: '/admin/audit', title: 'Activity Log' },
  { path: '/admin/audit-log', title: 'Activity Log' },
];

/**
 * Derive the page title from the current pathname and search params.
 */
function getPageTitle(pathname, search) {
  const fullPath = pathname + search;

  // 1. Try to match entries that include query parameters (e.g. /projects?filter=...)
  const queryMatch = PAGE_TITLES.find(
    (entry) => entry.path.includes('?') && fullPath.startsWith(entry.path),
  );
  if (queryMatch) return queryMatch.title;

  // 2. Try to match path-only entries
  const pathMatch = PAGE_TITLES.find((entry) => {
    // Skip entries with query params here
    if (entry.path.includes('?')) return false;

    // Exact match
    if (pathname === entry.path) return true;

    // Sub-path match (e.g., /projects/123 matches /projects/ or /projects)
    // We ensure we match full segments to avoid /projects matching /project
    const prefix = entry.path.endsWith('/') ? entry.path : `${entry.path}/`;
    if (pathname.startsWith(prefix)) return true;

    return false;
  });

  return pathMatch?.title || 'Dashboard';
}

function getRoleLabel(role) {
  if (!role) return '';

  if (role === ROLES.ADVISER || role === ROLES.PANELIST) {
    return 'Faculty';
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Header — top bar with mobile menu toggle, user info, theme toggle, and notifications.
 */
export default function Header({ sidebarOpen, onMenuClick }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const user = useAuthStore((state) => state.user);
  const { data: unreadCount = 0 } = useUnreadCount();

  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const roleLabel = getRoleLabel(user?.role);

  const pageTitle = getPageTitle(pathname, search);

  const showBackArrow = pathname.startsWith('/projects/') && pathname !== '/projects';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
      {/* Left side: menu button + page title */}
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button
            onClick={onMenuClick}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {showBackArrow && (
          <button
            onClick={() => navigate(-1)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <h2 className="text-lg font-semibold text-foreground">{pageTitle}</h2>
      </div>

      {/* Right side: notifications, theme toggle, user avatar */}
      <div className="flex items-center gap-2">
        {/* Notifications bell */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent"
          aria-label="Go to profile"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground overflow-hidden">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || 'avatar'}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </button>
      </div>
    </header>
  );
}
