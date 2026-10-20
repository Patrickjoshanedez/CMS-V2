import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSocket } from '@/hooks/useSocket';
import AnnouncementBanner from './AnnouncementBanner';
import { useNavigationSkeleton } from '@/hooks/useNavigationSkeleton';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@cms/shared';

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
    [ROLES.STUDENT, ROLES.FACULTY, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR].includes(state.user?.role),
  );
  const layoutRef = useRef(null);
  const mainAreaRef = useRef(null);
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

  useEffect(() => {
    if (!sidebarOpen || !mobileView) return;
    const sidebar = layoutRef.current?.querySelector('aside');
    const mainArea = mainAreaRef.current;
    if (!sidebar || !mainArea) return;
    const focusable = () =>
      Array.from(
        sidebar.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]'),
      ).filter((element) => element.getClientRects().length > 0);
    const previouslyFocused = document.activeElement;
    const wasInert = mainArea.inert;
    mainArea.inert = true;
    focusable()[0]?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSidebarOpen(false);
      }
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first || !sidebar.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !sidebar.contains(document.activeElement))
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      mainArea.inert = wasInert;
      const menuButton = mainArea.querySelector('[aria-label="Open sidebar"]');
      if (menuButton) menuButton.focus();
      else if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [sidebarOpen, mobileView]);

  return (
    <div ref={layoutRef} className="flex h-dvh overflow-hidden bg-background">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
        />
      )}
      {/* Sidebar — passes collapsed state for icon-rail mode */}
      <Sidebar
        open={sidebarOpen}
        mobileView={mobileView}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main area */}
      <div ref={mainAreaRef} className="flex flex-1 flex-col min-w-0 overflow-hidden min-h-0">
        <Header sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((prev) => !prev)} />

        {/* Announcement banner — only rendered when there is content */}
        <AnnouncementBanner />

        <main
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
  );
}
