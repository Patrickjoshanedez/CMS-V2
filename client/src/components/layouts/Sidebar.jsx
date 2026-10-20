import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  BookMarked,
  Send,
  Archive,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  GraduationCap,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  Layers,
  ScrollText,
  Upload,
  Search,
  FileSignature,
  CalendarClock,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { appQueryClient } from '@/lib/queryClient';
import { useMyProject } from '@/hooks/useProjects';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { ROLES } from '@cms/shared';
import { prefetchRoute } from '@/lib/routePrefetch';

function getStudentNavItems(badges = {}) {
  return [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      section: 'workspace',
    },
    {
      id: 'my-team',
      label: 'My Team',
      icon: UsersRound,
      path: '/teams',
      section: 'workspace',
    },
    {
      id: 'my-capstone',
      label: 'My Capstone',
      icon: BookMarked,
      path: '/project',
      badge: badges.capstoneBadge,
      badgeVariant: badges.capstoneVariant || 'warning',
      section: 'workspace',
    },
    {
      id: 'submissions',
      label: 'Submissions',
      icon: Send,
      path: '/project/submissions',
      badge: badges.submissionsBadge,
      badgeVariant: 'neutral',
      section: 'workspace',
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      path: '/archive',
      section: 'tools',
    },
    {
      id: 'plagiarism',
      label: 'Plagiarism Checker',
      icon: ShieldCheck,
      path: '/plagiarism-checker',
      section: 'tools',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: UserCheck,
      path: '/profile',
      section: 'system',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/settings',
      section: 'system',
    },
  ];
}

const instructorNavItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    section: 'workspace',
  },
  {
    id: 'instructor-review',
    label: 'Instructor Review',
    icon: ClipboardCheck,
    path: '/projects',
    section: 'workspace',
  },
  {
    id: 'committee-assignments',
    label: 'Committee Assignments',
    icon: UserCheck,
    path: '/committee-assignments',
    section: 'workspace',
  },
  {
    id: 'scheduling-center',
    label: 'Scheduling Center',
    icon: CalendarClock,
    path: '/scheduling-center',
    section: 'workspace',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
    section: 'workspace',
  },
  {
    id: 'archive-group',
    label: 'Research Archive',
    icon: Archive,
    path: '/archive',
    section: 'tools',
    group: true,
    children: [
      { id: 'browse-archive', label: 'Browse Archive', icon: Search, path: '/archive' },
      {
        id: 'upload-archive',
        label: 'Upload Research',
        icon: Upload,
        path: '/archive/upload/capstone',
      },
    ],
  },
  {
    id: 'plagiarism',
    label: 'Plagiarism Checker',
    icon: ShieldCheck,
    path: '/plagiarism-checker',
    section: 'tools',
  },
  {
    id: 'evaluation-rubrics',
    label: 'Evaluation Rubrics',
    icon: Layers,
    path: '/admin/evaluation-templates',
    section: 'tools',
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    path: '/users',
    section: 'tools',
  },
  {
    id: 'audit-log',
    label: 'Activity Log',
    icon: ScrollText,
    path: '/admin/audit',
    section: 'tools',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    section: 'system',
  },
];

const facultyNavItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    section: 'workspace',
  },
  {
    id: 'adviser-reviews',
    label: 'Adviser Reviews',
    icon: ClipboardCheck,
    path: '/projects?filter=advisees',
    section: 'workspace',
  },
  {
    id: 'panel-review',
    label: 'Panel Review',
    icon: ClipboardList,
    path: '/projects?filter=panel',
    section: 'workspace',
  },
  {
    id: 'secretary-review',
    label: 'Secretary Review',
    icon: FileSignature,
    path: '/secretary-review',
    section: 'workspace',
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    path: '/archive',
    section: 'tools',
  },
  {
    id: 'plagiarism',
    label: 'Plagiarism Checker',
    icon: ShieldCheck,
    path: '/plagiarism-checker',
    section: 'tools',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    section: 'system',
  },
];

function getRoleNavItems(role, badges = {}) {
  switch (role) {
    case ROLES.INSTRUCTOR:
      return instructorNavItems;
    case ROLES.ADVISER:
    case ROLES.PANELIST:
    case ROLES.FACULTY:
      return facultyNavItems;
    case ROLES.STUDENT:
    default:
      return getStudentNavItems(badges);
  }
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
    if (item.children) {
      item.children.forEach((child) => checkItem(child.path));
    }
    checkItem(item.path);
  });

  return bestMatch;
}

/**
 * SidebarNavItem — Navigation node with floating portal tooltip and hover micro-interactions
 */
