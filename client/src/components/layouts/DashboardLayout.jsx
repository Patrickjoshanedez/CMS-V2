import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSocket } from '@/hooks/useSocket';
import AnnouncementBanner from './AnnouncementBanner';

const SIDEBAR_STATE_KEY = 'cms.sidebar.open';

/**
 * DashboardLayout — main authenticated layout with collapsible sidebar and header.
 * Initialises the Socket.IO connection for real-time notifications.
 */
export default function DashboardLayout({ children }) {
  useSocket(); // Connect when authenticated, listen for notifications
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;

    const savedState = window.localStorage.getItem(SIDEBAR_STATE_KEY);
    if (savedState === null) return true;

    return savedState === 'true';
  });
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((prev) => !prev)} />
        <div className="border-b bg-background px-4 sm:px-6 lg:px-8 pt-4">
          <AnnouncementBanner className="mb-4" />
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div key={pathname} className="cms-route-enter">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
