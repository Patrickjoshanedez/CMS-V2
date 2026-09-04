import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  Users,
  Crown,
  Lock,
  Clock,
  ShieldCheck,
  UserCheck,
  X,
  ExternalLink,
  Presentation,
  Palette,
  Database,
  Layers,
  GraduationCap,
  Mail,
  FileText,
  GitBranch,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export const STANDARD_CAPSTONE_ROLES = [
  {
    name: 'Project Lead & Systems Analyst',
    focus: 'Team orchestration, requirement elicitation, Gantt scheduling, and sprint tracking.',
    icon: Presentation,
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  {
    name: 'Frontend & UI/UX Developer',
    focus: 'UI/UX wireframing, client views, accessible forms, and component polish.',
    icon: Palette,
    badgeClass: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  },
  {
    name: 'Backend & Database Developer',
    focus: 'REST APIs, Mongoose schema modeling, Redis caching, and service-layer validation.',
    icon: Database,
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    name: 'Full-Stack Developer',
    focus: 'End-to-end feature integration, Git workflow/PR reviews, and cross-layer delivery.',
    icon: Layers,
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  {
    name: 'QA & Technical Documentor',
    focus:
      'Unit/integration testing, bug verification, and authoring Chapters 1–5 of the manuscript.',
    icon: ShieldCheck,
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
];

export function getRoleMeta(roleName) {
  if (!roleName) return null;
  const match = STANDARD_CAPSTONE_ROLES.find((r) => r.name === roleName);
  if (match) return match;
  return {
    name: roleName,
    focus: 'Assigned capstone proponent role',
    icon: Users,
    badgeClass: 'bg-muted text-muted-foreground border-border/70',
  };
}

function formatMemberName(userObj) {
  if (!userObj) return 'Unknown Member';
  const parts = [userObj.firstName, userObj.middleName, userObj.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : userObj.email || 'Unknown';
}

/**
 * InspectRosterDialog — Modal presenting the complete Phase 0 team roster,
 * standardized proponent roles, lock status, and assigned faculty committee.
 */
export function InspectRosterDialog({
  open,
  onOpenChange,
  team,
  canAssignCommittee = false,
  onAssignCommittee,
}) {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Handle ESC key press to close modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open || !team) return null;

  const leaderId = team.leaderId?._id || team.leaderId;
  const leaderObj = typeof team.leaderId === 'object' ? team.leaderId : null;
  const members = team.members || [];
  const memberRoles = team.memberRoles || [];
  const roleMap = new Map(
    memberRoles.map((item) => [item?.userId?._id || item?.userId, item?.role || '']),
  );

  const isLocked = Boolean(team.isLocked);
  const assignment = team.assignment || {};
  const adviser = team.adviserId || assignment.adviser;
  const secretary = team.secretaryId || assignment.secretary;
  const panelists = team.panelistIds || assignment.panelists || [];

  const rawCode = team.inviteCode || team.code;
  const displayCode = rawCode ? (rawCode.startsWith('#') ? rawCode : `#${rawCode}`) : null;

  const sectionName =
    team.sectionId?.name ||
    team.section?.name ||
    (typeof team.sectionId === 'string' ? team.sectionId : null);

  const sectionCode = team.sectionId?.courseId?.code || team.sectionCode || null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[90] flex min-h-full items-center justify-center overflow-y-auto bg-black/75 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspect-roster-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <Card
        className="w-full max-w-2xl border-border/80 bg-card shadow-2xl overflow-hidden my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between border-b border-border/60 p-5 pb-4 bg-card">
          <div className="space-y-1.5 min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                <Users className="h-4 w-4" />
              </div>
              <h3
                id="inspect-roster-dialog-title"
                className="text-lg font-bold text-foreground truncate"
              >
                {team.name || 'Untitled Team'}
              </h3>

              {isLocked ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1 text-xs py-0.5 px-2"
                >
                  <Lock className="h-3 w-3" />
                  Roster Finalized
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1 text-xs py-0.5 px-2"
                >
                  <Clock className="h-3 w-3" />
                  In Formation
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
              {team.academicYear && (
                <span className="font-medium text-foreground">{team.academicYear}</span>
              )}
              {(sectionName || sectionCode) && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3 text-primary" />
                    {sectionName || 'Section'} {sectionCode && `(${sectionCode})`}
                  </span>
                </>
              )}
              {displayCode && (
                <>
                  <span>•</span>
                  <span className="font-mono text-primary font-medium">Code: {displayCode}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Phase 0 Status Banner */}
          <div
            className={cn(
              'rounded-lg border p-3.5 text-xs leading-relaxed flex items-start gap-3',
              isLocked
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/5 text-amber-300',
            )}
          >
            {isLocked ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-foreground text-xs">
                {isLocked
                  ? 'Phase 0 Complete — Roster Locked & Ready for Committee'
                  : 'Phase 0 Active — Team Roster In Formation'}
              </p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                {isLocked
                  ? 'Team members have finalized their roster and standardized role designations. Instructor may now assign the defense committee.'
                  : 'The team leader is currently inviting members and assigning the 5 standardized capstone roles.'}
              </p>
            </div>
          </div>

          {/* Members Roster Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Team Roster ({members.length} of 4 Members)
              </h4>
              <span className="text-[11px] text-muted-foreground">
                Standardized 5-Role Alignment
              </span>
            </div>

            <div className="space-y-2">
              {members.map((member, index) => {
                const memberId = member?._id || member;
                const isLeader =
                  (leaderId?.toString?.() || leaderId) === (memberId?.toString?.() || memberId);
                const assignedRole =
                  roleMap.get(memberId) || (isLeader ? 'Project Lead & Systems Analyst' : 'Member');
                const roleMeta = getRoleMeta(assignedRole);
                const RoleIcon = roleMeta?.icon || Users;

                return (
                  <div
                    key={memberId || index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0 border border-primary/20">
                        {member?.firstName?.[0]?.toUpperCase() ||
                          member?.email?.[0]?.toUpperCase() ||
                          '?'}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {formatMemberName(member)}
                          </span>
                          {isLeader && (
                            <Badge
                              variant="outline"
                              className="border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1 text-[10px] py-0 px-1.5 font-medium"
                            >
                              <Crown className="h-2.5 w-2.5" />
                              Leader
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{member?.email || 'No email provided'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'gap-1.5 text-xs py-1 px-2.5 font-medium',
                          roleMeta?.badgeClass || 'border-border/70 bg-muted/40 text-foreground',
                        )}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {assignedRole}
                      </Badge>
                      {roleMeta?.focus && (
                        <p className="text-[10px] text-muted-foreground mt-1 max-w-xs sm:ml-auto hidden sm:block truncate">
                          {roleMeta.focus}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {members.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                  No members currently registered in this team.
                </div>
              )}
            </div>
          </div>

          {/* Committee Appointments Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Defense Committee Appointments
              </h4>

              {canAssignCommittee && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onAssignCommittee?.(team);
                  }}
                  className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <UserCheck className="h-3 w-3" />
                  Assign / Update Committee
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Adviser */}
              <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Capstone Adviser
                  </span>
                  {adviser ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1 border-emerald-500/30 text-emerald-400"
                    >
                      Assigned
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1 border-amber-500/30 text-amber-400"
                    >
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground truncate">
                  {adviser ? formatMemberName(adviser) : 'Not appointed yet'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {adviser?.email || 'Awaiting instructor assignment'}
                </p>
              </div>

              {/* Secretary */}
              <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Committee Secretary
                  </span>
                  {secretary ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1 border-emerald-500/30 text-emerald-400"
                    >
                      Assigned
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1 border-amber-500/30 text-amber-400"
                    >
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground truncate">
                  {secretary ? formatMemberName(secretary) : 'Not appointed yet'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {secretary?.email || 'Awaiting instructor assignment'}
                </p>
              </div>

              {/* Defense Panelists (3 Panelists) */}
              <div className="sm:col-span-2 rounded-lg border border-border/70 bg-card p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Defense Panelists ({panelists.length} of 3 Appointed)
                  </span>
                  {panelists.length >= 3 ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1 border-emerald-500/30 text-emerald-400"
                    >
                      Complete Committee
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1 border-amber-500/30 text-amber-400"
                    >
                      Needs Panelists
                    </Badge>
                  )}
                </div>

                {panelists.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {panelists.map((panelist, idx) => {
                      const panelRoleName =
                        idx === 0
                          ? 'Panelist 1 (Chair)'
                          : idx === 1
                            ? 'Panelist 2 (Member)'
                            : 'Panel Member 3';

                      return (
                        <div
                          key={panelist?._id || idx}
                          className="rounded-md border border-border/60 bg-muted/30 p-2 text-xs"
                        >
                          <span className="text-[10px] text-muted-foreground font-mono block">
                            {panelRoleName}
                          </span>
                          <p className="font-semibold text-foreground truncate mt-0.5">
                            {formatMemberName(panelist)}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {panelist?.email || 'No email'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No defense panelists appointed yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Academic Artifacts & Repositories */}
          {(team.googleDocUrl || team.githubUrl) && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Working Manuscript & Repository Links
              </h4>
              <div className="flex flex-wrap gap-2">
                {team.googleDocUrl && (
                  <a
                    href={team.googleDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Working Manuscript (Google Docs)
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                )}
                {team.githubUrl && (
                  <a
                    href={team.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <GitBranch className="h-3.5 w-3.5 text-primary" />
                    GitHub Source Repository
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-border/60 p-4 bg-muted/10">
          <div className="text-xs text-muted-foreground">
            {isLocked
              ? 'Roster verified for BukSU Capstone progression'
              : 'Roster pending leader lock'}
          </div>

          <div className="flex items-center gap-2">
            {canAssignCommittee && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onAssignCommittee?.(team);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1.5"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Assign Committee
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

InspectRosterDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  team: PropTypes.object,
  canAssignCommittee: PropTypes.bool,
  onAssignCommittee: PropTypes.func,
};

export default InspectRosterDialog;
