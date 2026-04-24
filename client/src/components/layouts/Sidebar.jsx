import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  LogOut,
  GraduationCap,
  FileText,
  Upload,
  ClipboardList,
  ClipboardCheck,
  Archive,
  BarChart3,
  ScrollText,
  ChevronDown,
  Search,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@cms/shared';

/**
 * Sidebar — responsive navigation sidebar.
 * Shows role-appropriate navigation items with grouped sections.
 */

// ---------------------------------------------------------------------------
// Navigation config — each role gets a flat list or grouped sections
// ---------------------------------------------------------------------------

/**
 * Build the instructor sidebar items matching the requested layout:
 *   Dashboard → Instructor Review → Reports → Archived Capstone (collapsible) → Plagiarism Checker → Users → Activity Log
 */
const instructorItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Instructor Review', icon: ClipboardCheck, path: '/projects' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  {
    label: 'Archived Capstone',
    icon: Archive,
    group: true,
    children: [
      { label: 'Browse Archive', icon: Search, path: '/archive' },
      { label: 'Upload Archive', icon: Upload, path: '/archive/upload/capstone' },
    ],
  },
  { label: 'Plagiarism Checker', icon: ClipboardCheck, path: '/plagiarism-checker' },
  { label: 'Users', icon: Users, path: '/users' },
  { label: 'Activity Log', icon: ScrollText, path: '/admin/audit' },
];

const studentItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'My Team', icon: UsersRound, path: '/teams' },
  { label: 'My Capstone', icon: FileText, path: '/project' },
  { label: 'Submissions', icon: ClipboardList, path: '/project/submissions' },
  { label: 'Archive', icon: Archive, path: '/archive' },
  { label: 'Plagiarism Checker', icon: ClipboardCheck, path: '/plagiarism-checker' },
];

const facultyItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Adviser Reviews', icon: ClipboardCheck, path: '/projects?filter=advisees' },
  { label: 'Panel Review', icon: ClipboardList, path: '/projects?filter=panel' },
  { label: 'Archive', icon: Archive, path: '/archive' },
  { label: 'Plagiarism Checker', icon: ClipboardCheck, path: '/plagiarism-checker' },
];

function getNavItems(role) {
  switch (role) {
    case ROLES.INSTRUCTOR:
      return instructorItems;
    case ROLES.ADVISER:
    case ROLES.PANELIST:
      return facultyItems;
    case ROLES.STUDENT:
      return studentItems;
    default:
      return [{ label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' }];
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Shared class builder for nav links */
function navLinkClasses(isActive) {
  return [
    'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium',
    'transition-all duration-200 ease-out',
    isActive
      ? 'bg-primary/10 text-primary shadow-[inset_3px_0_0_hsl(var(--primary))]'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-0.5',
  ].join(' ');
}

function getActivePath(items, location) {
  let bestMatch = null;
  let maxLen = 0;

  const currentParams = new URLSearchParams(location.search);

  const checkItem = (path) => {
    const [targetPath, targetQuery = ''] = path.split('?');

    const pathMatches =
      location.pathname === targetPath ||
      (targetPath !== '/dashboard' && location.pathname.startsWith(`${targetPath}/`));

    if (!pathMatches) return;

    if (targetQuery) {
      const targetParams = new URLSearchParams(targetQuery);
      for (const [key, value] of targetParams.entries()) {
        if (currentParams.get(key) !== value) {
          return;
        }
      }
    }

    const weight = targetPath.length + (targetQuery ? targetQuery.length : 0);
    if (weight > maxLen) {
      maxLen = weight;
      bestMatch = path;
    }
  };

  items.forEach((item) => {
    if (item.group && item.children) {
      item.children.forEach((child) => checkItem(child.path));
    } else {
      checkItem(item.path);
    }
  });

  return bestMatch;
}

/** A single nav link (leaf item) */
function SidebarLink({ item, activePath }) {
  const isActive = activePath === item.path;

  return (
    <Link
      to={item.path}
      aria-current={isActive ? 'page' : undefined}
      className={navLinkClasses(isActive)}
    >
      <item.icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Collapsible group (used for "Archived Capstone") */
function SidebarGroup({ item, activePath }) {
  const { pathname } = useLocation();

  // Auto-open the group when a child route is active
  const isChildActive = item.children?.some((child) => pathname.startsWith(child.path.split('?')[0]));
  const [open, setOpen] = useState(isChildActive);

  return (
    <div>
      {/* Group toggle button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={[
          'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium',
          'transition-all duration-200 ease-out',
          isChildActive
            ? 'bg-primary/5 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        ].join(' ')}
        aria-expanded={open}
      >
        <item.icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      {/* Collapsible children */}
      <div
        className="grid transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/50 pl-3">
            {item.children.map((child) => {
              const isActive = activePath === child.path;
              return (
                <Link
                  key={child.path}
                  to={child.path}
                  className={[
                    'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium',
                    'transition-all duration-200 ease-out',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-0.5',
                  ].join(' ')}
                >
                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const items = getNavItems(user?.role);
  const activePath = getActivePath(items, location);

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
      `}
    >
      {/* ── Header ── */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-foreground tracking-tight">CMS</span>
            <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest">
              Capstone
            </span>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {/* Section label — only for instructor */}
        {user?.role === ROLES.INSTRUCTOR && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Navigation
          </p>
        )}

        <div className="space-y-0.5">
          {items.map((item) =>
            item.group ? (
              <SidebarGroup key={item.label} item={item} activePath={activePath} />
            ) : (
              <SidebarLink key={item.path} item={item} activePath={activePath} />
            ),
          )}
        </div>
      </nav>

      {/* ── Footer (logout) ── */}
      <div className="border-t px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
