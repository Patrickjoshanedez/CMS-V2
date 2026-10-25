import React from 'react';
import PropTypes from 'prop-types';
import {
  Crown,
  Presentation,
  Palette,
  Database,
  Layers,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { cn } from '@/lib/utils';

/* ────────── 5 Standard Capstone Roles ────────── */

export const STANDARD_CAPSTONE_ROLES = [
  {
    name: 'Project Lead & Systems Analyst',
    consolidates: 'Pitcher + Researcher',
    focus:
      'System requirements, defense presentations/pitching, sprint management, and panel coordination.',
    icon: Presentation,
    color: 'text-chart-1',
    bg: 'bg-chart-1/10 border-chart-1/20',
    badgeClass: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
  },
  {
    name: 'Frontend & UI/UX Developer',
    consolidates: 'Frontend Developer + UI/UX',
    focus:
      'User flow design, responsive layouts, accessibility, and client-side UI integration (shadcn/Tailwind).',
    icon: Palette,
    color: 'text-chart-4',
    bg: 'bg-chart-4/10 border-chart-4/20',
    badgeClass: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  },
  {
    name: 'Backend & Database Developer',
    consolidates: 'Backend Developer + Programmer',
    focus: 'Schema design, API routing, server-side business logic, and database migrations.',
    icon: Database,
    color: 'text-success',
    bg: 'bg-success/10 border-success/20',
    badgeClass: 'bg-success/10 text-success-foreground border-success/20',
  },
  {
    name: 'Full-Stack Developer',
    consolidates: 'All-Around + Programmer',
    focus:
      'End-to-end feature integration, Git workflow/PR reviews, deployment, and cross-layer support.',
    icon: Layers,
    color: 'text-warning',
    bg: 'bg-warning/10 border-warning/20',
    badgeClass: 'bg-warning/10 text-warning-foreground border-warning/20',
  },
  {
    name: 'QA & Technical Documentor',
    consolidates: 'QA/Tester + Documentor',
    focus:
      'Unit/integration testing, bug verification, and authoring Chapters 1–5 of the capstone manuscript.',
    icon: ShieldCheck,
    color: 'text-info',
    bg: 'bg-info/10 border-info/20',
    badgeClass: 'bg-info/10 text-foreground border-info/20',
  },
];

const NO_ROLE_SELECT_VALUE = '__no_role__';

export const STANDARD_CAPSTONE_ROLE_NAMES = STANDARD_CAPSTONE_ROLES.map((r) => r.name);

export function getRoleMetadata(roleName) {
  if (!roleName) return null;
  const match = STANDARD_CAPSTONE_ROLES.find((r) => r.name === roleName);
  if (match) return match;
  if (roleName === 'Pitcher' || roleName === 'Researcher') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Project Lead & Systems Analyst',
      icon: Presentation,
      color: 'text-chart-1',
      badgeClass: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
    };
  }
  if (roleName === 'Frontend Developer' || roleName === 'UI/UX') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Frontend & UI/UX Developer',
      icon: Palette,
      color: 'text-chart-4',
      badgeClass: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
    };
  }
  if (roleName === 'Backend Developer' || roleName === 'Programmer') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Backend & Database Developer',
      icon: Database,
      color: 'text-success',
      badgeClass: 'bg-success/10 text-success-foreground border-success/20',
    };
  }
  if (roleName === 'All-Around' || roleName === 'All-around') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Full-Stack Developer',
      icon: Layers,
      color: 'text-warning',
      badgeClass: 'bg-warning/10 text-warning-foreground border-warning/20',
    };
  }
  if (roleName === 'QA/Tester' || roleName === 'Documentor') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into QA & Technical Documentor',
      icon: ShieldCheck,
      color: 'text-info',
      badgeClass: 'bg-info/10 text-foreground border-info/20',
    };
  }
  return {
    name: roleName,
    consolidates: 'Custom',
    focus: 'Assigned capstone role',
    icon: ShieldAlert,
    color: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  };
}

function formatMemberName(userObj) {
  if (!userObj) return 'Unknown';
  if (typeof userObj === 'string') return userObj;
  const parts = [userObj.firstName, userObj.middleName, userObj.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : userObj.fullName || userObj.email || 'Unknown';
}

/**
 * TeamRosterCard
 *
 * Presentational component rendering an individual member card in the team roster
 * with role badge, avatar/initials, leader crown icon, and optional role management controls.
 */
export default function TeamRosterCard({
  member,
  isLeader = false,
  role = '',
  roleMeta = null,
  canAssignRole = false,
  roleOptions = STANDARD_CAPSTONE_ROLE_NAMES,
  onAssignRole,
  isAssignPending = false,
  className = '',
}) {
  const memberId = member?._id || member?.id || member;
  const fullName = formatMemberName(member);
  const initials =
    (member?.firstName?.[0] || '') + (member?.lastName?.[0] || '') ||
    member?.fullName?.[0] ||
    member?.email?.[0]?.toUpperCase() ||
    '?';

  const resolvedRoleMeta = roleMeta || getRoleMetadata(role);
  const IconComponent = resolvedRoleMeta?.icon;

  return (
    <div
      data-testid={`team-roster-card-${memberId}`}
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/50 p-3.5 transition-colors hover:bg-muted/40',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-primary/10 text-primary font-medium text-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium leading-none truncate text-foreground">{fullName}</p>
            {isLeader && (
              <Badge
                variant="warning"
                className="text-[11px] py-0 px-1.5 gap-1 font-medium shrink-0"
              >
                <Crown className="h-3 w-3" /> Leader
              </Badge>
            )}
          </div>
          {member?.email && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{member.email}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 self-start sm:self-center">
        {resolvedRoleMeta ? (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-2xs ${resolvedRoleMeta.badgeClass}`}
            title={`${resolvedRoleMeta.name}\nConsolidates: ${resolvedRoleMeta.consolidates || ''}\nFocus: ${resolvedRoleMeta.focus || ''}`}
          >
            {IconComponent && <IconComponent className="h-3.5 w-3.5 shrink-0" />}
            <span className="font-semibold">{resolvedRoleMeta.name}</span>
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground px-1">No role assigned</span>
        )}

        {canAssignRole && (
          <Select
            value={role || NO_ROLE_SELECT_VALUE}
            disabled={isAssignPending}
            onValueChange={(nextRole) => {
              onAssignRole?.(
                nextRole === NO_ROLE_SELECT_VALUE ? '' : nextRole,
                memberId,
              );
            }}
          >
            <SelectTrigger
              aria-label={`Assign role for ${fullName}`}
              className="h-9 min-h-11 min-w-0 text-xs font-medium shadow-xs sm:h-9 sm:min-h-9"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ROLE_SELECT_VALUE}>
                {role ? 'Change role...' : 'Assign role...'}
              </SelectItem>
            {roleOptions.map((roleOption) => (
              <SelectItem key={roleOption} value={roleOption}>
                {roleOption}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

TeamRosterCard.propTypes = {
  member: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
  isLeader: PropTypes.bool,
  role: PropTypes.string,
  roleMeta: PropTypes.object,
  canAssignRole: PropTypes.bool,
  roleOptions: PropTypes.arrayOf(PropTypes.string),
  onAssignRole: PropTypes.func,
  isAssignPending: PropTypes.bool,
  className: PropTypes.string,
};
