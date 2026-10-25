import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  ArrowRight,
  Inbox,
  AlertCircle,
  Users,
  FileText,
  ShieldCheck,
  BookOpen,
  Lock,
  Star,
  HandHeart,
  UserCheck,
} from 'lucide-react';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@cms/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

const ICON_MAP = {
  team_created: Users,
  team_invite: Users,
  team_joined: Users,
  team_locked: Lock,
  team_formation_pending_committee: Users,
  committee_appointment_required: UserCheck,
  committee_assigned: ShieldCheck,
  secretary_assigned: UserCheck,
  adviser_assigned: HandHeart,
  panelist_assigned: Star,
  deadlines_set: Clock,
  deadline_due: AlertCircle,
  chapter_submitted: BookOpen,
  proposal_submitted: FileText,
  submission_approved: ShieldCheck,
  submission_revisions_required: FileText,
  submission_rejected: AlertCircle,
  default: Bell,
};

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

function resolveNotificationTarget(notification, role) {
  const metadata = notification?.metadata || {};
  const projectId = metadata.projectId || metadata.project?._id;

  if (role !== ROLES.STUDENT && projectId) {
    return `/projects?projectId=${encodeURIComponent(projectId)}`;
  }

  if (notification.type === 'team_invite') {
    const inviteToken = metadata.inviteToken || metadata.inviteCode;
    return inviteToken ? `/teams/invites/${encodeURIComponent(inviteToken)}/accept` : '/teams';
  }

  if (notification.type === 'deadline_due' || notification.type === 'deadlines_set') {
    return '/project/submissions';
  }

  if (notification.type?.startsWith('submission_') || notification.type === 'chapter_submitted') {
    return metadata.chapter
      ? `/project/submissions?chapter=${encodeURIComponent(metadata.chapter)}`
      : '/project/submissions';
  }

  return '/project';
}

export default function NotificationBellPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifData, isLoading } = useNotifications({ page: 1, limit: 10 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = notifData?.notifications || [];
  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const handleOpenNotification = (notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification._id);
    }
    setIsOpen(false);
    const target = resolveNotificationTarget(notification, user?.role);
    navigate(target);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Notifications"
          aria-expanded={isOpen}
          data-testid="header-notification-bell"
          className={cn(
            'relative size-11 text-muted-foreground',
            isOpen && 'border-primary text-primary',
          )}
        >
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              <span className="sr-only">{unreadCount} unread notifications</span>
              <span aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label="Notifications"
        className="z-50 flex max-h-[min(32rem,calc(100dvh-5rem))] w-[calc(100vw-1rem)] max-w-96 flex-col overflow-hidden rounded-lg p-0 shadow-lg"
      >
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0.5 font-mono text-[10px]">
                {unreadCount} new
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="h-8 gap-1 px-2 text-xs text-primary hover:text-primary/80"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Mark read
              </Button>
            )}
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter notifications"
          className="flex shrink-0 items-center gap-1 border-b border-border/60 bg-muted/20 px-3 py-1.5"
        >
          <Button
            variant={activeTab === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            className="h-8 px-3 text-xs"
          >
            All
          </Button>
          <Button
            variant={activeTab === 'unread' ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={activeTab === 'unread'}
            onClick={() => setActiveTab('unread')}
            className="h-8 px-3 text-xs"
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </div>

        {/* Notification List */}
        <div className="min-h-0 max-h-80 overflow-y-auto divide-y divide-border/40 scrollbar-thin">
          {isLoading ? (
            <div role="status" aria-label="Loading notifications" className="space-y-3 p-4">
              <Skeleton className="mx-auto h-4 w-3/4" />
              <Skeleton className="mx-auto h-3 w-1/2" />
              <span className="sr-only">Loading notifications…</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              description="You are completely caught up!"
              compact
              className="m-3 rounded-md border-0"
            />
          ) : (
            filteredNotifications.slice(0, 5).map((notif) => {
              const Icon = ICON_MAP[notif.type] || ICON_MAP.default;
              const isUrgent =
                notif.type === 'deadline_due' || notif.type === 'submission_rejected';

              return (
                <div key={notif._id} className="group relative flex items-stretch">
                  <Button
                    variant="ghost"
                    onClick={() => handleOpenNotification(notif)}
                    className={cn(
                      'h-auto min-h-0 min-w-0 flex-1 justify-start gap-3 rounded-none px-3.5 py-3.5 pr-12 text-left font-normal whitespace-normal',
                      !notif.isRead && 'bg-primary/5 hover:bg-primary/10',
                      isUrgent && !notif.isRead && 'border-l-2 border-destructive bg-destructive/5',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                        isUrgent
                          ? 'bg-destructive/10 text-destructive'
                          : notif.isRead
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary/10 text-primary',
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            'truncate text-xs text-foreground',
                            !notif.isRead ? 'font-semibold' : 'font-medium',
                          )}
                        >
                          {notif.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {notif.message}
                      </span>
                    </div>
                  </Button>
                  {!notif.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead.mutate(notif._id);
                      }}
                      title="Mark as read"
                      aria-label="Mark as read"
                      className="absolute right-2 top-2 z-10 size-8 min-h-8 min-w-8 bg-background/90 p-0 text-muted-foreground opacity-100 shadow-sm md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                    >
                      <Check className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/60 bg-muted/30 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="h-9 w-full justify-center gap-1.5 text-xs font-medium text-foreground hover:text-primary"
          >
            <span>View all notifications</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
