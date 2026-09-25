import { useState, useRef, useEffect } from 'react';
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
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifData, isLoading } = useNotifications({ page: 1, limit: 10 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = notifData?.notifications || [];
  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        data-testid="header-notification-bell"
        className={cn(
          'relative p-2 border rounded-lg transition-all inline-flex items-center justify-center h-9 w-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isOpen
            ? 'border-primary bg-primary/10 text-primary shadow-xs'
            : 'border-slate-700 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-[#0c1424]',
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Notifications Popover"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-border/70 bg-card/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.2 font-mono">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                  className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark read
                </button>
              )}
            </div>
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1 border-b border-border/50 px-3 py-1.5 bg-muted/20">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                activeTab === 'all'
                  ? 'bg-primary/10 text-primary shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                activeTab === 'unread'
                  ? 'bg-primary/10 text-primary shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40 scrollbar-thin">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                <div className="h-4 w-3/4 mx-auto bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/2 mx-auto bg-muted animate-pulse rounded" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 mb-2 stroke-1 opacity-50" />
                <p className="text-xs font-medium text-foreground">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  You are completely caught up!
                </p>
              </div>
            ) : (
              filteredNotifications.slice(0, 5).map((notif) => {
                const Icon = ICON_MAP[notif.type] || ICON_MAP.default;
                const isUrgent =
                  notif.type === 'deadline_due' || notif.type === 'submission_rejected';

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleOpenNotification(notif)}
                    className={cn(
                      'group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-muted/60 text-left',
                      !notif.isRead && 'bg-primary/5 dark:bg-primary/[0.03]',
                      isUrgent && !notif.isRead && 'border-l-2 border-rose-500 bg-rose-500/5',
                    )}
                  >
                    <div
                      className={cn(
                        'shrink-0 mt-0.5 rounded-lg p-2 flex items-center justify-center',
                        isUrgent
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : notif.isRead
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary/10 text-primary',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={cn(
                            'text-xs truncate text-foreground',
                            !notif.isRead ? 'font-semibold' : 'font-medium',
                          )}
                        >
                          {notif.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead.mutate(notif._id);
                        }}
                        title="Mark as read"
                        aria-label="Mark as read"
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground rounded transition-opacity"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 p-2 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              className="w-full justify-center text-xs font-medium text-foreground hover:text-primary gap-1.5 h-8"
            >
              <span>View all notifications</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
