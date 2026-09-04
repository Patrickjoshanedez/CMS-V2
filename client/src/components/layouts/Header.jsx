import { useEffect, useRef, useState } from 'react';
import { Menu, Bell, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadCount } from '@/hooks/useNotifications';
import { ROLES } from '@cms/shared';

/**
 * Declarative route mapping rules with regex patterns.
 * Evaluated strictly in order from most specific parameterized routes to broad fallbacks.
 */
export const ROUTE_TITLE_RULES = [
  // 1. Query parameter specific routes (must precede general /projects)
  {
    matcher: (pathname, search) => pathname === '/projects' && search.includes('filter=advisees'),
    title: 'Adviser Reviews',
  },
  {
    matcher: (pathname, search) => pathname === '/projects' && search.includes('filter=panel'),
    title: 'Panel Review',
  },

  // 2. Specific nested project sub-routes
  { pattern: /^\/projects\/[^/]+\/certificate\/?$/, title: 'Certificate of Completion' },
  { pattern: /^\/projects\/[^/]+\/documents\/[^/]+\/?$/, title: 'Document Editor' },

  // 3. Submissions & Chapters (Student / Review)
  { pattern: /^\/project\/submissions\/upload\/?$/, title: 'Upload Chapter' },
  { pattern: /^\/project\/submissions\/[^/]+\/plagiarism-report\/?$/, title: 'Plagiarism Report' },
  { pattern: /^\/project\/submissions\/[^/]+\/review\/?$/, title: 'Submission Review' },
  { pattern: /^\/project\/submissions\/[^/]+\/?$/, title: 'Submission Detail' },
  { pattern: /^\/project\/submissions\/?$/, title: 'Submissions' },
  { pattern: /^\/project\/proposal\/?$/, title: 'Proposal Compilation' },
  { pattern: /^\/project\/create\/?$/, title: 'Create Project' },
  { pattern: /^\/project\/?$/, title: 'My Capstone' },

  // 4. Projects & Reviews (Faculty/Instructor)
  { pattern: /^\/projects\/[^/]+\/?$/, title: 'Project Details' },
  { pattern: /^\/projects\/?$/, title: 'Instructor Review' },
  { pattern: /^\/adviser\/team-review\/?$/, title: 'Team Review' },

  // 5. Cloud Documents & Templates
  { pattern: /^\/documents\/manuscripts\/?$/, title: 'Manuscript Management' },
  { pattern: /^\/documents\/templates\/?$/, title: 'Document Templates' },

  // 6. Admin & Governance
  { pattern: /^\/admin\/evaluation-templates\/?$/, title: 'Evaluation Rubric Builder' },
  { pattern: /^\/admin\/audit(-log)?\/?$/, title: 'Activity Log' },
  { pattern: /^\/admin\/users\/?$/, title: 'User Management' },
  { pattern: /^\/users\/?$/, title: 'Users' },

  // 7. Teams
  { pattern: /^\/teams\/invites\/[^/]+\/[^/]+\/?$/, title: 'Team Invitation' },
  { pattern: /^\/teams\/?$/, title: 'My Team' },
  { pattern: /^\/team\/?$/, title: 'My Team' },

  // 8. Archive & Plagiarism
  { pattern: /^\/archive\/upload\/capstone\/?$/, title: 'Upload Archived Capstone' },
  { pattern: /^\/archive\/upload\/academic-paper\/?$/, title: 'Upload Academic Paper' },
  { pattern: /^\/archive\/upload\/academic-journal\/?$/, title: 'Upload Academic Journal' },
  { pattern: /^\/archive\/?$/, title: 'Research Archive' },
  { pattern: /^\/plagiarism-checker\/?$/, title: 'Plagiarism Checker' },

  // 9. Reports
  { pattern: /^\/reports\/bulk-upload\/?$/, title: 'Bulk Upload' },
  { pattern: /^\/reports\/?$/, title: 'Reports' },

  // 10. General User Views
  { pattern: /^\/dashboard\/?$/, title: 'Dashboard' },
  { pattern: /^\/notifications\/?$/, title: 'Notifications' },
  { pattern: /^\/profile\/?$/, title: 'Profile' },
  { pattern: /^\/settings\/?$/, title: 'Settings' },
];

