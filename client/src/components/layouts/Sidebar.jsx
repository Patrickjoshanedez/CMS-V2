import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Bell,
  Settings,
  LogOut,
  X,
  GraduationCap,
  FileText,
  Upload,
  ClipboardList,
  Archive,
  BarChart3,
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
  ],
  // Student-specific
  student: [
    { label: 'My Team', icon: UsersRound, path: '/team' },
    { label: 'My Project', icon: FileText, path: '/project' },
    { label: 'Submissions', icon: ClipboardList, path: '/project/submissions' },
    { label: 'Upload Chapter', icon: Upload, path: '/project/submissions/upload' },
  ],
  // Instructor/admin-specific
  instructor: [
    { label: 'Users', icon: Users, path: '/users' },
    { label: 'Teams', icon: UsersRound, path: '/teams' },
    { label: 'Projects', icon: FileText, path: '/projects' },
    { label: 'Reports', icon: BarChart3, path: '/reports' },
  ],
  // Adviser-specific
  adviser: [
    { label: 'My Teams', icon: UsersRound, path: '/teams' },
    { label: 'Projects', icon: FileText, path: '/projects' },
  ],
  // Panelist-specific
  panelist: [{ label: 'Projects', icon: FileText, path: '/projects' }],
};

function getNavItems(role) {
  const items = [...navItems.common];

  switch (role) {
    case ROLES.INSTRUCTOR:
      items.push(...navItems.instructor);
      break;
    case ROLES.ADVISER:
      items.push(...navItems.adviser);
      break;
    case ROLES.STUDENT:
      items.push(...navItems.student);
      break;
    case ROLES.PANELIST:
      items.push(...navItems.panelist);
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
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
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
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
