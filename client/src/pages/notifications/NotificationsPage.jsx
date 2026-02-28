import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bell, Check, CheckCheck, Info, AlertTriangle, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * NotificationsPage — in-app notifications centre.
 * Lists notifications with read/unread states.
 */

const ICON_MAP = {
  info: Info,
  warning: AlertTriangle,
  invite: UserPlus,
  default: Bell,
};

function NotificationItem({ notification, onMarkRead }) {
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
          <p className={cn('text-sm', !notification.isRead && 'font-medium')}>
            {notification.message}
          </p>
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
  const [notifications] = useState([]); // Placeholder — will integrate with notifications API

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = (id) => {
    // TODO: Integrate with notification API - PATCH /api/notifications/:id/read
    // eslint-disable-next-line no-console -- TODO: replace with notification API call
    console.info('Mark notification read:', id);
  };

  const handleMarkAllRead = () => {
    // TODO: Integrate with notification API - PATCH /api/notifications/read-all
    // eslint-disable-next-line no-console -- TODO: replace with notification API call
    console.info('Mark all notifications read');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Notifications</h3>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`
                : 'You\u2019re all caught up.'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
