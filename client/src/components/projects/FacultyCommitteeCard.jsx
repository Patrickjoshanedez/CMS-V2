import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/authService';
import {
  useAssignAdviser,
  useAssignSecretary,
  useRemoveSecretary,
  useAssignPanelist,
  useRemovePanelist,
} from '@/hooks/useProjects';
import { getFullName, getProjectAuthors } from '@/pages/projects/projectDetailUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import FacultySearchCombobox from '@/components/teams/FacultySearchCombobox';
import {
  Users,
  Search,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  Mail,
  Copy,
  Trash2,
  Crown,
  FileCheck,
  CheckCircle2,
  Briefcase,
  UserCheck,
  FileSignature,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Standardized institutional role labels mapped to human-readable titles.
 */
const STANDARDIZED_ROLES = {
  leader: 'Project Lead & Systems Analyst',
  frontend: 'Frontend & UI/UX Developer',
  backend: 'Backend & Database Developer',
  fullstack: 'Full-Stack Developer',
  qa: 'QA & Technical Documentor',
};

/**
 * Computes workload status badge properties for faculty advisers.
 * Optimal: < 3 teams, Near Capacity: 3-5 teams, Overloaded: > 5 teams.
 */
export function getWorkloadStatus(advisedCount = 2) {
  if (advisedCount < 3) {
    return {
      label: 'Optimal Workload',
      variant: 'outline',
      className:
        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold',
    };
  }
  if (advisedCount <= 5) {
    return {
      label: 'Near Capacity',
      variant: 'outline',
      className:
        'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold',
    };
  }
  return {
    label: 'Overloaded',
    variant: 'outline',
    className: 'bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-semibold',
  };
}

/**
 * FacultyCommitteeCard — Institutional Capstone Committee & Proponent Roster Studio.
 *
 * Strictly adheres to BukSU institutional governance:
 * - Exactly 1 Faculty Adviser (excluding Course Instructors)
 * - Defense Committee consisting of 1 Panel Chair, 1 Secretary, and 2 Panel Members
 * - Completeness verification gate (full vs incomplete committee warning)
 * - Proponent Team Roster (FRAD2) with 5 standardized technical roles
 */
export default function FacultyCommitteeCard({ project = {}, canManage = false }) {
  // Query eligible faculty members for adviser, secretary, and committee appointments
  const { data: eligibleFaculty = [] } = useQuery({
    queryKey: ['users', 'faculty-committee-eligible'],
    queryFn: async () => {
      // Rule 1: 'role: faculty' expands to faculty/adviser/panelist umbrella while excluding instructors
      const { data } = await userService.listUsers({ role: 'faculty' });
      return data.data?.users || [];
    },
    enabled: canManage,
    staleTime: 5 * 60 * 1000,
  });

  const assignAdviser = useAssignAdviser({
    onSuccess: () => {
      toast.success('Faculty Adviser appointed successfully!');
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to appoint faculty adviser.'),
  });

  const assignSecretary = useAssignSecretary({
    onSuccess: () => {
      toast.success('Committee Secretary appointed successfully!');
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to appoint committee secretary.'),
  });

  const removeSecretary = useRemoveSecretary({
    onSuccess: () => toast.success('Committee secretary removed.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to remove committee secretary.'),
  });

  const assignPanelist = useAssignPanelist({
    onSuccess: () => {
      toast.success('Defense Panelist appointed successfully!');
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to appoint defense panelist.'),
  });

  const removePanelist = useRemovePanelist({
    onSuccess: () => toast.success('Defense panelist removed.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to remove defense panelist.'),
  });

  const authors = getProjectAuthors(project);
  const adviserObj = project.adviserId;
  const hasAdviser = Boolean(adviserObj);
  const adviserName = hasAdviser ? getFullName(adviserObj) : 'Unassigned';
  const adviserEmail = adviserObj?.email || '';

  const secretaryObj = project.secretaryId;
  const hasSecretary = Boolean(secretaryObj);
  const secretaryName = hasSecretary ? getFullName(secretaryObj) : 'Unassigned';
  const secretaryEmail = secretaryObj?.email || '';

  const currentPanelists = project.panelistIds || [];
  const panelistCount = currentPanelists.length;

  // Institutional Rule 3: Defense committee consists of 1 Adviser, 1 Secretary, and 3 Panelists
  const isCommitteeComplete = hasAdviser && hasSecretary && panelistCount >= 3;

  // Mutual exclusion conflict maps for each appointment slot
  const adviserConflictMap = useMemo(() => {
    const map = {};
    if (secretaryObj?._id) map[String(secretaryObj._id)] = 'Secretary';
    currentPanelists.forEach((p, idx) => {
      map[String(p._id || p)] = idx === 0 ? 'Panel Chair' : 'Panel Member';
    });
    return map;
  }, [secretaryObj, currentPanelists]);

  const secretaryConflictMap = useMemo(() => {
    const map = {};
    if (adviserObj?._id) map[String(adviserObj._id)] = 'Adviser';
    currentPanelists.forEach((p, idx) => {
      map[String(p._id || p)] = idx === 0 ? 'Panel Chair' : 'Panel Member';
    });
    return map;
  }, [adviserObj, currentPanelists]);

  const panelistConflictMap = useMemo(() => {
    const map = {};
    if (adviserObj?._id) map[String(adviserObj._id)] = 'Adviser';
    if (secretaryObj?._id) map[String(secretaryObj._id)] = 'Secretary';
    currentPanelists.forEach((p, idx) => {
      map[String(p._id || p)] = idx === 0 ? 'Panel Chair' : 'Panel Member';
    });
    return map;
  }, [adviserObj, secretaryObj, currentPanelists]);

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  const adviserWorkload = getWorkloadStatus(project?.adviserAdvisedCount || 2);
  const secretaryWorkload = getWorkloadStatus(project?.secretaryAdvisedCount || 2);

  return (
    <Card
      data-testid="faculty-committee-card"
      className="border border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden transition-all"
    >
      <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Faculty Committee</CardTitle>
            <p className="text-[11px] text-muted-foreground">BukSU Defense Appointments</p>
          </div>
        </div>

        {/* Committee Completeness Badge */}
        {isCommitteeComplete ? (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1 shrink-0"
          >
            <ShieldCheck className="h-3 w-3" />
            Complete
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold gap-1 shrink-0"
          >
            <AlertTriangle className="h-3 w-3" />
            Incomplete ({panelistCount}/3)
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-5 text-xs">
        {/* SECTION 1: FACULTY ADVISER */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              Faculty Adviser
            </span>
            {hasAdviser && (
              <Badge variant={adviserWorkload.variant} className={adviserWorkload.className}>
                {adviserWorkload.label}
              </Badge>
            )}
          </div>

          <div className="p-3 rounded-xl border border-border/70 bg-background shadow-2xs flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="font-bold text-foreground text-sm truncate">{adviserName}</p>
              {adviserEmail ? (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                  <span className="truncate">{adviserEmail}</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  Adviser appointment pending
                </p>
              )}
            </div>

            {adviserEmail && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                onClick={() => copyToClipboard(adviserEmail, 'Adviser email')}
                title="Copy Adviser Email"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Searchable Adviser Combobox for Course Instructors */}
          {canManage && (
            <div className="pt-1">
              <FacultySearchCombobox
                id="adviser-search-combobox"
                value={adviserObj?._id || ''}
                onChange={(facultyId) => {
                  if (facultyId) {
                    assignAdviser.mutate({ projectId: project._id, adviserId: facultyId });
                  }
                }}
                facultyList={eligibleFaculty}
                conflictMap={adviserConflictMap}
                placeholder={
                  hasAdviser ? 'Assign or change adviser...' : '-- Search & assign adviser --'
                }
                disabled={assignAdviser.isPending}
              />
            </div>
          )}
        </div>

        {/* SECTION 2: COMMITTEE SECRETARY */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileSignature className="h-3.5 w-3.5 text-primary" />
              Committee Secretary
            </span>
            {hasSecretary && (
              <Badge variant={secretaryWorkload.variant} className={secretaryWorkload.className}>
                {secretaryWorkload.label}
              </Badge>
            )}
          </div>

          <div className="p-3 rounded-xl border border-border/70 bg-background shadow-2xs flex items-start justify-between gap-2 group">
            <div className="space-y-1 min-w-0">
              <p className="font-bold text-foreground text-sm truncate">{secretaryName}</p>
              {secretaryEmail ? (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                  <span className="truncate">{secretaryEmail}</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  Secretary appointment pending
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {secretaryEmail && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  onClick={() => copyToClipboard(secretaryEmail, 'Secretary email')}
                  title="Copy Secretary Email"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}

              {hasSecretary && canManage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                  onClick={() => removeSecretary.mutate({ projectId: project._id })}
                  disabled={removeSecretary.isPending}
                  title="Unassign Secretary"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Searchable Secretary Combobox for Course Instructors */}
          {canManage && (
            <div className="pt-1">
              <FacultySearchCombobox
                id="secretary-search-combobox"
                value={secretaryObj?._id || ''}
                onChange={(facultyId) => {
                  if (facultyId) {
                    assignSecretary.mutate({ projectId: project._id, secretaryId: facultyId });
                  } else if (hasSecretary) {
                    removeSecretary.mutate({ projectId: project._id });
                  }
                }}
                facultyList={eligibleFaculty}
                conflictMap={secretaryConflictMap}
                placeholder={
                  hasSecretary ? 'Change committee secretary...' : '-- Search & assign secretary --'
                }
                disabled={assignSecretary.isPending || removeSecretary.isPending}
              />
            </div>
          )}
        </div>

        {/* SECTION 3: DEFENSE COMMITTEE PANEL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Defense Panel ({panelistCount}/3)
            </span>
            <span className="text-[10px] text-muted-foreground">Chair • Panelists</span>
          </div>

          <div className="space-y-1.5">
            {currentPanelists.length > 0 ? (
              currentPanelists.map((p, idx) => {
                const assignedRole =
                  p.role ||
                  project.panelists?.find(
                    (item) => item.userId === p._id || item.userId?._id === p._id,
                  )?.role ||
                  (idx === 0 ? 'chair' : 'member');

                const isChair = assignedRole === 'chair' || idx === 0;

                return (
                  <div
                    key={p._id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-background shadow-2xs group hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isChair ? (
                        <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground truncate block">
                          {getFullName(p)}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {p.email || 'Defense Panelist'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isChair ? (
                        <Badge
                          variant="outline"
                          className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 text-[9px] font-bold px-1.5 py-0 h-4"
                        >
                          Chair
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[9px] font-medium px-1.5 py-0 h-4"
                        >
                          Panel Member
                        </Badge>
                      )}

                      {canManage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() =>
                            removePanelist.mutate({
                              projectId: project._id,
                              panelistId: p._id || p,
                            })
                          }
                          disabled={removePanelist.isPending}
                          title="Unassign Panelist"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-border/80 bg-muted/10 text-center text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                <p className="font-semibold text-foreground">No panelists appointed</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Defense committee formation required prior to scheduling.
                </p>
              </div>
            )}
          </div>

          {/* Searchable Panelist Combobox for Instructors */}
          {canManage && panelistCount < 3 && (
            <div className="pt-1">
              <FacultySearchCombobox
                id="panelist-search-combobox"
                value=""
                onChange={(facultyId) => {
                  if (facultyId) {
                    assignPanelist.mutate({ projectId: project._id, panelistId: facultyId });
                  }
                }}
                facultyList={eligibleFaculty}
                conflictMap={panelistConflictMap}
                placeholder="Appoint defense panelist..."
                disabled={assignPanelist.isPending}
              />
            </div>
          )}
        </div>

        {/* SECTION 3: PROPONENT TEAM ROSTER (FRAD2) */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              Proponent Roster (FRAD2)
            </span>
            <span className="text-[10px] text-muted-foreground">
              {project.teamId?.name || 'Capstone Team'}
            </span>
          </div>

          <div className="space-y-1.5">
            {Array.isArray(project.teamId?.members) && project.teamId.members.length > 0 ? (
              project.teamId.members.map((member, idx) => {
                const memberUser = member.userId || member;
                const memberName = memberUser.firstName
                  ? `${memberUser.firstName} ${memberUser.lastName || ''}`.trim()
                  : memberUser.fullName || memberUser.email || `Member ${idx + 1}`;
                const memberEmail = memberUser.email || '';

                const rawRole =
                  member.role ||
                  (project.teamId?.leaderId === (memberUser._id || memberUser)
                    ? 'leader'
                    : 'member');

                const isLeader = rawRole === 'leader' || rawRole === 'lead';
                const roleLabel =
                  STANDARDIZED_ROLES[rawRole] || (isLeader ? 'Project Lead' : 'Team Member');

                return (
                  <div
                    key={member._id || idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-background border border-border/70 shadow-2xs text-xs group"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-foreground block truncate">
                        {memberName}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate font-medium">
                        {roleLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isLeader ? (
                        <Badge
                          variant="default"
                          className="h-4 px-1.5 text-[9px] font-bold bg-primary text-primary-foreground"
                        >
                          Lead
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[9px] text-muted-foreground"
                        >
                          Proponent
                        </Badge>
                      )}

                      {memberEmail && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(memberEmail, `${memberName}'s email`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Copy Email"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {authors.length > 0 ? (
                  authors.map((author, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {author}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground italic">No proponents listed</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

FacultyCommitteeCard.propTypes = {
  project: PropTypes.object.isRequired,
  canManage: PropTypes.bool,
};
