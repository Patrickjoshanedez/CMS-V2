import React, { useState, useMemo } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

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
  let queryClient = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    queryClient = useQueryClient();
  } catch {
    queryClient = appQueryClient;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.path}
            aria-label={collapsed ? item.label : undefined}
            onClick={onNavigate}
            onMouseEnter={() => prefetchRoute(item.path, queryClient || appQueryClient)}
            onFocus={() => prefetchRoute(item.path, queryClient || appQueryClient)}
            className={`relative w-full min-h-[44px] lg:min-h-10 flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all group outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background select-none ${
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
                    ? 'border border-warning/40 bg-warning/15 text-warning-foreground'
                    : item.badgeVariant === 'success'
                      ? 'border border-success/40 bg-success/15 text-success-foreground'
                      : 'border border-border bg-muted text-muted-foreground'
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent
            side="right"
            sideOffset={8}
            className="flex items-center gap-2 font-medium"
          >
            {item.label}
            {item.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 text-[9px] rounded font-bold ${
                  item.badgeVariant === 'warning'
                    ? 'bg-warning text-warning-foreground'
                    : item.badgeVariant === 'success'
                      ? 'bg-success text-success-foreground'
                      : 'bg-primary text-primary-foreground'
                }`}
              >
                {item.badge}
              </span>
            )}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
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
  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={item.children?.[0]?.path || item.path}
              aria-label={item.label}
              onClick={onNavigate}
              onMouseEnter={() =>
                prefetchRoute(item.children?.[0]?.path || item.path, queryClient || appQueryClient)
              }
              onFocus={() =>
                prefetchRoute(item.children?.[0]?.path || item.path, queryClient || appQueryClient)
              }
              className={`relative flex min-h-[44px] w-full items-center justify-center rounded-lg px-0 py-2 text-xs font-medium transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:min-h-10 ${
                isChildActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isChildActive && (
                <div className="pointer-events-none absolute inset-0 rounded-lg border border-primary/30 bg-primary/10 shadow-2xs" />
              )}
              <Icon className="relative z-10 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:scale-110" />
            </Link>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={8}
            data-testid="sidebar-tooltip"
            className="font-medium"
          >
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative h-auto w-full min-h-[44px] min-w-0 justify-start gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium transition-all group select-none whitespace-normal lg:min-h-10 ${
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
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-250 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </Button>

      <div
        className="grid transition-[grid-template-rows] duration-250 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
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
      aria-label="Main navigation"
      className={`lg:relative flex flex-col justify-between h-dvh bg-card border-r border-border transition-[width] duration-300 ease-in-out select-none shrink-0 z-30 overflow-hidden ${
        collapsed
          ? 'hidden lg:flex w-20 min-w-[5rem]'
          : 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-xl lg:relative lg:max-w-[21rem] lg:shadow-none'
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
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary text-sm font-bold text-primary-foreground shadow-xs">
              <GraduationCap className="size-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <div className="flex flex-col min-w-0 pr-1 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="truncate text-sm font-bold leading-none tracking-tight text-foreground"
                  title="BukSU CMS"
                >
                  BukSU CMS
                </span>
                <span className="shrink-0 rounded-sm border border-secondary/60 bg-secondary/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-secondary-foreground">
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

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onToggle}
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg p-2 text-muted-foreground lg:min-h-0 lg:min-w-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          />
        </Button>
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
      <div className={`shrink-0 space-y-1 border-t border-border/60 ${collapsed ? 'p-2' : 'p-3'}`}>
        {systemItems.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            active={activePath === item.path}
            collapsed={collapsed}
            onNavigate={closeMobileNav}
          />
        ))}

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={handleLogout}
                className={`relative flex h-auto min-h-[44px] w-full min-w-0 items-center justify-start rounded-lg px-3 py-2 text-left text-xs font-medium text-destructive transition-all group select-none whitespace-normal hover:bg-destructive/10 lg:min-h-10 ${
                  collapsed ? 'justify-center px-0' : 'gap-3 min-w-0'
                }`}
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 shrink-0" />
                {!collapsed && (
                  <span className="text-xs font-semibold truncate min-w-0 flex-1 text-left">
                    Sign out
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent
                side="right"
                sideOffset={8}
                data-testid="sidebar-tooltip"
                className="font-medium"
              >
                Sign out
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
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
