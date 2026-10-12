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
import { cn } from '@/lib/utils';

/* ────────── 5 Standard Capstone Roles ────────── */

export const STANDARD_CAPSTONE_ROLES = [
  {
    name: 'Project Lead & Systems Analyst',
    consolidates: 'Pitcher + Researcher',
    focus:
      'System requirements, defense presentations/pitching, sprint management, and panel coordination.',
    icon: Presentation,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
  },
  {
    name: 'Frontend & UI/UX Developer',
    consolidates: 'Frontend Developer + UI/UX',
    focus:
      'User flow design, responsive layouts, accessibility, and client-side UI integration (shadcn/Tailwind).',
    icon: Palette,
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
    badgeClass:
      'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60',
  },
  {
    name: 'Backend & Database Developer',
    consolidates: 'Backend Developer + Programmer',
    focus: 'Schema design, API routing, server-side business logic, and database migrations.',
    icon: Database,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  {
    name: 'Full-Stack Developer',
    consolidates: 'All-Around + Programmer',
    focus:
      'End-to-end feature integration, Git workflow/PR reviews, deployment, and cross-layer support.',
    icon: Layers,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  },
  {
    name: 'QA & Technical Documentor',
    consolidates: 'QA/Tester + Documentor',
    focus:
      'Unit/integration testing, bug verification, and authoring Chapters 1–5 of the capstone manuscript.',
    icon: ShieldCheck,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
  },
];

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
      color: 'text-indigo-600 dark:text-indigo-400',
      badgeClass:
        'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300',
    };
  }
  if (roleName === 'Frontend Developer' || roleName === 'UI/UX') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Frontend & UI/UX Developer',
      icon: Palette,
      color: 'text-pink-600 dark:text-pink-400',
      badgeClass: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300',
    };
  }
  if (roleName === 'Backend Developer' || roleName === 'Programmer') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Backend & Database Developer',
      icon: Database,
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeClass:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    };
  }
  if (roleName === 'All-Around' || roleName === 'All-around') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Full-Stack Developer',
      icon: Layers,
      color: 'text-amber-600 dark:text-amber-400',
      badgeClass:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    };
  }
  if (roleName === 'QA/Tester' || roleName === 'Documentor') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into QA & Technical Documentor',
      icon: ShieldCheck,
      color: 'text-sky-600 dark:text-sky-400',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300',
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
                variant="secondary"
                className="text-[11px] py-0 px-1.5 gap-1 font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0"
              >
                <Crown className="h-3 w-3 text-amber-500" /> Leader
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
          <select
            aria-label={`Assign role for ${fullName}`}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
            value={role}
            disabled={isAssignPending}
            onChange={(event) => {
              onAssignRole?.(event.target.value, memberId);
            }}
          >
            <option value="">{role ? 'Change role...' : 'Assign role...'}</option>
            {roleOptions.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {roleOption}
              </option>
            ))}
          </select>
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
