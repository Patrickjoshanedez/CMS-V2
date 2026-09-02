import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSocket } from '@/hooks/useSocket';
import AnnouncementBanner from './AnnouncementBanner';
import { useNavigationSkeleton } from '@/hooks/useNavigationSkeleton';
import PageSkeleton from '@/components/ui/PageSkeleton';

const SIDEBAR_STATE_KEY = 'cms.sidebar.open';

/**
 * DashboardLayout — main authenticated layout with collapsible sidebar and header.
 * Initialises the Socket.IO connection for real-time notifications.
 * Includes:
 * - Sidebar with icon-rail collapse mode
 * - NProgress-style top route progress bar (keyed on pathname)
 * - Route-aware skeleton loading on every sidebar navigation
 * - Spring page-enter transition on content
 */
export default function DashboardLayout({ children }) {
  useSocket();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const savedState = window.localStorage.getItem(SIDEBAR_STATE_KEY);
    if (savedState === null) return true;
    return savedState === 'true';
  });
  const { pathname } = useLocation();
  const { isSkeleton } = useNavigationSkeleton(180);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — passes collapsed state for icon-rail mode */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-visible min-h-0">
        <Header sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((prev) => !prev)} />

        {/* Announcement banner — only rendered when there is content */}
        <AnnouncementBanner />

        <main className="relative flex-1 overflow-y-auto p-6">
          {/* NProgress-style route progress bar */}
          <div key={`progress-${pathname}`} className="cms-route-progress" aria-hidden="true" />

          {/* Page content — skeleton on navigation, real content otherwise */}
          {isSkeleton ? (
            <PageSkeleton key={`skeleton-${pathname}`} />
          ) : (
            <div key={pathname} className="cms-route-enter">
              {children || <Outlet />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
