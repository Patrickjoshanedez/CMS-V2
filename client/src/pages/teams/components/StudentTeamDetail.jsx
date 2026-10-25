import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import {
  LogOut,
  Copy,
  Clock,
  Lock,
  Unlock,
  GitBranch,
  FileText,
  AlertCircle,
  ShieldAlert,
  Pencil,
  Plus,
  Info,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  UserPlus,
  Calendar,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CAPSTONE_CURRICULUM_MAP } from '@cms/shared';
import {
  formatCanonicalSectionName,
  extractSectionCode,
  resolveSectionCapstoneMeta,
} from '@/utils/sectionUtils';
import { useTeamManager } from '../hooks/useTeamManager';
import {
  useTeamManuscriptTemplate,
  useAssignMemberRole,
  useUpdateGoogleDocLink,
  useUpdateGithubLink,
  useLockTeam,
  useUnlockTeam,
  useLeaveTeam,
} from '@/hooks/useTeams';
import { useMyProject } from '@/hooks/useProjects';
import DefenseScheduleBadge from '@/components/defense/DefenseScheduleBadge';
import { ManuscriptTemplateWidget } from '@/components/teams/ManuscriptTemplateWidget';
import BulkInviteModal from '@/components/teams/BulkInviteModal';
import TeamRosterCard, {
  STANDARD_CAPSTONE_ROLES,
  STANDARD_CAPSTONE_ROLE_NAMES,
} from './TeamRosterCard';
import { formatName } from '../utils/teamFormatters';

