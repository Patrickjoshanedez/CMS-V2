import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSocket } from '@/hooks/useSocket';
import AnnouncementBanner from './AnnouncementBanner';
import { useNavigationSkeleton } from '@/hooks/useNavigationSkeleton';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@cms/shared';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/Sheet';

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
  const hasPortalSpacing = useAuthStore((state) =>
    [ROLES.STUDENT, ROLES.FACULTY, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR].includes(
      state.user?.role,
    ),
  );
  const [mobileView, setMobileView] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024,
  );
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (window.innerWidth < 1024) return false;
    const savedState = window.localStorage.getItem(SIDEBAR_STATE_KEY);
    if (savedState === null) return true;
    return savedState === 'true';
  });
  const { pathname, search } = useLocation();
  const { isSkeleton } = useNavigationSkeleton(180);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    window.localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setMobileView(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [pathname, search]);

  return (
    <Sheet open={mobileView && sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex h-dvh overflow-hidden bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        {!mobileView && (
          <Sidebar
            open={sidebarOpen}
            mobileView={false}
            onToggle={() => setSidebarOpen((prev) => !prev)}
          />
        )}
        {mobileView && (
          <SheetContent
            side="left"
            className="w-72 max-w-[85vw] p-0"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.querySelector('[aria-label="Open sidebar"]')?.focus();
            }}
          >
            <SheetTitle className="sr-only">Main navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Navigate between your capstone workspace, tools, and account pages.
            </SheetDescription>
            <Sidebar open mobileView onToggle={() => setSidebarOpen((prev) => !prev)} />
          </SheetContent>
        )}

        {/* Main area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Header sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((prev) => !prev)} />

          {/* Announcement banner — only rendered when there is content */}
          <AnnouncementBanner />

          <main
            id="main-content"
            tabIndex={-1}
            className={`relative flex-1 min-h-0 min-w-0 overflow-y-auto bg-background ${
              hasPortalSpacing ? 'p-4 sm:p-6 xl:p-8' : 'p-3 sm:p-6'
            }`}
          >
            {/* Page content — skeleton on navigation, real content otherwise */}
            {isSkeleton ? (
              <PageSkeleton key={`skeleton-${pathname}`} />
            ) : (
              <div
                key={pathname}
                className={`cms-route-enter min-w-0 ${
                  hasPortalSpacing ? 'mx-auto w-full max-w-7xl' : ''
                }`}
              >
                {children || <Outlet />}
              </div>
            )}
          </main>
        </div>
      </div>
    </Sheet>
  );
}
