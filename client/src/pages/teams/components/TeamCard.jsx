import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Lock, Clock, ShieldCheck, UserCheck, Crown, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatCanonicalSectionName,
  extractSectionCode,
  resolveSectionCapstoneMeta,
} from '@/utils/sectionUtils';
import { formatName } from '../utils/teamFormatters';

export default function TeamCard({
  team,
  onSelect,
  onInspect,
  onAssign,
  canAssignCommittee,
  isSelected,
}) {
  const leaderName = team.leaderId ? formatName(team.leaderId) : 'Unknown';
  const isLocked = Boolean(team.isLocked);
  const assignment = team.assignment || {};
  const adviser = team.adviserId || assignment.adviser;
  const panelists = team.panelistIds || assignment.panelists || [];
  const hasCommittee = Boolean(adviser && panelists.length >= 3);
  const isAwaitingCommittee = isLocked && !hasCommittee;

  const sectionObj =
    (team.sectionId && typeof team.sectionId === 'object' && team.sectionId) ||
    (team.section && typeof team.section === 'object' && team.section) ||
    null;
  const courseCode = sectionObj?.courseId?.code || 'BSIT';
  const sectionName = sectionObj?.name || sectionObj?.code || team.sectionName || '';
  const canonicalSection = sectionName
    ? formatCanonicalSectionName({ ...sectionObj, name: sectionName }, courseCode)
    : '';
  const sectionTCode = (sectionObj && extractSectionCode(sectionObj)) || team.sectionCode || null;
  const capstoneMeta = resolveSectionCapstoneMeta(sectionObj, team.academicTerm);

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
              {canonicalSection && (
                <>
                  <span>&bull;</span>
                  <span className="font-medium text-foreground">{canonicalSection}</span>
                </>
              )}
              {sectionTCode && (
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] py-0 px-1 border-primary/40 bg-primary/10 text-primary"
                >
                  {sectionTCode}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {isLocked ? (
              <Badge variant="success" className="gap-1 text-[10px] py-0 px-1.5 font-medium">
                <Lock className="h-2.5 w-2.5" />
                Locked
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1 text-[10px] py-0 px-1.5 font-medium">
                <Clock className="h-2.5 w-2.5" />
                Forming
              </Badge>
            )}

            {capstoneMeta?.courseTitle && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                {capstoneMeta.courseTitle}
              </Badge>
            )}

            {hasCommittee ? (
              <Badge variant="info" className="gap-1 text-[10px] py-0 px-1.5 font-medium">
                <ShieldCheck className="h-2.5 w-2.5" />
                Committee Set
              </Badge>
            ) : isAwaitingCommittee ? (
              <Badge variant="warning" className="gap-1 text-[10px] py-0 px-1.5 font-medium">
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
            <Crown className="h-3.5 w-3.5 text-warning shrink-0" />
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

          {/* Multi-Semester Capstone Progression Glance */}
          {Array.isArray(team.capstoneEnrollments) && team.capstoneEnrollments.length > 0 && (
            <div className="rounded-md border border-border/60 bg-muted/20 p-2 text-xs space-y-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">
                Enrollment Track:
              </span>
              <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
                {team.capstoneEnrollments.map((enr, idx) => (
                  <span key={enr.capstoneCourse || idx} className="flex items-center gap-1">
                    <span className="font-semibold text-primary">
                      C{enr.capstoneCourse}: {enr.sectionCode || enr.sectionName}
                    </span>
                    {idx < team.capstoneEnrollments.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant={isSelected ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={Boolean(isSelected)}
            aria-label={`View details for ${team.name || 'team'}`}
            data-testid="view-team-btn"
            className="h-8 flex-1 gap-1.5 px-3 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(team);
            }}
          >
            View Team
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="inspect-roster-btn"
            className="h-8 flex-1 gap-1.5 px-3 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onInspect?.(team);
            }}
          >
            <UsersRound className="h-3.5 w-3.5" />
            Inspect Roster
          </Button>
          {canAssignCommittee && (
            <Button
              type="button"
              variant="default"
              size="sm"
              data-testid="assign-committee-btn"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onAssign?.(team);
              }}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Assign
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

TeamCard.propTypes = {
  team: PropTypes.object.isRequired,
  onSelect: PropTypes.func,
  onInspect: PropTypes.func,
  onAssign: PropTypes.func,
  canAssignCommittee: PropTypes.bool,
  isSelected: PropTypes.bool,
};