export default function StudentTeamDetail({ team, userId }) {
  const teamManager = useTeamManager({ user: { _id: userId } });
  const [now] = useState(() => Date.now());
  const [showRolesGuide, setShowRolesGuide] = useState(false);
  const [pendingTeamAction, setPendingTeamAction] = useState(null);
  const showBulkInviteModal = teamManager.isBulkInviteOpen;
  const setShowBulkInviteModal = teamManager.setIsBulkInviteOpen;
  const isLeader = team.leaderId?._id === userId || team.leaderId === userId;
  const assignment = team.assignment || {};
  const panelists = assignment.panelists || [];
  const capstonePhase = Number(assignment.capstonePhase) || 1;
  const isTitleApproved = assignment.titleStatus === 'approved';
  const { data: project } = useMyProject({ enabled: Boolean(team?._id) });
  // Manuscript template gate (unlocks working manuscript document)
  const { data: serverGate } = useTeamManuscriptTemplate(team._id, {
    enabled: Boolean(team._id),
  });
  const isTemplateUnlocked = Boolean(serverGate?.isUnlocked) || isTitleApproved;

  // Source code is accessible only when reaching Development Stage (Capstone 2/3 or title approved, or if already linked)
  const isDevelopmentStage = Boolean(team.githubUrl) || capstonePhase >= 2 || isTitleApproved;

  const [googleDocUrlInput, setGoogleDocUrlInput] = useState(team.googleDocUrl || '');
  const [githubUrlInput, setGithubUrlInput] = useState(team.githubUrl || '');
  const [isEditingGoogleDoc, setIsEditingGoogleDoc] = useState(false);
  const [isEditingGithub, setIsEditingGithub] = useState(false);

  const memberRoleAssignments = team.memberRoles || [];
  const memberRoleMap = new Map(
    memberRoleAssignments.map((item) => [item?.userId?._id || item?.userId, item?.role || '']),
  );

  const TEAM_MEMBER_ROLE_OPTIONS = STANDARD_CAPSTONE_ROLE_NAMES;

  const assignMemberRole = useAssignMemberRole({
    onSuccess: () => toast.success('Team role updated.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to update team role.'),
  });

  const updateGoogleDocLink = useUpdateGoogleDocLink({
    onSuccess: () => {
      toast.success('Team Google Docs link updated.');
      setIsEditingGoogleDoc(false);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to update team Google Docs link.'),
  });

  const updateGithubLink = useUpdateGithubLink({
    onSuccess: () => {
      toast.success('Team GitHub link updated.');
      setIsEditingGithub(false);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to update team GitHub link.'),
  });

  const lockTeam = useLockTeam({
    onSuccess: () => toast.success('Team finalized successfully.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to finalize team.'),
  });

  const unlockTeam = useUnlockTeam({
    onSuccess: () => toast.success('Team roster unlocked. You can now modify members and roles.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to unlock team roster.'),
  });

  const leaveTeam = useLeaveTeam({
    onSuccess: () => toast.success('You left the team successfully.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to leave team.'),
  });

  const teamActionDialog = {
    leave: {
      title: 'Leave this team?',
      description: 'Are you sure you want to leave this team?',
      confirmLabel: 'Leave team',
      variant: 'destructive',
      isPending: leaveTeam.isPending,
      onConfirm: () => leaveTeam.mutate({ teamId: team._id }),
    },
    lock: {
      title: 'Finalize and lock the team roster?',
      description: 'This prepares your team for proposal submission.',
      confirmLabel: 'Finalize and lock',
      variant: 'default',
      isPending: lockTeam.isPending,
      onConfirm: () => lockTeam.mutate({ teamId: team._id }),
    },
    unlock: {
      title: 'Unlock team roster?',
      description:
        'This will allow you to modify members and project roles in case of misinput. You can finalize and lock the roster again once updated.',
      confirmLabel: 'Unlock roster',
      variant: 'default',
      isPending: unlockTeam.isPending,
      onConfirm: () => unlockTeam.mutate({ teamId: team._id }),
    },
  }[pendingTeamAction];

  const members = team.members || [];
  const memberCount = members.length;
  const isMinMembersMet = memberCount >= 1;
  const allRolesAssigned =
    memberCount > 0 &&
    members.every((m) => {
      const id = m._id || m;
      return Boolean(memberRoleMap.get(id));
    });
  const firstInviteCode = team.pendingInvites?.[0]?.inviteCode;
  const groupCode = firstInviteCode || (team._id ? team._id.slice(-6).toUpperCase() : '');

  const sectionObj = team.sectionId || team.section;
  const courseCode = sectionObj?.courseId?.code || 'BSIT';
  const canonicalSection = formatCanonicalSectionName(
    sectionObj || { name: team.sectionName },
    courseCode,
  );
  const sectionTCode = extractSectionCode(sectionObj) || team.sectionCode || null;
  const capstoneMeta = resolveSectionCapstoneMeta(sectionObj, team.academicTerm);
  const teamEnrollments = Array.isArray(team.capstoneEnrollments) ? team.capstoneEnrollments : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-all text-2xl font-bold tracking-tight text-foreground">
              {team.name || 'Team Workspace'}
            </h1>
            {team.isLocked ? (
              <Badge variant="secondary" className="gap-1.5">
                <Lock className="h-3 w-3 inline-block" />
                Team Finalized
              </Badge>
            ) : (
              <Badge variant="success" className="gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success inline-block" />
                Formation Open
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
            <span>Academic Year {team.academicYear || '2025–2026'}</span>
            <span>&bull;</span>
            <span>{team.academicTerm || sectionObj?.academicTerm || '1st Semester'}</span>
            {canonicalSection && (
              <>
                <span>&bull;</span>
                <span className="font-semibold text-foreground">{canonicalSection}</span>
              </>
            )}
            {sectionTCode && (
              <Badge
                variant="outline"
                className="font-mono text-xs border-primary/40 bg-primary/10 text-primary py-0 px-1.5"
              >
                Section Code: {sectionTCode}
              </Badge>
            )}
            {capstoneMeta?.courseTitle && (
              <Badge variant="secondary" className="text-xs py-0 px-2 font-medium">
                {capstoneMeta.courseTitle} ({capstoneMeta.curriculumLabel})
              </Badge>
            )}
            {groupCode && (
              <>
                <span>&bull;</span>
                <span>
                  Group code:{' '}
                  <span className="font-mono font-medium text-foreground">#{groupCode}</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!team.isLocked && (
            <>
              {isLeader && memberCount < 4 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 gap-1.5 text-xs sm:text-sm font-medium"
                  onClick={() => setShowBulkInviteModal(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite Teammates
                </Button>
              )}
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs sm:text-sm"
                onClick={() => setPendingTeamAction('leave')}
                disabled={leaveTeam.isPending || lockTeam.isPending}
                loading={leaveTeam.isPending}
                loadingText="Leaving team"
              >
                {!leaveTeam.isPending && <LogOut className="mr-1.5 h-3.5 w-3.5" />}
                Leave Team
              </Button>
              {isLeader && (
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5 text-xs sm:text-sm"
                  onClick={() => {
                    if (memberCount < 1) {
                      toast.error('Teams must have at least 1 member before finalization.');
                      return;
                    }
                    setPendingTeamAction('lock');
                  }}
                  disabled={
                    !isMinMembersMet ||
                    !allRolesAssigned ||
                    lockTeam.isPending ||
                    leaveTeam.isPending
                  }
                  loading={lockTeam.isPending}
                  loadingText="Finalizing team"
                >
                  {!lockTeam.isPending && <Lock className="mr-1.5 h-3.5 w-3.5" />}
                  Finalize & Lock Team
                </Button>
              )}
            </>
          )}

          {team.isLocked && isLeader && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm border-warning/40 text-warning-foreground hover:bg-warning/10 gap-1.5 shadow-xs"
              onClick={() => setPendingTeamAction('unlock')}
              disabled={unlockTeam.isPending}
              loading={unlockTeam.isPending}
              loadingText="Unlocking roster"
            >
              {!unlockTeam.isPending && <Unlock className="mr-1.5 h-3.5 w-3.5" />}
              Unlock Roster
            </Button>
          )}
          {project?.defenseSchedule?.status && project.defenseSchedule.status !== 'none' && (
            <DefenseScheduleBadge
              defenseSchedule={project.defenseSchedule}
              className="px-3 py-1.5 text-xs font-medium"
              showTime
            />
          )}
          {team.isLocked &&
            (!project?.defenseSchedule?.status || project.defenseSchedule.status === 'none') && (
              <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Ready for Proposal Submission
              </Badge>
            )}
        </div>
      </div>

      {/* Main Grid: 2 Cols Main, 1 Col Sidebar */}
      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
        {/* Left Column (Span 2): Members & Workspace Links */}
        <div className="min-w-0 space-y-6 xl:col-span-2">
          {/* Members Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="flex flex-col items-start justify-between gap-3 pb-4 sm:flex-row sm:items-center">
              <div>
                <CardTitle className="text-base font-semibold">Team Roster</CardTitle>
                <CardDescription>{memberCount} of 4 slots filled</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 px-2.5 font-medium border-border/80 hover:bg-muted/80"
                  onClick={() => setShowRolesGuide((prev) => !prev)}
                >
                  <Info className="h-3.5 w-3.5 text-primary" />
                  <span>{showRolesGuide ? 'Hide Guide' : 'Roles Guide'}</span>
                  <ChevronDown
                    className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
                      showRolesGuide ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
                <Badge variant="secondary" className="font-normal">
                  Min: 1 | Max: 4
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Expandable 5 Standard Roles Guide */}
              {showRolesGuide && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3.5 animate-in fade-in duration-200">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-warning" />
                      The 5 Standard Capstone Roles
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      BukSU standardized roles mapping student competencies to defense evaluation
                      criteria.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {STANDARD_CAPSTONE_ROLES.map((role) => {
                      const IconComponent = role.icon;
                      return (
                        <div
                          key={role.name}
                          className="flex flex-col justify-between rounded-lg border bg-background/90 p-3 shadow-2xs transition-colors hover:border-primary/40"
                        >
                          <div>
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${role.bg} ${role.color}`}
                              >
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-semibold text-foreground truncate">
                                  {role.name}
                                </h5>
                                <span className="inline-block text-[10px] font-medium text-muted-foreground">
                                  Consolidates:{' '}
                                  <span className="text-foreground/90 font-semibold">
                                    {role.consolidates}
                                  </span>
                                </span>
                              </div>
                            </div>
                            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                              <strong className="text-foreground/90">Focus:</strong> {role.focus}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Member Items */}
              {members.map((member) => {
                const memberId = member._id || member;
                const isThisLeader = (team.leaderId?._id || team.leaderId) === memberId;
                const selectedRole = memberRoleMap.get(memberId) || '';

                return (
                  <TeamRosterCard
                    key={memberId}
                    member={member}
                    isLeader={isThisLeader}
                    role={selectedRole}
                    canAssignRole={isLeader && !team.isLocked}
                    roleOptions={TEAM_MEMBER_ROLE_OPTIONS}
                    isAssignPending={assignMemberRole.isPending}
                    onAssignRole={(newRole) => {
                      assignMemberRole.mutate({
                        teamId: team._id,
                        memberId,
                        role: newRole,
                      });
                    }}
                  />
                );
              })}

              {/* Unified Invite Teammates Action Section */}
              {isLeader && !team.isLocked && memberCount < 4 && (
                <div className="pt-3 border-t border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-all hover:border-primary/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">Invite Teammates</h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/30 text-primary font-medium"
                        >
                          {4 - memberCount} slot{4 - memberCount === 1 ? '' : 's'} available
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Search and invite unassigned classmates from your section or find students
                        across sections with auto-generated 6-digit codes.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowBulkInviteModal(true)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0 text-xs font-medium h-8.5 px-3.5 shadow-xs"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Invite Teammates
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Resources / Deliverables */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Repository & Working Documents
              </CardTitle>
              <CardDescription>
                Collaborative links accessible by committee reviewers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* GitHub Card (Source Control — Gated to Development Stage) */}
                <div
                  className={`flex flex-col justify-between rounded-lg border p-4 transition-colors ${
                    isDevelopmentStage
                      ? 'border-border/60 hover:border-primary/40 bg-card/60'
                      : 'border-dashed border-border/70 bg-muted/20 opacity-90'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                          <GitBranch className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium leading-none">Source Control</h4>
                          <p className="text-xs text-muted-foreground mt-1">GitHub</p>
                        </div>
                      </div>
                      {team.githubUrl ? (
                        <Badge
                          variant="secondary"
                          className="border-success/30 bg-success/10 text-success-foreground text-[10px]"
                        >
                          Connected
                        </Badge>
                      ) : isDevelopmentStage ? (
                        <Badge variant="outline" className="text-[10px]">
                          Not Linked
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 text-muted-foreground border-border/80"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          Development Stage
                        </Badge>
                      )}
                    </div>

                    {team.githubUrl && !isEditingGithub && (
                      <p className="mt-3 truncate text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                        {team.githubUrl}
                      </p>
                    )}

                    {!isDevelopmentStage && !team.githubUrl && (
                      <div className="mt-3 rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground text-[11px] flex items-center gap-1.5">
                          <Lock className="h-3 w-3 text-warning shrink-0" />
                          Locked in Proposal Stage
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed">
                          Source code repository submission unlocks during the System Development
                          stage.
                        </p>
                      </div>
                    )}

                    {isEditingGithub && isLeader && !team.isLocked && isDevelopmentStage && (
                      <div className="mt-3 space-y-2">
                        <Input
                          type="url"
                          placeholder="https://github.com/org/repo"
                          value={githubUrlInput}
                          onChange={(e) => setGithubUrlInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                          disabled={updateGithubLink.isPending}
                        />
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              updateGithubLink.mutate({
                                teamId: team._id,
                                githubUrl: githubUrlInput.trim(),
                              });
                            }}
                            disabled={updateGithubLink.isPending}
                            loading={updateGithubLink.isPending}
                            loadingText="Saving"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => setIsEditingGithub(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditingGithub && (
                    <div className="mt-4 flex items-center gap-2">
                      {team.githubUrl ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="w-full text-xs gap-1.5"
                          >
                            <a href={team.githubUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Launch Repository
                            </a>
                          </Button>
                          {isLeader && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs shrink-0"
                              onClick={() => setIsEditingGithub(true)}
                              title="Edit repository link"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </>
                      ) : isDevelopmentStage && isLeader ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1.5"
                          onClick={() => setIsEditingGithub(true)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Connect Repository
                        </Button>
                      ) : !isDevelopmentStage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="w-full text-xs gap-1.5 cursor-not-allowed opacity-60"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Available in Development Stage
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No link attached</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Google Docs Card (Manuscript Document — Gated to Template Unlock) */}
                <div
                  className={`flex flex-col justify-between rounded-lg border p-4 transition-colors ${
                    isTemplateUnlocked || team.googleDocUrl
                      ? 'border-border/60 hover:border-primary/40 bg-card/60'
                      : 'border-dashed border-border/70 bg-muted/20 opacity-90'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium leading-none">Manuscript Document</h4>
                          <p className="text-xs text-muted-foreground mt-1">Google Docs</p>
                        </div>
                      </div>
                      <Badge
                        variant={team.googleDocUrl ? 'secondary' : 'outline'}
                        className={
                          team.googleDocUrl
                            ? 'border-success/30 bg-success/10 text-success-foreground text-[10px]'
                            : !isTemplateUnlocked
                              ? 'text-[10px] gap-1 text-muted-foreground border-border/80'
                              : 'text-[10px]'
                        }
                      >
                        {team.googleDocUrl ? (
                          'Connected'
                        ) : !isTemplateUnlocked ? (
                          <>
                            <Lock className="h-2.5 w-2.5 inline mr-1" />
                            Locked
                          </>
                        ) : (
                          'Not Linked'
                        )}
                      </Badge>
                    </div>

                    {team.googleDocUrl && !isEditingGoogleDoc && (
                      <p className="mt-3 truncate text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                        {team.googleDocUrl}
                      </p>
                    )}

                    {!isTemplateUnlocked && !team.googleDocUrl && (
                      <div className="mt-3 rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground text-[11px] flex items-center gap-1.5">
                          <Lock className="h-3 w-3 text-warning shrink-0" />
                          Locked in Proposal Stage
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed">
                          Working manuscript submission unlocks once your Capstone 1 title proposal
                          is approved and the official template is unlocked.
                        </p>
                      </div>
                    )}

                    {isEditingGoogleDoc && isLeader && isTemplateUnlocked && (
                      <div className="mt-3 space-y-2">
                        <Input
                          type="url"
                          placeholder="https://docs.google.com/document/d/..."
                          value={googleDocUrlInput}
                          onChange={(e) => setGoogleDocUrlInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                          disabled={updateGoogleDocLink.isPending}
                        />
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              updateGoogleDocLink.mutate({
                                teamId: team._id,
                                googleDocUrl: googleDocUrlInput.trim(),
                              });
                            }}
                            disabled={updateGoogleDocLink.isPending}
                            loading={updateGoogleDocLink.isPending}
                            loadingText="Saving"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => setIsEditingGoogleDoc(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditingGoogleDoc && (
                    <div className="mt-4 flex items-center gap-2">
                      {team.googleDocUrl ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="w-full text-xs gap-1.5"
                          >
                            <a href={team.googleDocUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open Document
                            </a>
                          </Button>
                          {isLeader && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs shrink-0"
                              onClick={() => setIsEditingGoogleDoc(true)}
                              title="Edit document link"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </>
                      ) : !isTemplateUnlocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="w-full text-xs gap-1.5 cursor-not-allowed opacity-60"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Available after Template Unlock
                        </Button>
                      ) : isLeader ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1.5"
                          onClick={() => setIsEditingGoogleDoc(true)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Attach Document
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No link attached</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Institutional Manuscript Template (Title Defense Gated) */}
              <ManuscriptTemplateWidget teamId={team._id} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Span 1): Committee & Verification Status */}
        <div className="space-y-6">
          {/* Academic Cohort & Multi-Semester Track Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                Academic Cohort &amp; Track
              </CardTitle>
              <CardDescription>Section enrollment and multi-semester progression</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Section Block
                  </span>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {canonicalSection || 'Unassigned'}
                  </p>
                </div>
                <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Section Code
                  </span>
                  <p className="mt-0.5 font-mono text-sm font-bold text-primary">
                    {sectionTCode || '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Academic Term
                </span>
                <p className="mt-0.5 font-medium text-foreground">
                  {team.academicYear || '2025–2026'} •{' '}
                  {team.academicTerm || sectionObj?.academicTerm || '1st Semester'}
                </p>
              </div>

              {/* Multi-Semester Capstone Progression Track */}
              <div className="pt-2 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Multi-Semester Track
                  </span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    Phase {capstonePhase}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  {[1, 2, 3].map((courseNum) => {
                    const trackMeta = CAPSTONE_CURRICULUM_MAP[courseNum];
                    const enrollment = teamEnrollments.find(
                      (enr) => Number(enr.capstoneCourse) === courseNum,
                    );
                    const isCurrentCourse =
                      Number(capstoneMeta?.capstoneCourse) === courseNum ||
                      capstonePhase === courseNum;

                    return (
                      <div
                        key={courseNum}
                        className={cn(
                          'flex items-center justify-between rounded-md border p-2 text-xs transition-colors',
                          isCurrentCourse
                            ? 'border-primary/50 bg-primary/5 shadow-2xs'
                            : 'border-border/60 bg-background/50',
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              {trackMeta?.courseTitle || `Capstone ${courseNum}`}
                            </span>
                            {isCurrentCourse && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1 border-primary/40 bg-primary/10 text-primary"
                              >
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {trackMeta?.curriculumLabel} ({trackMeta?.academicTerm})
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {enrollment?.sectionCode ||
                              (isCurrentCourse ? sectionTCode || '—' : '—')}
                          </span>
                          {enrollment?.sectionName && (
                            <p className="text-[10px] text-muted-foreground">
                              {enrollment.sectionName}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capstone Committee Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Capstone Committee</CardTitle>
              <CardDescription>Assigned evaluators for this team</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/50 text-xs">
              {/* Instructor */}
              <div className="py-3 first:pt-0">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Instructor
                </span>
                {assignment.instructor ? (
                  <div className="mt-1">
                    <p className="font-medium text-foreground text-sm">
                      {formatName(assignment.instructor)}
                    </p>
                    <p className="text-muted-foreground text-xs">{assignment.instructor.email}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground italic text-xs">
                    No instructor assigned yet
                  </p>
                )}
              </div>

              {/* Adviser */}
              <div className="py-3">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Adviser
                </span>
                {assignment.adviser ? (
                  <div className="mt-1">
                    <p className="font-medium text-foreground text-sm">
                      {formatName(assignment.adviser)}
                    </p>
                    <p className="text-muted-foreground text-xs">{assignment.adviser.email}</p>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-1.5 text-muted-foreground italic text-xs">
                    <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                    <span>Pending assignment</span>
                  </div>
                )}
              </div>

              {/* Committee Secretary */}
              <div className="py-3">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Committee Secretary
                </span>
                {assignment.secretary ? (
                  <div className="mt-1">
                    <p className="font-medium text-foreground text-sm">
                      {formatName(assignment.secretary)}
                    </p>
                    <p className="text-muted-foreground text-xs">{assignment.secretary.email}</p>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-1.5 text-muted-foreground italic text-xs">
                    <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                    <span>Pending assignment</span>
                  </div>
                )}
              </div>

              {/* Panelists */}
              <div className="py-3 last:pb-0">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Panelists
                </span>
                {panelists.length > 0 ? (
                  <div className="mt-1 space-y-1.5">
                    {panelists.map((panelist) => (
                      <div key={panelist._id} className="text-xs">
                        <p className="font-medium text-foreground text-sm">
                          {formatName(panelist)}
                        </p>
                        <p className="text-muted-foreground">{panelist.email}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-1.5 text-muted-foreground italic text-xs">
                    <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                    <span>No panelists assigned yet</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Invite Codes (if leader and pending invites exist) */}
          {isLeader && team.pendingInvites?.length > 0 && (
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Active Invite Codes</CardTitle>
                  <CardDescription>Share these 6-digit codes with invitees</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {team.pendingInvites.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={async () => {
                        const allCodes = team.pendingInvites
                          .map((inv) => `${inv.email}: ${inv.inviteCode}`)
                          .join('\n');
                        await navigator.clipboard.writeText(allCodes);
                        toast.success('All active invite codes copied to clipboard.');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      Copy All Codes
                    </Button>
                  )}
                  {memberCount < 4 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                      onClick={() => setShowBulkInviteModal(true)}
                    >
                      <UserPlus className="h-3 w-3" />
                      Invite More
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {team.pendingInvites.map((invite) => {
                  const expiresAt = new Date(invite.expiresAt);
                  const hoursLeft = Math.max(0, Math.round((expiresAt - now) / (1000 * 60 * 60)));

                  return (
                    <div
                      key={invite._id}
                      className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-sm bg-background px-2 py-1 rounded border border-border/80 text-foreground tracking-wider shrink-0">
                          {invite.inviteCode}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs text-foreground font-medium">
                            {invite.email}
                          </p>
                          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {hoursLeft > 0 ? `${hoursLeft}h left` : 'Expiring soon'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={async () => {
                          await navigator.clipboard.writeText(invite.inviteCode);
                          toast.success(`Copied invite code ${invite.inviteCode}`);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Quick Checklist / Policy Notice */}
          <Card className="bg-muted/40 border-dashed border-border shadow-none">
            <CardContent className="pt-5 space-y-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Team Lock Requirements
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  {isMinMembersMet ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-warning inline-block shrink-0 ml-1 mr-1" />
                  )}
                  <span className={isMinMembersMet ? 'text-foreground' : ''}>
                    1 to 4 active members ({memberCount}/4)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {allRolesAssigned ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-warning inline-block shrink-0 ml-1 mr-1" />
                  )}
                  <span className={allRolesAssigned ? 'text-foreground' : ''}>
                    All members select a project role
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bulk Invite Modal */}
      <BulkInviteModal
        open={showBulkInviteModal}
        onOpenChange={setShowBulkInviteModal}
        teamId={team._id}
        teamName={team.name}
        currentMembersCount={memberCount}
        pendingInvites={team.pendingInvites || []}
      />
      <AlertDialog
        open={Boolean(teamActionDialog)}
        onOpenChange={(open) => {
          if (!open) setPendingTeamAction(null);
        }}
      >
        <AlertDialogContent>
          {teamActionDialog && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{teamActionDialog.title}</AlertDialogTitle>
                <AlertDialogDescription>{teamActionDialog.description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={teamActionDialog.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant={teamActionDialog.variant}
                  disabled={teamActionDialog.isPending}
                  loading={teamActionDialog.isPending}
                  loadingText="Saving"
                  onClick={teamActionDialog.onConfirm}
                >
                  {teamActionDialog.confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

StudentTeamDetail.propTypes = {
  team: PropTypes.object.isRequired,
  userId: PropTypes.string,
};