function SidebarNavItem({ item, active, collapsed, onNavigate }) {
  const Icon = item.icon;
  const [coords, setCoords] = useState(null);
  let queryClient = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    queryClient = useQueryClient();
  } catch {
    queryClient = appQueryClient;
  }

  const handleShow = (e) => {
    prefetchRoute(item.path, queryClient || appQueryClient);
    if (!collapsed) return;
    const rect = e?.currentTarget?.getBoundingClientRect?.() || {};
    setCoords({
      top: (rect.top || 0) + (rect.height || 40) / 2,
      left: (rect.right || 76) + 10,
    });
  };

  const handleHide = () => {
    setCoords(null);
  };

  return (
    <>
      <Link
        to={item.path}
        onClick={onNavigate}
        onMouseEnter={(e) => {
          prefetchRoute(item.path, queryClient);
          handleShow(e);
        }}
        onMouseOver={(e) => {
          prefetchRoute(item.path, queryClient);
          handleShow(e);
        }}
        onFocus={() => {
          prefetchRoute(item.path, queryClient);
          handleShow();
        }}
        onMouseLeave={handleHide}
        onMouseOut={handleHide}
        onBlur={handleHide}
        className={`relative w-full min-h-[44px] lg:min-h-10 flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all group outline-none select-none ${
          collapsed ? 'justify-center px-0' : 'gap-3 min-w-0'
        } ${
          active
            ? 'text-primary font-semibold shadow-2xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {/* Background Active Pill */}
        {active && (
          <div className="absolute inset-0 rounded-lg border border-primary/30 bg-primary/10 shadow-2xs transition-all pointer-events-none" />
        )}

        {/* Hover wash for inactive items */}
        {!active && (
          <div className="absolute inset-0 rounded-lg bg-accent opacity-0 transition-opacity pointer-events-none group-hover:opacity-100" />
        )}

        {/* Leading Icon */}
        <Icon
          className={`w-4 h-4 relative z-10 transition-transform duration-200 shrink-0 group-hover:scale-110 ${
            active ? 'text-primary' : 'text-muted-foreground'
          }`}
        />

        {/* Label Text (hidden when collapsed) */}
        {!collapsed && (
          <span
            className="relative z-10 flex-1 min-w-0 truncate tracking-tight transition-transform duration-150 group-hover:translate-x-0.5"
            title={item.label}
          >
            {item.label}
          </span>
        )}

        {/* Trailing Status Badges */}
        {!collapsed && item.badge !== undefined && (
          <span
            className={`relative z-10 ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${
              item.badgeVariant === 'warning'
                ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                : item.badgeVariant === 'success'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>

      {/* Portal-Based Floating Tooltip (escapes overflow-y-auto clipping) */}
      {collapsed &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            data-testid="sidebar-tooltip"
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="fixed z-[9999] -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-semibold text-popover-foreground shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100 flex items-center gap-1.5"
          >
            {item.label}
            {item.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 text-[9px] rounded font-bold ${
                  item.badgeVariant === 'warning'
                    ? 'bg-amber-500 text-white'
                    : item.badgeVariant === 'success'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-primary text-primary-foreground'
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Collapsible group for sub-items (e.g. Archived Capstone Browse & Upload)
 */
function SidebarNavGroup({ item, activePath, collapsed, onNavigate }) {
  const { pathname } = useLocation();
  let queryClient = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    queryClient = useQueryClient();
  } catch {
    queryClient = appQueryClient;
  }
  const isChildActive = item.children?.some((child) =>
    pathname.startsWith(child.path.split('?')[0]),
  );
  const [open, setOpen] = useState(isChildActive);
  const Icon = item.icon;
  const [coords, setCoords] = useState(null);

  const handleShow = (e) => {
    if (!collapsed) return;
    const rect = e?.currentTarget?.getBoundingClientRect?.() || {};
    setCoords({
      top: (rect.top || 0) + (rect.height || 40) / 2,
      left: (rect.right || 76) + 10,
    });
  };

  const handleHide = () => {
    setCoords(null);
  };

  if (collapsed) {
    return (
      <>
        <Link
          to={item.children?.[0]?.path || item.path}
          onClick={onNavigate}
          onMouseEnter={(e) => {
            prefetchRoute(item.children?.[0]?.path || item.path, queryClient || appQueryClient);
            handleShow(e);
          }}
          onMouseOver={(e) => {
            prefetchRoute(item.children?.[0]?.path || item.path, queryClient || appQueryClient);
            handleShow(e);
          }}
          onFocus={() => {
            prefetchRoute(item.children?.[0]?.path || item.path, queryClient || appQueryClient);
            handleShow();
          }}
          onMouseLeave={handleHide}
          onMouseOut={handleHide}
          onBlur={handleHide}
          className={`relative w-full min-h-[44px] lg:min-h-10 flex items-center justify-center px-0 py-2 rounded-lg text-xs font-medium transition-all group outline-none select-none ${
            isChildActive
              ? 'text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {isChildActive && (
            <div className="absolute inset-0 rounded-lg border border-primary/30 bg-primary/10 shadow-2xs pointer-events-none" />
          )}
          <Icon className="relative z-10 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:scale-110" />
        </Link>

        {coords &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              role="tooltip"
              data-testid="sidebar-tooltip"
              style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
              className="fixed z-[9999] -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-semibold text-popover-foreground shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100"
            >
              {item.label}
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative w-full min-h-[44px] lg:min-h-10 flex items-center min-w-0 gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group outline-none select-none ${
          isChildActive
            ? 'text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-expanded={open}
      >
        <Icon className="w-4 h-4 transition-transform duration-200 shrink-0 group-hover:scale-110" />
        <span className="flex-1 min-w-0 truncate text-left tracking-tight" title={item.label}>
          {item.label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden" inert={open ? undefined : ''} aria-hidden={!open}>
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
            {item.children?.map((child) => {
              const isActive = activePath === child.path;
              return (
                <SidebarNavItem
                  key={child.id}
                  item={child}
                  active={isActive}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modern Animated Sidebar with Dual-State Expansion & Floating Slide Indicator
 */
export function Sidebar({ open = true, mobileView = false, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const authState = useAuthStore();
  const user = authState?.user ?? authState;
  const logout = typeof authState?.logout === 'function' ? authState.logout : () => {};

  const collapsed = !open;
  const isStudent = user?.role === ROLES.STUDENT;

  const { data: project } = useMyProject({ enabled: isStudent });
  const { data: submissionsData } = useProjectSubmissions(
    project?._id,
    { limit: 100 },
    { enabled: Boolean(isStudent && project?._id) },
  );

  const studentBadges = useMemo(() => {
    if (!isStudent) return {};

    // 1. My Capstone Badge:
    let capstoneBadge = undefined;
    let capstoneVariant = 'warning';

    if (project) {
      if (project.status === 'archived') {
        capstoneBadge = 'Archived';
        capstoneVariant = 'neutral';
      } else if (project.titleStatus === 'approved') {
        capstoneBadge = 'Active';
        capstoneVariant = 'success';
      } else {
        capstoneBadge = 'Draft';
        capstoneVariant = 'warning';
      }
    } else {
      capstoneBadge = 'Draft';
      capstoneVariant = 'warning';
    }

    // 2. Submissions Action Badge:
    let submissionsBadge = undefined;
    if (project) {
      const submissions = submissionsData?.submissions || [];
      const latestChapters = new Map();
      for (const sub of submissions) {
        if (sub?.type === 'chapter' && sub.chapter) {
          const prev = latestChapters.get(sub.chapter);
          if (!prev || (sub.version || 0) > (prev.version || 0)) {
            latestChapters.set(sub.chapter, sub);
          }
        }
      }

      let pendingRevisions = 0;
      for (let ch = 1; ch <= 5; ch++) {
        const sub = latestChapters.get(ch);
        if (sub?.status === 'revisions_required') {
          pendingRevisions++;
        }
      }

      const missingAssets = !project.ganttChartUrl || !project.demoVideoUrl ? 1 : 0;
      const actionCount = pendingRevisions + missingAssets;

      if (actionCount > 0) {
        submissionsBadge = actionCount;
      }
    } else {
      submissionsBadge = 2;
    }

    return {
      capstoneBadge,
      capstoneVariant,
      submissionsBadge,
    };
  }, [isStudent, project, submissionsData]);

  const navItems = useMemo(
    () => getRoleNavItems(user?.role, studentBadges),
    [user?.role, studentBadges],
  );
  const activePath = useMemo(() => getActivePath(navItems, location), [navItems, location]);

  const [signOutCoords, setSignOutCoords] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const workspaceItems = navItems.filter((i) => i.section === 'workspace');
  const toolsItems = navItems.filter((i) => i.section === 'tools');
  const systemItems = navItems.filter((i) => i.section === 'system');
  const closeMobileNav = () => {
    if (mobileView && open) onToggle?.();
  };

  return (
    <aside
      role={mobileView && open ? 'dialog' : undefined}
      aria-modal={mobileView && open ? true : undefined}
      aria-label="Main navigation"
      className={`lg:relative flex flex-col justify-between h-dvh bg-card border-r border-border transition-[width] duration-300 ease-in-out select-none shrink-0 z-30 overflow-hidden ${
        collapsed
          ? 'hidden lg:flex w-20 min-w-[5rem]'
          : 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:max-w-[21rem] lg:relative shadow-2xl lg:shadow-none'
      }`}
    >
      {/* 1. Header & Collapse Toggle */}
      <div
        className={`flex min-h-[4rem] items-center border-b border-border/60 py-3 transition-all duration-300 ${
          collapsed ? 'justify-center px-2' : 'justify-between px-3.5 gap-2'
        }`}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden transition-all duration-300">
            <div className="w-8 h-8 rounded-lg bg-[#1A448A] border border-[#E5A823]/40 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              <GraduationCap className="h-4 w-4 text-[#E5A823]" />
            </div>
            <div className="flex flex-col min-w-0 pr-1 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="truncate text-sm font-bold leading-none tracking-tight text-foreground"
                  title="BukSU CMS"
                >
                  BukSU CMS
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#E5A823]/20 border border-[#E5A823]/40 text-[#B45309] dark:text-[#E5A823] rounded shrink-0">
                  COT
                </span>
              </div>
              <span
                className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                title="Capstone Studio"
              >
                Capstone Studio
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-border bg-background p-2 text-muted-foreground transition-colors hover:bg-accent lg:min-h-0 lg:min-w-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* 2. Navigation Content */}
      <nav
        className={`relative flex-1 py-4 min-h-0 overflow-y-auto overflow-x-hidden ${
          collapsed ? 'px-2 space-y-3' : 'px-3 space-y-5'
        }`}
      >
        {/* Workspace Section */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="truncate px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Workspace
            </p>
          )}
          <div className="space-y-0.5">
            {workspaceItems.map((item) =>
              item.group ? (
                <SidebarNavGroup
                  key={item.id}
                  item={item}
                  activePath={activePath}
                  collapsed={collapsed}
                  onNavigate={closeMobileNav}
                />
              ) : (
                <SidebarNavItem
                  key={item.id}
                  item={item}
                  active={activePath === item.path}
                  collapsed={collapsed}
                  onNavigate={closeMobileNav}
                />
              ),
            )}
          </div>
        </div>

        {/* Tools Section */}
        <div className="space-y-1 border-t border-border/60 pt-3">
          {!collapsed && (
            <p className="truncate px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {user?.role === ROLES.INSTRUCTOR ? 'Management & Tools' : 'Research Tools'}
            </p>
          )}
          <div className="space-y-0.5">
            {toolsItems.map((item) =>
              item.group ? (
                <SidebarNavGroup
                  key={item.id}
                  item={item}
                  activePath={activePath}
                  collapsed={collapsed}
                  onNavigate={closeMobileNav}
                />
              ) : (
                <SidebarNavItem
                  key={item.id}
                  item={item}
                  active={activePath === item.path}
                  collapsed={collapsed}
                  onNavigate={closeMobileNav}
                />
              ),
            )}
          </div>
        </div>
      </nav>

      {/* 3. Footer Actions */}
      <div
        className={`shrink-0 space-y-1 border-t border-border/60 ${
          collapsed ? 'p-2' : 'p-3'
        }`}
      >
        {systemItems.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            active={activePath === item.path}
            collapsed={collapsed}
            onNavigate={closeMobileNav}
          />
        ))}

        <button
          type="button"
          onClick={handleLogout}
          onMouseEnter={(e) => {
            if (!collapsed) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setSignOutCoords({
              top: (rect.top || 0) + (rect.height || 40) / 2,
              left: (rect.right || 80) + 10,
            });
          }}
          onMouseOver={(e) => {
            if (!collapsed) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setSignOutCoords({
              top: (rect.top || 0) + (rect.height || 40) / 2,
              left: (rect.right || 80) + 10,
            });
          }}
          onFocus={(e) => {
            if (!collapsed) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setSignOutCoords({
              top: (rect.top || 0) + (rect.height || 40) / 2,
              left: (rect.right || 80) + 10,
            });
          }}
          onMouseLeave={() => setSignOutCoords(null)}
          onBlur={() => setSignOutCoords(null)}
          className={`relative flex min-h-[44px] w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-all group outline-none select-none hover:bg-destructive/10 lg:min-h-10 ${
            collapsed ? 'justify-center px-0' : 'gap-3 min-w-0'
          }`}
          title={collapsed ? 'Sign out' : undefined}
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 shrink-0" />
          {!collapsed && (
            <span
              className="text-xs font-semibold truncate min-w-0 flex-1 text-left"
              title="Sign out"
            >
              Sign out
            </span>
          )}
        </button>
      </div>

      {/* Sign Out Tooltip Portal */}
      {collapsed &&
        signOutCoords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            data-testid="sidebar-tooltip"
            style={{ top: `${signOutCoords.top}px`, left: `${signOutCoords.left}px` }}
            className="fixed z-[9999] -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-semibold text-popover-foreground shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100"
          >
            Sign out
          </div>,
          document.body,
        )}
    </aside>
  );
}

Sidebar.propTypes = {
  open: PropTypes.bool,
  onToggle: PropTypes.func,
  mobileView: PropTypes.bool,
};

export const AppSidebar = Sidebar;
export default Sidebar;
