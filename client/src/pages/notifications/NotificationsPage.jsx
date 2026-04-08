import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ROLES } from '@cms/shared';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from '@/hooks/useNotifications';

/**
 * NotificationsPage — in-app notifications centre.
 * Wired to the notifications API with real-time polling (30s).
 */

/** Maps notification types to lucide icons. */
const ICON_MAP = {
  // Team events
  team_invite: UserPlus,
  team_joined: Users,
  team_locked: Lock,
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
  // Submission events
  chapter_submitted: BookOpen,
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
  midterm: 'capstone_2',
  paper: 'capstone_3',
  final: 'final',
};

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

    return '/team';
  }

  if (notification.type === 'team_joined' || notification.type === 'team_locked') {
    return '/team';
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
    return '/project?tab=proposal';
  }

  if (notification.type === 'phase_advanced') {
    return `/project?tab=${TAB_BY_DEFENSE[defenseType] || 'proposal'}`;
  }

  if (notification.type === 'project_created' || notification.type === 'project_rejected') {
    return '/project?tab=proposal';
  }

  if (notification.type === 'certificate_uploaded' || notification.type === 'project_archived') {
    return '/project?tab=final';
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

function NotificationItem({ notification, onOpen, onMarkRead, onDelete, isDeletePending }) {
  const Icon = ICON_MAP[notification.type] || ICON_MAP.default;

  const handleActionClick = (handler, id) => (event) => {
    event.stopPropagation();
    handler(id);
  };

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
        'cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !notification.isRead && 'border-primary/30 bg-primary/5',
      )}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div
          className={cn(
            'mt-0.5 rounded-md p-2',
            notification.isRead ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-1">
          <p className={cn('text-sm font-medium', notification.isRead && 'font-normal')}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              <span>Unread</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{notification.message}</p>
          <p className="text-xs text-muted-foreground">
            {notification.createdAt
              ? new Date(notification.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Just now'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleActionClick(onMarkRead, notification._id)}
              aria-label="Mark as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleActionClick(onDelete, notification._id)}
            aria-label="Delete notification"
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

function EmptyNotifications() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
      <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-semibold">No notifications yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        You&apos;ll see updates about your capstone progress, team invites, and more here.
      </p>
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const pendingDeleteIdRef = useRef(null);
  const clearAllInFlightRef = useRef(false);
  const clearAllTriggerRef = useRef(null);
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const limit = 20;

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

  const { data, isLoading, isError } = useNotifications({ page, limit });
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

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const pagination = data?.pagination || {};

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Notifications</h3>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`
                : 'You\u2019re all caught up.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                ref={clearAllTriggerRef}
                variant="outline"
                size="sm"
                onClick={handleOpenClearAllConfirm}
                disabled={clearAll.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            Failed to load notifications. Please try again later.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && notifications.length === 0 && <EmptyNotifications />}

        {/* Notification list */}
        {!isLoading && !isError && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onOpen={() => handleOpenNotification(notification)}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
                isDeletePending={pendingDeleteId === notification._id}
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
            <span className="text-sm text-muted-foreground">
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
            className="w-full max-w-md border-destructive/30"
          >
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <h4 id="clear-all-dialog-title" className="text-lg font-semibold">
                  Confirm Action
                </h4>
                <p id="clear-all-dialog-description" className="text-sm text-muted-foreground">
                  Clear all notifications? This action cannot be undone.
                </p>
                {confirmError && (
                  <p role="alert" className="text-sm text-destructive">
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
                >
                  {clearAll.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
