import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Users, UserCheck, Check, Trash2, GraduationCap, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTeamById } from '@/hooks/useTeams';
import { AssignCommitteeDialog } from './AssignCommitteeDialog';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function TeamFormationNotificationItem({
  teamId = '',
  teamName = 'Team Patrick',
  groupCode = '#10A80B',
  section = 'BSIT 3C',
  sectionCode = 'T87',
  leaderName = 'Patrick Josh S. Añedez',
  memberCount = 1,
  maxMembers = 4,
  timeAgo = 'Just now',
  isRead = false,
  isDeletePending = false,
  onInspectRoster,
  onAssignCommittee,
  onMarkRead,
  onDelete,
  notification = null,
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Extract from notification object if provided, falling back to explicit props
  const meta = notification?.metadata || {};
  const effectiveTeamId = teamId || meta.teamId || '';
  const effectiveTeamName = notification ? meta.teamName || teamName : teamName;

  const { data: liveTeam } = useTeamById(effectiveTeamId, {
    enabled: Boolean(effectiveTeamId),
  });

  const hasLiveAdviser = Boolean(liveTeam?.adviserId || liveTeam?.assignment?.adviser);
  const hasLiveSecretary = Boolean(liveTeam?.secretaryId || liveTeam?.assignment?.secretary);
  const livePanelistCount = (
    liveTeam?.panelistIds?.length ? liveTeam.panelistIds : liveTeam?.assignment?.panelists || []
  ).length;

  const isFullyAssigned =
    (hasLiveAdviser && hasLiveSecretary && livePanelistCount >= 3) ||
    meta.status === 'completed' ||
    Boolean(meta.isFullyAssigned);

  const rawCode = meta.groupCode || meta.rosterCode || groupCode;
  const effectiveGroupCode = rawCode
    ? rawCode.startsWith('#')
      ? rawCode
      : `#${rawCode}`
    : '#CODE';

  const effectiveSection = notification ? (meta.section ?? section) : section;
  const effectiveSectionCode = notification ? (meta.sectionCode ?? sectionCode) : sectionCode;
  const effectiveLeaderName = notification ? (meta.leaderName ?? leaderName) : leaderName;
  const effectiveMemberCount = notification ? (meta.memberCount ?? memberCount) : memberCount;
  const effectiveMaxMembers = notification ? (meta.maxMembers ?? maxMembers) : maxMembers;
  const effectiveTimeAgo = notification?.createdAt
    ? formatRelativeTime(notification.createdAt)
    : timeAgo;
  const isNotificationRead = notification ? Boolean(notification.isRead) : isRead;
  const title = notification?.title || 'Team Formation Completed';

  const handleInspect = (event) => {
    event?.stopPropagation?.();
    onInspectRoster?.(effectiveTeamId);
  };

  const handleAssign = (event) => {
    event?.stopPropagation?.();
    if (onAssignCommittee) {
      onAssignCommittee({
        teamId: effectiveTeamId,
        teamName: effectiveTeamName,
      });
    } else {
      setDialogOpen(true);
    }
  };

  const handleMarkAsRead = (event) => {
    event?.stopPropagation?.();
    onMarkRead?.(notification?._id || effectiveTeamId);
  };

  const handleDelete = (event) => {
    event?.stopPropagation?.();
    onDelete?.(notification?._id || effectiveTeamId);
  };

  return (
    <>
      <Card
        className={
          isFullyAssigned
            ? 'border-border/60 bg-card/50 transition-all hover:border-emerald-500/40 hover:bg-card'
            : 'border-border/60 bg-card/70 transition-all hover:border-primary/40 hover:bg-card'
        }
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Column: Icon + Core Content */}
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className={
                  isFullyAssigned
                    ? 'mt-0.5 rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20'
                    : 'mt-0.5 rounded-lg bg-primary/10 p-2.5 text-primary shrink-0 border border-primary/20'
                }
              >
                {isFullyAssigned ? (
                  <UserCheck className="h-5 w-5" />
                ) : (
                  <Users className="h-5 w-5" />
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                {/* Title + Action Pill + Timestamp */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground tracking-tight">
                    {title}
                  </span>
                  {isFullyAssigned ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium py-0 px-1.5 flex items-center gap-1"
                    >
                      <Check className="h-3 w-3 text-emerald-500" />
                      Committee Assigned
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-medium py-0 px-1.5"
                    >
                      Action Required
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">· {effectiveTimeAgo}</span>
                </div>

                {/* Notification Copy */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Team{' '}
                  <span className="font-semibold text-foreground">
                    &quot;{effectiveTeamName}&quot;
                  </span>{' '}
                  {isFullyAssigned
                    ? 'roster is locked and faculty committee appointments are complete.'
                    : `has locked their roster (${effectiveMemberCount} ${
                        effectiveMemberCount === 1 ? 'member' : 'members'
                      }) and is awaiting faculty committee appointments.`}
                </p>

                {/* Enriched Academic & Roster Metadata Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                  {/* Academic Section & Section Code Pill */}
                  {(effectiveSection || effectiveSectionCode) && (
                    <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-foreground">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      {effectiveSection && <span className="font-medium">{effectiveSection}</span>}
                      {effectiveSectionCode && (
                        <span className="text-muted-foreground/60 font-mono">
                          ({effectiveSectionCode})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Team Invite / Roster Code */}
                  {effectiveGroupCode && (
                    <div className="flex items-center gap-1 rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 font-mono text-foreground">
                      <span className="text-muted-foreground">Code:</span>
                      <span className="font-semibold text-primary">{effectiveGroupCode}</span>
                    </div>
                  )}

                  {/* Leader Info */}
                  {effectiveLeaderName && (
                    <div className="flex items-center gap-1.5 px-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>
                        Leader:{' '}
                        <span className="text-foreground font-medium">{effectiveLeaderName}</span>
                      </span>
                    </div>
                  )}

                  <span>·</span>

                  {/* Member Count */}
                  <span>
                    {effectiveMemberCount} of {effectiveMaxMembers} members
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Interaction Controls */}
            <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
              {isFullyAssigned ? (
                <>
                  <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Check className="h-3.5 w-3.5" />
                    <span>Assigned</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-border/70 hover:bg-muted/40 gap-1.5"
                    onClick={handleAssign}
                  >
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    Edit Committee
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-border/70 hover:bg-muted/40"
                    onClick={handleInspect}
                  >
                    Inspect Roster
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-border/70 hover:bg-muted/40"
                    onClick={handleInspect}
                  >
                    Inspect Roster
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                    onClick={handleAssign}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Assign Committee
                  </Button>
                </>
              )}
              {!isNotificationRead && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Mark as read"
                  aria-label="Mark as read"
                  onClick={handleMarkAsRead}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Delete notification"
                aria-label="Delete notification"
                onClick={handleDelete}
                disabled={isDeletePending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!onAssignCommittee && (
        <AssignCommitteeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          teamName={effectiveTeamName}
          teamId={effectiveTeamId}
        />
      )}
    </>
  );
}

TeamFormationNotificationItem.propTypes = {
  teamId: PropTypes.string,
  teamName: PropTypes.string,
  groupCode: PropTypes.string,
  section: PropTypes.string,
  sectionCode: PropTypes.string,
  leaderName: PropTypes.string,
  memberCount: PropTypes.number,
  maxMembers: PropTypes.number,
  timeAgo: PropTypes.string,
  isRead: PropTypes.bool,
  isDeletePending: PropTypes.bool,
  onInspectRoster: PropTypes.func,
  onAssignCommittee: PropTypes.func,
  onMarkRead: PropTypes.func,
  onDelete: PropTypes.func,
  notification: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    message: PropTypes.string,
    isRead: PropTypes.bool,
    createdAt: PropTypes.string,
    metadata: PropTypes.object,
  }),
};

export default TeamFormationNotificationItem;
