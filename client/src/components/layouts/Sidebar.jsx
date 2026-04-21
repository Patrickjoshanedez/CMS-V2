import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Bell,
  Settings,
  LogOut,
  Menu,
  GraduationCap,
  FileText,
  Upload,
  ClipboardList,
  ClipboardCheck,
  Archive,
  BarChart3,
  ScrollText,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@cms/shared';

/**
 * Sidebar — responsive navigation sidebar.
 * Shows role-appropriate navigation items.
 */

const navItems = {
  // Common to all roles
  common: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
    { label: 'Archive', icon: Archive, path: '/archive' },
    { label: 'Plagiarism Checker', icon: ClipboardCheck, path: '/plagiarism-checker' },
  ],
  // Student-specific
  student: [
    { label: 'My Team', icon: UsersRound, path: '/teams' },
    { label: 'My Capstone', icon: FileText, path: '/project' },
    { label: 'Submissions', icon: ClipboardList, path: '/project/submissions' },
  ],
  // Instructor/admin-specific
  instructor: [
    { label: 'Users', icon: Users, path: '/users' },
    { label: 'Instructor Review', icon: ClipboardCheck, path: '/projects' },
    { label: 'Reports', icon: BarChart3, path: '/reports' },
    { label: 'Upload Archived Capstone', icon: Upload, path: '/archive/upload/capstone' },
    { label: 'Activity Log', icon: ScrollText, path: '/admin/audit' },
  ],
  // Shared faculty-member navigation (adviser + panelist)
  faculty: [
    { label: 'Faculty Members Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Faculty Team Review', icon: ClipboardCheck, path: '/adviser/team-review' },
    { label: 'Instructor Review', icon: ClipboardCheck, path: '/projects' },
  ],
};

function getNavItems(role) {
  const items = [...navItems.common];

  switch (role) {
    case ROLES.INSTRUCTOR:
      items.push(...navItems.instructor);
      break;
    case ROLES.ADVISER:
      items.push(...navItems.faculty);
      break;
    case ROLES.STUDENT:
      items.push(...navItems.student);
      break;
    case ROLES.PANELIST:
      items.push(...navItems.faculty);
      break;
    default:
      break;
  }

  return items;
}

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const items = getNavItems(user?.role);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`
        relative z-30 flex h-screen shrink-0 flex-col bg-card overflow-hidden
        transition-[width,opacity,transform,border-color] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${open ? 'w-64 border-r opacity-100 translate-x-0' : 'w-0 border-r-0 opacity-0 -translate-x-2'}
        lg:w-64 lg:border-r lg:opacity-100 lg:translate-x-0
      `}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary">CMS</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-out hover:translate-x-0.5 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer (settings + logout) */}
      <div className="border-t px-3 py-4 space-y-1">
        <NavLink
          to="/settings"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-out hover:translate-x-0.5 ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
