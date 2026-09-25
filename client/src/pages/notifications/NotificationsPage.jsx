import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  UserPlus,
  Users,
  FileText,
  FolderOpen,
  ShieldCheck,
  ShieldX,
  FilePen,
  Lock,
  Unlock,
  MessageSquare,
  HandHeart,
  Clock,
  BookOpen,
  Star,
  Trash2,
  Loader2,
  UserCheck,
  Search,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ROLES } from '@cms/shared';
import { Badge } from '@/components/ui/Badge';
import { AssignCommitteeDialog } from '@/components/teams/AssignCommitteeDialog';
import { TeamFormationNotificationItem } from '@/components/teams/TeamFormationNotificationItem';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from '@/hooks/useNotifications';

/** Maps notification types to lucide icons. */
const ICON_MAP = {
  // Team events
  team_created: Users,
  team_invite: UserPlus,
  team_joined: Users,
  team_locked: Lock,
  team_formation_pending_committee: Users,
  committee_appointment_required: UserCheck,
  committee_assigned: ShieldCheck,
  secretary_assigned: UserCheck,
  // Project events
  project_created: FolderOpen,
  project_rejected: ShieldX,
  // Title events
  title_submitted: FileText,
  title_approved: ShieldCheck,
  title_rejected: ShieldX,
  title_modification_requested: FilePen,
  title_modification_resolved: Check,
  // Assignment events
  adviser_assigned: HandHeart,
  panelist_assigned: Star,
  panelist_selected: Star,
  panelist_removed: ShieldX,
  // Deadline events
  deadlines_set: Clock,
  deadline_due: AlertTriangle,
  milestone_deadline_scheduled: Clock,
  // Submission events
  chapter_submitted: BookOpen,
  proposal_submitted: FileText,
  submission_approved: ShieldCheck,
  submission_revisions_required: FilePen,
  submission_rejected: ShieldX,
  submission_locked: Lock,
  // Unlock events
  unlock_requested: Unlock,
  unlock_resolved: Unlock,
  // Annotation events
  annotation_added: MessageSquare,
  // System events
  welcome: Info,
  system: AlertTriangle,
  // Default
  default: Bell,
};

const PROJECT_NOTIFICATION_TYPES = new Set([
  'project_created',
  'title_submitted',
  'title_approved',
  'title_rejected',
  'title_modification_requested',
  'title_modification_resolved',
  'adviser_assigned',
  'panelist_assigned',
  'panelist_selected',
  'panelist_removed',
  'deadlines_set',
  'deadline_due',
  'milestone_deadline_scheduled',
  'project_rejected',
  'phase_advanced',
  'prototype_added',
  'evaluation_submitted',
  'evaluation_released',
  'certificate_uploaded',
  'project_archived',
]);

const TITLE_NOTIFICATION_TYPES = new Set([
  'title_submitted',
  'title_approved',
  'title_rejected',
  'title_modification_requested',
  'title_modification_resolved',
  'project_created',
  'project_rejected',
]);

const SUBMISSION_NOTIFICATION_TYPES = new Set([
  'chapter_submitted',
  'proposal_submitted',
  'submission_approved',
  'submission_revisions_required',
  'submission_rejected',
  'submission_locked',
  'unlock_requested',
  'unlock_resolved',
  'annotation_added',
  'plagiarism_complete',
  'plagiarism_failed',
]);

const TAB_BY_DEFENSE = {
  proposal: 'capstone_1',
  progress: 'capstone_2',
  midterm: 'capstone_2',
  paper: 'capstone_3',
  final: 'capstone_3',
};

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'deadlines', label: 'Deadlines & Milestones' },
  { id: 'teams', label: 'Teams & Committee' },
  { id: 'submissions', label: 'Submissions & Reviews' },
];

