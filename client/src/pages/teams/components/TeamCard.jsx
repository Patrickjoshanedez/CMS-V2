import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Lock, Clock, ShieldCheck, UserCheck, Crown, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSectionWithCode } from '@/utils/sectionUtils';
import { formatName } from '../utils/teamFormatters';

export default function TeamCard({ team, onInspect, onAssign, canAssignCommittee, isSelected }) {
  const leaderName = team.leaderId ? formatName(team.leaderId) : 'Unknown';
  const isLocked = Boolean(team.isLocked);
  const assignment = team.assignment || {};
  const adviser = team.adviserId || assignment.adviser;
  const panelists = team.panelistIds || assignment.panelists || [];
  const hasCommittee = Boolean(adviser && panelists.length >= 3);
  const isAwaitingCommittee = isLocked && !hasCommittee;

  const sectionName =
    team.sectionId?.name ||
    team.section?.name ||
    (typeof team.sectionId === 'string' ? team.sectionId : null);
  const sectionCode = team.sectionId?.courseId?.code || team.sectionCode || null;

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md hover:border-primary/40 bg-card/80 flex flex-col justify-between h-full border-border/60 text-left',
        isSelected &&
          'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-md shadow-primary/10',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate text-foreground">
              {team.name || 'Untitled Team'}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>
                {team.members?.length || 0} member{team.members?.length !== 1 ? 's' : ''}
              </span>
              {team.academicYear && (
                <>
                  <span>&bull;</span>
                  <span>{team.academicYear}</span>
                </>
              )}
              {(sectionName || sectionCode || team.sectionId) && (
                <>
                  <span>&bull;</span>
                  <span className="truncate">
                    {formatSectionWithCode(
                      team.sectionId ||
                        team.section || {
                          name: sectionName,
                          courseId: { code: sectionCode },
                        },
                    )}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {isLocked ? (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1 text-[10px] py-0 px-1.5 font-medium"
              >
                <Lock className="h-2.5 w-2.5" />
                Locked
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1 text-[10px] py-0 px-1.5 font-medium"
              >
                <Clock className="h-2.5 w-2.5" />
                Forming
              </Badge>
            )}

            {hasCommittee ? (
              <Badge
                variant="outline"
                className="border-sky-500/40 bg-sky-500/10 text-sky-400 gap-1 text-[10px] py-0 px-1.5 font-medium"
              >
                <ShieldCheck className="h-2.5 w-2.5" />
                Committee Set
              </Badge>
            ) : isAwaitingCommittee ? (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1 text-[10px] py-0 px-1.5 font-medium animate-pulse"
              >
                <UserCheck className="h-2.5 w-2.5" />
                Needs Committee
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              Leader: <strong className="font-medium text-foreground">{leaderName}</strong>
            </span>
          </div>

          {/* Member avatars row */}
          {team.members?.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 shrink-0">
                {team.members.slice(0, 4).map((member) => {
                  const memberId = member._id || member;
                  return (
                    <div
                      key={memberId}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-[11px] font-semibold text-primary"
                      title={formatName(member)}
                    >
                      {member.firstName?.[0]?.toUpperCase() || '?'}
                    </div>
                  );
                })}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {team.members.length} / 4 registered
              </span>
            </div>
          )}

          {/* Committee Quick Glance */}
          <div className="rounded-md border border-border/60 bg-muted/20 p-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">Adviser:</span>
              <span className="font-medium text-foreground truncate max-w-[140px]">
                {adviser ? formatName(adviser) : 'Not appointed'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">Panelists:</span>
              <span className="font-medium text-foreground">
                {panelists.length ? `${panelists.length} of 3 appointed` : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Card action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <span
            role="button"
            tabIndex={0}
            data-testid="inspect-roster-btn"
            className="flex-1 inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs font-medium gap-1.5 transition-colors cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              onInspect?.(team);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                onInspect?.(team);
              }
            }}
          >
            <UsersRound className="h-3.5 w-3.5" />
            Inspect Roster
          </span>
          {canAssignCommittee && (
            <span
              role="button"
              tabIndex={0}
              data-testid="assign-committee-btn"
              className="inline-flex items-center justify-center rounded-md bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-xs font-medium gap-1.5 transition-colors cursor-pointer select-none"
              onClick={(e) => {
                e.stopPropagation();
                onAssign?.(team);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  e.preventDefault();
                  onAssign?.(team);
                }
              }}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Assign
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

TeamCard.propTypes = {
  team: PropTypes.object.isRequired,
  onInspect: PropTypes.func,
  onAssign: PropTypes.func,
  canAssignCommittee: PropTypes.bool,
  isSelected: PropTypes.bool,
};
