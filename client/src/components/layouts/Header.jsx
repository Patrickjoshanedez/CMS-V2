import { Menu, Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadCount } from '@/hooks/useNotifications';

/**
 * Map route paths to human-readable page titles.
 * Ordered from most specific to least specific so the first match wins.
 */
const PAGE_TITLES = [
  { path: '/project/submissions/upload', title: 'Upload Chapter' },
  { path: '/project/submissions', title: 'Submissions' },
  { path: '/project/create', title: 'Create Project' },
  { path: '/project', title: 'My Project' },
  { path: '/dashboard', title: 'Dashboard' },
  { path: '/notifications', title: 'Notifications' },
  { path: '/archive', title: 'Archive' },
  { path: '/team', title: 'My Team' },
  { path: '/teams', title: 'Teams' },
  { path: '/users', title: 'Users' },
  { path: '/projects', title: 'Projects' },
  { path: '/reports', title: 'Reports' },
  { path: '/admin/audit-log', title: 'Activity Log' },
  { path: '/settings', title: 'Settings' },
  { path: '/profile', title: 'Profile' },
];

/**
 * Derive the page title from the current pathname.
 */
function getPageTitle(pathname) {
  const match = PAGE_TITLES.find((entry) => pathname.startsWith(entry.path));
  return match?.title || 'Dashboard';
}

/**
 * Header — top bar with mobile menu toggle, user info, theme toggle, and notifications.
 */
export default function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);
  const { data: unreadCount = 0 } = useUnreadCount();

  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const roleLabel = user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1);

  const pageTitle = getPageTitle(pathname);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      {/* Left side: menu button + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

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
        <div className="flex items-center gap-2 rounded-md px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