function getNotificationTarget(notification, role) {
  const metadata = notification?.metadata || {};
  const projectId = metadata.projectId || metadata.project?._id || metadata.projectId;
  const chapter = metadata.chapter;
  const defenseType = metadata.defenseType;

  if (role !== ROLES.STUDENT && projectId && PROJECT_NOTIFICATION_TYPES.has(notification.type)) {
    return `/projects?projectId=${encodeURIComponent(projectId)}`;
  }

  if (notification.type === 'team_invite') {
    const inviteToken = metadata.inviteToken || metadata.inviteCode;
    if (inviteToken) {
      return `/teams/invites/${encodeURIComponent(inviteToken)}/accept`;
    }
    return '/teams';
  }

  if (notification.type === 'team_joined' || notification.type === 'team_locked') {
    return '/dashboard';
  }

  if (
    notification.type === 'deadline_due' ||
    notification.type === 'deadlines_set' ||
    notification.type === 'milestone_deadline_scheduled'
  ) {
    return '/project/submissions';
  }

  if (SUBMISSION_NOTIFICATION_TYPES.has(notification.type)) {
    if (notification.type === 'proposal_submitted') {
      return '/project?tab=capstone_1';
    }

    if (notification.type === 'chapter_submitted' && chapter) {
      return `/project/submissions?chapter=${encodeURIComponent(chapter)}`;
    }

    if (chapter) {
      return `/project/submissions?chapter=${encodeURIComponent(chapter)}`;
    }

    return '/project/submissions';
  }

  if (TITLE_NOTIFICATION_TYPES.has(notification.type)) {
    return '/project?tab=capstone_1';
  }

  if (notification.type === 'phase_advanced') {
    return `/project?tab=${TAB_BY_DEFENSE[defenseType] || 'capstone_1'}`;
  }

  if (notification.type === 'project_created' || notification.type === 'project_rejected') {
    return '/project?tab=capstone_1';
  }

  if (notification.type === 'certificate_uploaded' || notification.type === 'project_archived') {
    return '/project?tab=capstone_3';
  }

  if (role !== ROLES.STUDENT && projectId) {
    return `/projects?projectId=${encodeURIComponent(projectId)}`;
  }

  return '/project';
}

function isInteractiveTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('button, a, input, select, textarea, [role="button"]'));
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function NotificationCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 bg-muted rounded" />
          <div className="h-3 w-4/5 bg-muted rounded" />
          <div className="h-2.5 w-1/4 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onOpen,
  onMarkRead,
  onDelete,
  isDeletePending,
  onInspectRoster,
  onAssignCommittee,
}) {
  const Icon = ICON_MAP[notification.type] || ICON_MAP.default;

  const handleActionClick = (handler, id) => (event) => {
    event?.stopPropagation?.();
    handler(id);
  };

  const isActionableCommittee =
    Boolean(notification?.metadata?.requiresCommittee) ||
    notification.type === 'team_formation_pending_committee' ||
    notification.type === 'committee_appointment_required';

  if (isActionableCommittee) {
    return (
      <TeamFormationNotificationItem
        notification={notification}
        onInspectRoster={onInspectRoster}
        onAssignCommittee={onAssignCommittee}
        onMarkRead={onMarkRead}
        onDelete={onDelete}
        isDeletePending={isDeletePending}
      />
    );
  }

  const isDeadlineDue = notification.type === 'deadline_due';
  const isDeadlinesSet =
    notification.type === 'deadlines_set' || notification.type === 'milestone_deadline_scheduled';

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (isInteractiveTarget(event.target)) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen?.();
        }
      }}
      className={cn(
        'group cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs hover:shadow-md border',
        !notification.isRead && 'border-primary/40 bg-primary/[0.03] dark:bg-primary/[0.05]',
        isDeadlineDue &&
          !notification.isRead &&
          'border-rose-500/50 bg-rose-500/[0.05] dark:bg-rose-500/[0.08]',
      )}
    >
      <CardContent className="flex items-start gap-4 p-4">
        {/* Type Icon Badge */}
        <div
          className={cn(
            'shrink-0 mt-0.5 rounded-xl p-2.5 flex items-center justify-center transition-colors',
            isDeadlineDue
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30'
              : isDeadlinesSet
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30'
                : notification.isRead
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary/10 text-primary ring-1 ring-primary/20',
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                'text-sm text-foreground',
                !notification.isRead ? 'font-semibold' : 'font-medium',
              )}
            >
              {notification.title}
            </p>

            {isDeadlineDue && (
              <Badge
                variant="destructive"
                className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.2"
              >
                Deadline Reached
              </Badge>
            )}

            {isDeadlinesSet && (
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-blue-500/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.2"
              >
                Milestone
              </Badge>
            )}

            {!notification.isRead && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary ml-auto sm:ml-0">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                <span>Unread</span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{notification.message}</p>

          <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span>
              {notification.createdAt
                ? new Date(notification.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Just now'}
            </span>
            <span>•</span>
            <span>{formatTimeAgo(notification.createdAt)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpen}
            title="Open view"
            aria-label="Open view"
            className="text-muted-foreground hover:text-foreground hidden sm:inline-flex"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Button>

          {!notification.isRead && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleActionClick(onMarkRead, notification._id)}
              aria-label="Mark as read"
              title="Mark as read"
              className="text-muted-foreground hover:text-primary"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleActionClick(onDelete, notification._id)}
            aria-label="Delete notification"
            title="Delete notification"
            disabled={isDeletePending}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyNotifications({ activeTab = 'all', hasSearch = false, onClearSearch }) {
  let title = 'No notifications yet';
  let description = "You'll see updates about your capstone progress, team invites, and more here.";

  if (hasSearch) {
    title = 'No matching notifications';
    description = 'No notifications match your search query.';
  } else if (activeTab === 'unread') {
    title = 'You are all caught up!';
    description = 'No unread notifications at this time.';
  } else if (activeTab === 'deadlines') {
    title = 'No deadline notifications';
    description = 'Milestone submission deadlines and schedules will appear here.';
  } else if (activeTab === 'teams') {
    title = 'No team notifications';
    description = 'Team invitations, formations, and committee assignments will appear here.';
  } else if (activeTab === 'submissions') {
    title = 'No submission notifications';
    description = 'Chapter review remarks, approvals, and originality results will appear here.';
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/30 py-16 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
        <Bell className="h-6 w-6 stroke-1" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-xs sm:text-sm text-muted-foreground">{description}</p>
      {hasSearch && (
        <Button variant="outline" size="sm" onClick={onClearSearch} className="mt-4 text-xs">
          Clear search
        </Button>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [assignCommitteeTarget, setAssignCommitteeTarget] = useState(null);
  const pendingDeleteIdRef = useRef(null);
  const clearAllInFlightRef = useRef(false);
  const clearAllTriggerRef = useRef(null);
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const limit = 25;

  useEffect(() => {
    if (!isConfirmOpen) {
      if (clearAllTriggerRef.current instanceof HTMLElement) {
        clearAllTriggerRef.current.focus();
      }
      return;
    }

    const focusTarget = cancelButtonRef.current;
    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus();
    }
  }, [isConfirmOpen]);

  const { data, isLoading, isError, refetch } = useNotifications({ page, limit });
  const markAsRead = useMarkAsRead({
    onError: () => toast.error('Failed to mark notification as read.'),
  });
  const markAllAsRead = useMarkAllAsRead({
    onSuccess: () => toast.success('All notifications marked as read.'),
    onError: () => toast.error('Failed to mark all as read.'),
  });
  const deleteNotification = useDeleteNotification({
    onError: () => toast.error('Failed to delete notification.'),
  });
  const clearAll = useClearAllNotifications({
    onSuccess: () => toast.success('All notifications cleared.'),
    onError: () => toast.error('Failed to clear notifications.'),
  });

  const rawNotifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const pagination = data?.pagination || {};

  // Filter notifications by category tab and search query
  const filteredNotifications = useMemo(() => {
    return rawNotifications.filter((n) => {
      // Tab filter
      if (activeTab === 'unread' && n.isRead) return false;
      if (activeTab === 'deadlines') {
        const isDeadlineType =
          n.type === 'deadlines_set' ||
          n.type === 'deadline_due' ||
          n.type === 'milestone_deadline_scheduled';
        if (!isDeadlineType) return false;
      }
      if (activeTab === 'teams') {
        const isTeamType =
          n.type?.startsWith('team_') ||
          n.type?.startsWith('committee_') ||
          n.type?.startsWith('adviser_') ||
          n.type?.startsWith('panelist_') ||
          n.type?.startsWith('secretary_');
        if (!isTeamType) return false;
      }
      if (activeTab === 'submissions') {
        const isSubmissionType =
          n.type?.startsWith('submission_') ||
          n.type === 'chapter_submitted' ||
          n.type === 'proposal_submitted' ||
          n.type?.startsWith('plagiarism_') ||
          n.type?.startsWith('evaluation_') ||
          n.type === 'annotation_added';
        if (!isSubmissionType) return false;
      }

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesMsg = n.message?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg) return false;
      }

      return true;
    });
  }, [rawNotifications, activeTab, searchQuery]);

  if (!user) {
    fetchUser();
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const handleMarkRead = (id) => {
    markAsRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  const handleDelete = (id) => {
    if (pendingDeleteIdRef.current === id) {
      return;
    }

    pendingDeleteIdRef.current = id;
    setPendingDeleteId(id);

    deleteNotification.mutate(id, {
      onSettled: () => {
        if (pendingDeleteIdRef.current === id) {
          pendingDeleteIdRef.current = null;
        }

        setPendingDeleteId((current) => (current === id ? null : current));
      },
    });
  };

  const handleOpenNotification = (notification) => {
    const target = getNotificationTarget(notification, user.role);
    navigate(target);
  };

  const handleOpenClearAllConfirm = () => {
    setConfirmError('');
    setIsConfirmOpen(true);
  };

  const handleCloseClearAllConfirm = () => {
    if (!clearAll.isPending) {
      setConfirmError('');
      setIsConfirmOpen(false);
    }
  };

  const handleClearAll = () => {
    if (clearAllInFlightRef.current || clearAll.isPending) {
      return;
    }

    clearAllInFlightRef.current = true;
    setConfirmError('');
    clearAll.mutate(undefined, {
      onSuccess: () => {
        clearAllInFlightRef.current = false;
        toast.success('All notifications cleared.');
        setConfirmError('');
        setIsConfirmOpen(false);
      },
      onError: () => {
        clearAllInFlightRef.current = false;
        setConfirmError('Failed to clear notifications. Please try again.');
      },
    });
  };

  const handleDialogKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCloseClearAllConfirm();
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) {
      return;
    }

    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll(focusableSelectors.join(',')),
    );

    if (focusableElements.length === 0) {
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Ribbon */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs px-2 py-0.5 font-mono">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`
                : 'You are completely caught up.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllAsRead.isPending}
                className="gap-1.5 text-xs shadow-xs"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
            {rawNotifications.length > 0 && (
              <Button
                ref={clearAllTriggerRef}
                variant="outline"
                size="sm"
                onClick={handleOpenClearAllConfirm}
                disabled={clearAll.isPending}
                className="text-destructive hover:text-destructive gap-1.5 text-xs shadow-xs border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Filter Toolbar: Category Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20 p-2 rounded-xl border border-border/60">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-card text-foreground shadow-xs font-semibold border border-border/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="h-8 pl-8 pr-7 text-xs bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-3">
            <NotificationCardSkeleton />
            <NotificationCardSkeleton />
            <NotificationCardSkeleton />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            Failed to load notifications. Please try again later.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filteredNotifications.length === 0 && (
          <EmptyNotifications
            activeTab={activeTab}
            hasSearch={Boolean(searchQuery.trim())}
            onClearSearch={() => setSearchQuery('')}
          />
        )}

        {/* Notification list */}
        {!isLoading && !isError && filteredNotifications.length > 0 && (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onOpen={() => handleOpenNotification(notification)}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
                isDeletePending={pendingDeleteId === notification._id}
                onInspectRoster={(teamId) =>
                  navigate(teamId ? `/teams?teamId=${encodeURIComponent(teamId)}` : '/teams')
                }
                onAssignCommittee={(target) => setAssignCommitteeTarget(target)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground font-mono">
              Page {page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseClearAllConfirm();
            }
          }}
          onKeyDown={handleDialogKeyDown}
        >
          <Card
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-all-dialog-title"
            aria-describedby="clear-all-dialog-description"
            className="w-full max-w-md border-destructive/30 shadow-xl"
          >
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <h4 id="clear-all-dialog-title" className="text-lg font-semibold text-foreground">
                  Confirm Action
                </h4>
                <p id="clear-all-dialog-description" className="text-sm text-muted-foreground">
                  Clear all notifications? This action cannot be undone.
                </p>
                {confirmError && (
                  <p role="alert" className="text-sm text-destructive font-medium">
                    {confirmError}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  ref={cancelButtonRef}
                  variant="outline"
                  onClick={handleCloseClearAllConfirm}
                  disabled={clearAll.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleClearAll}
                  disabled={clearAll.isPending}
                  className="gap-1.5"
                >
                  {clearAll.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {assignCommitteeTarget && (
        <AssignCommitteeDialog
          open={Boolean(assignCommitteeTarget)}
          onOpenChange={(open) => !open && setAssignCommitteeTarget(null)}
          teamId={assignCommitteeTarget.teamId}
          teamName={assignCommitteeTarget.teamName}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </DashboardLayout>
  );
}
