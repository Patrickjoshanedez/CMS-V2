import { useState } from 'react';
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

function NotificationItem({ notification, onMarkRead, onDelete }) {
  const Icon = ICON_MAP[notification.type] || ICON_MAP.default;

  return (
    <Card
      className={cn('transition-colors', !notification.isRead && 'border-primary/30 bg-primary/5')}
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
              onClick={() => onMarkRead(notification._id)}
              aria-label="Mark as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(notification._id)}
            aria-label="Delete notification"
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
  const { user, fetchUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError } = useNotifications({ page, limit });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const clearAll = useClearAllNotifications();

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
    deleteNotification.mutate(id);
  };

  const handleClearAll = () => {
    clearAll.mutate();
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
                variant="outline"
                size="sm"
                onClick={handleClearAll}
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
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
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
    </DashboardLayout>
  );
}