/**
 * Derive the page title from current pathname and search params using declarative regex matching.
 *
 * @param {string} pathname
 * @param {string} search
 * @returns {string}
 */
export function getPageTitle(pathname = '', search = '', role = null) {
  if (
    role &&
    role !== ROLES.STUDENT &&
    (/^\/teams\/?$/.test(pathname) || /^\/team\/?$/.test(pathname))
  ) {
    return 'Teams';
  }

  for (const rule of ROUTE_TITLE_RULES) {
    if (rule.matcher && rule.matcher(pathname, search)) {
      return rule.title;
    }
    if (rule.pattern && rule.pattern.test(pathname)) {
      return rule.title;
    }
  }

  return 'Dashboard';
}

function getRoleLabel(role) {
  if (!role) return '';

  if (role === ROLES.ADVISER || role === ROLES.PANELIST) {
    return 'Faculty';
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Header — top bar with mobile menu toggle, user info, theme toggle, and notifications.
 */
/**
 * Derive an explicit back-navigation destination for routes that live
 * "inside" a parent page. Returns { to, label } or null for top-level routes.
 * Using explicit destinations (instead of navigate(-1)) keeps navigation
 * correct for users arriving via direct link (e.g. from an email notification).
 */
function getBackDestination(pathname) {
  // Must check exact /project/submissions BEFORE the wildcard sub-route match
  if (/^\/project\/submissions\/?$/.test(pathname))
    return { to: '/project', label: 'Back to My Capstone' };
  // Student chapter-upload sits inside /project/submissions
  if (/^\/project\/submissions\/upload\/?$/.test(pathname))
    return { to: '/project/submissions', label: 'Back to Submissions' };
  // Student proposal compilation sits inside /project/submissions
  if (/^\/project\/proposal\/?$/.test(pathname))
    return { to: '/project/submissions', label: 'Back to Submissions' };
  // Submission detail / review / plagiarism-report sit inside /project/submissions
  if (/^\/project\/submissions\/[^/]+/.test(pathname))
    return { to: '/project/submissions', label: 'Back to Submissions' };
  // Project detail / certificate / document editor sit inside /projects
  if (pathname.startsWith('/projects/') && pathname !== '/projects')
    return { to: '/projects', label: 'Back to Projects' };
  // Archive detail sits inside /archive
  if (pathname.startsWith('/archive/') && pathname !== '/archive')
    return { to: '/archive', label: 'Back to Archive' };
  return null;
}

export default function Header({ sidebarOpen, onMenuClick }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const user = useAuthStore((state) => state.user);
  const { data: unreadCount = 0 } = useUnreadCount();
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const roleLabel = getRoleLabel(user?.role);
  const pageTitle = getPageTitle(pathname, search, user?.role);

  const backDestination = getBackDestination(pathname);

  // Reset broken-avatar state whenever the avatarUrl changes
  useEffect(() => {
    setAvatarBroken(false);
  }, [user?.avatarUrl]);

  // Auto-hide header on scroll-down, reveal on scroll-up
  useEffect(() => {
    // The scrollable container is the <main> sibling — but since DashboardLayout
    // wraps the header and main in the same flex column, we listen on the nearest
    // overflow-y-auto ancestor which is the div wrapping main inside DashboardLayout.
    // Using window as the fallback covers most cases.
    const scroller = document.querySelector('main.relative');
    if (!scroller) return;

    const onScroll = () => {
      const current = scroller.scrollTop;
      const delta = current - lastScrollY.current;
      if (delta > 8 && current > 64) {
        setHidden(true);
      } else if (delta < -8 || current < 64) {
        setHidden(false);
      }
      lastScrollY.current = current;
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6',
        'transition-transform duration-300 ease-in-out',
        hidden ? '-translate-y-full' : 'translate-y-0',
      ].join(' ')}
    >
      {/* Left side: menu button + page title */}
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button
            onClick={onMenuClick}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {backDestination && (
          <button
            onClick={() => navigate(backDestination.to)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={backDestination.label}
            title={backDestination.label}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

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
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent"
          aria-label="Go to profile"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground overflow-hidden">
            {user?.avatarUrl && !avatarBroken ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || 'avatar'}
                className="h-full w-full object-cover"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              initials
            )}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </button>
      </div>
    </header>
  );
}
