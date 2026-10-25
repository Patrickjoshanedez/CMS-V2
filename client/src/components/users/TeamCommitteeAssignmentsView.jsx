import React, { useState, useMemo, useEffect } from 'react';
import { Users, UserCheck, Search, AlertCircle, CheckCircle2, X, ExternalLink } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useAcademicYears, useSections } from '@/hooks/useAcademics';
import { useTeams, useAssignCommittee, teamKeys } from '@/hooks/useTeams';
import { useUsers } from '@/hooks/useUsers';
import { useProject } from '@/hooks/useProjects';
import { useQueryClient } from '@tanstack/react-query';
import { ROLES } from '@cms/shared';
import { formatSectionWithCode } from '@/utils/sectionUtils';
import FacultySearchCombobox from '@/components/teams/FacultySearchCombobox';
import { toast } from 'sonner';

/**
 * Format populated user full name
 */
function formatFullName(userObj, fallback = 'Unassigned') {
  if (!userObj) return fallback;
  const parts = [userObj.firstName, userObj.middleName, userObj.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : userObj.name || fallback;
}

/**
 * Extract 2-letter initials for avatar badge
 */
function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function TeamCommitteeAssignmentsView() {
  const queryClient = useQueryClient();

  // Search & Filter toolbar state
  const [search, setSearch] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'needs-assignment' | 'assigned'
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Committee form draft state
  const [selectedAdviserId, setSelectedAdviserId] = useState('');
  const [selectedSecretaryId, setSelectedSecretaryId] = useState('');
  const [selectedPanelistIds, setSelectedPanelistIds] = useState([]);

  // Queries
  const { data: years = [] } = useAcademicYears();
  const { data: sections = [] } = useSections(
    { academicYear: academicYear || undefined },
    { enabled: Boolean(academicYear) },
  );

  const {
    data: teamData,
    isLoading: isTeamsLoading,
    isError: isTeamsError,
    error: teamsError,
    refetch: refetchTeams,
  } = useTeams({
    academicYear: academicYear || undefined,
    sectionId: sectionId || undefined,
    page: 1,
    limit: 100,
  });

  const { data: facultyData, isLoading: isFacultyLoading } = useUsers({
    role: ROLES.FACULTY,
    isActive: true,
    page: 1,
    limit: 200,
  });

  const allTeams = useMemo(() => teamData?.teams || [], [teamData?.teams]);

  // Filter faculty eligible for committee appointments (Instructors strictly excluded)
  const eligibleFaculty = useMemo(() => {
    const list = facultyData?.users || [];
    return list.filter(
      (u) =>
        u.role === ROLES.ADVISER ||
        u.role === ROLES.PANELIST ||
        u.role === ROLES.FACULTY ||
        u.role === 'faculty',
    );
  }, [facultyData]);

  // Compute faculty workload across all loaded teams
  const facultyWorkload = useMemo(() => {
    const counts = {};
    allTeams.forEach((team) => {
      const advId = team.adviserId?._id || team.adviserId;
      const secId = team.secretaryId?._id || team.secretaryId;
      const panIds = (team.panelistIds || []).map((p) => p?._id || p);

      if (advId) counts[advId] = (counts[advId] || 0) + 1;
      if (secId) counts[secId] = (counts[secId] || 0) + 1;
      panIds.forEach((pId) => {
        if (pId) counts[pId] = (counts[pId] || 0) + 1;
      });
    });
    return counts;
  }, [allTeams]);

  // Filtered teams based on search and status filter
  const filteredTeams = useMemo(() => {
    return allTeams.filter((team) => {
      const name = team.name || '';
      const leaderName = formatFullName(team.leaderId);
      const code = team.code || '';
      const q = search.toLowerCase().trim();

      const matchesSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        leaderName.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const hasAdviser = Boolean(team.adviserId);
      const hasSecretary = Boolean(team.secretaryId);
      const panelistCount = (team.panelistIds || []).length;
      const isComplete = hasAdviser && hasSecretary && panelistCount >= 3;

      if (statusFilter === 'needs-assignment') return !isComplete;
      if (statusFilter === 'assigned') return isComplete;

      return true;
    });
  }, [allTeams, search, statusFilter]);

  // Auto-select first team if current selection invalid
  useEffect(() => {
    if (!selectedTeamId && filteredTeams.length > 0) {
      setSelectedTeamId(filteredTeams[0]._id);
    } else if (selectedTeamId && !filteredTeams.some((t) => t._id === selectedTeamId)) {
      setSelectedTeamId(filteredTeams[0]?._id || '');
    }
  }, [filteredTeams, selectedTeamId]);

  // Selected Team Details
  const selectedTeam = useMemo(
    () => allTeams.find((t) => t._id === selectedTeamId) || null,
    [allTeams, selectedTeamId],
  );

  const selectedProjectId =
    selectedTeam?.projectId?._id ||
    selectedTeam?.projectId ||
    selectedTeam?.assignment?.projectId ||
    null;

  const { data: projectData } = useProject(selectedProjectId, {
    enabled: Boolean(selectedProjectId),
  });

  const selectedProject = projectData?.data?.project || projectData?.project || projectData;
  const hasApprovedProject = Boolean(
    selectedProjectId &&
    (selectedProject?.titleStatus === 'approved' ||
      selectedProject?.status === 'active' ||
      selectedProject?.title),
  );

  // Sync initial committee state when selectedTeam changes
  useEffect(() => {
    if (selectedTeam) {
      const advId = selectedTeam.adviserId?._id || selectedTeam.adviserId || '';
      const secId = selectedTeam.secretaryId?._id || selectedTeam.secretaryId || '';
      const pIds = (selectedTeam.panelistIds || []).map((p) => p?._id || p);

      setSelectedAdviserId(advId);
      setSelectedSecretaryId(secId);
      setSelectedPanelistIds(pIds);
    } else {
      setSelectedAdviserId('');
      setSelectedSecretaryId('');
      setSelectedPanelistIds([]);
    }
  }, [selectedTeam]);

  // Mutations
  const assignCommitteeMutation = useAssignCommittee({
    onSuccess: (data) => {
      toast.success(data?.message || 'Faculty committee assigned and team notified.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to assign committee.');
    },
  });

  // Panelist management
  const handleAddPanelist = (panelistId) => {
    if (!panelistId) return;
    if (selectedPanelistIds.length >= 3) {
      toast.error('Only a maximum of 3 panelists can be assigned per team.');
      return;
    }
    if (selectedPanelistIds.includes(panelistId)) {
      toast.error('This panelist is already selected.');
      return;
    }
    setSelectedPanelistIds([...selectedPanelistIds, panelistId]);
  };

  const handleRemovePanelist = (panelistId) => {
    setSelectedPanelistIds(selectedPanelistIds.filter((id) => id !== panelistId));
  };

  // Submit Bulk Assignments
  const handleSaveAssignments = () => {
    if (!selectedTeam) {
      toast.error('Please select a team first.');
      return;
    }

    assignCommitteeMutation.mutate({
      teamId: selectedTeam._id,
      adviserId: selectedAdviserId || null,
      secretaryId: selectedSecretaryId || null,
      panelistIds: selectedPanelistIds,
    });
  };

  // Faculty helper maps
  const facultyMap = useMemo(() => {
    const map = new Map();
    eligibleFaculty.forEach((f) => map.set(f._id, f));
    return map;
  }, [eligibleFaculty]);

  const assignedAdviser = facultyMap.get(selectedAdviserId);
  const assignedSecretary = facultyMap.get(selectedSecretaryId);

  // Available faculty for panelists (exclude adviser and secretary)
  const availablePanelistCandidates = useMemo(() => {
    return eligibleFaculty.filter(
      (f) =>
        f._id !== selectedAdviserId &&
        f._id !== selectedSecretaryId &&
        !selectedPanelistIds.includes(f._id),
    );
  }, [eligibleFaculty, selectedAdviserId, selectedSecretaryId, selectedPanelistIds]);

  // Conflict maps: prevent choosing the same faculty member for adviser and secretary or panelist
  const adviserConflictMap = useMemo(() => {
    const map = {};
    if (selectedSecretaryId) map[selectedSecretaryId] = 'Committee Secretary';
    selectedPanelistIds.forEach((pId, idx) => {
      map[pId] = idx === 0 ? 'Lead / Chair' : `Panel Member ${idx}`;
    });
    return map;
  }, [selectedSecretaryId, selectedPanelistIds]);

  const secretaryConflictMap = useMemo(() => {
    const map = {};
    if (selectedAdviserId) map[selectedAdviserId] = 'Capstone Adviser';
    selectedPanelistIds.forEach((pId, idx) => {
      map[pId] = idx === 0 ? 'Lead / Chair' : `Panel Member ${idx}`;
    });
    return map;
  }, [selectedAdviserId, selectedPanelistIds]);

  const totalAppointed =
    selectedPanelistIds.length + (selectedAdviserId ? 1 : 0) + (selectedSecretaryId ? 1 : 0);

  return (
    <div className="min-w-0 space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1 border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Committee Assignments
          </h1>
          <Badge variant="secondary" className="text-xs font-normal">
            Faculty Coordination
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Appoint Capstone Advisers, Secretaries, and Defense Panelists to verified student research
          teams.
        </p>
      </div>

      {/* ============================================================ */}
      {/* 1. CONSOLIDATED FILTER & SEARCH TOOLBAR */}
      {/* ============================================================ */}
      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-3 p-3 pt-3 xl:flex-row">
          {/* Left Side: Search + Academic Year + Section */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto flex-1">
            <div className="relative w-full min-w-0 xl:flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team name, leader, or code..."
                aria-label="Search team name, leader, or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 min-h-11 text-base sm:text-sm bg-background/50 border-border/60"
              />
            </div>

            <Select
              value={academicYear}
              onValueChange={(value) => {
                setAcademicYear(value);
                setSectionId('');
              }}
            >
              <SelectTrigger
                aria-label="Filter by academic year"
                className="min-h-11 w-full min-w-[120px] text-xs sm:w-auto"
              >
                <SelectValue placeholder="All Academic Years" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    AY {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sectionId} disabled={!academicYear} onValueChange={setSectionId}>
              <SelectTrigger
                aria-label="Filter by section"
                className="min-h-11 w-full min-w-[120px] text-xs sm:w-auto"
              >
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((sec) => (
                  <SelectItem key={sec._id} value={sec._id}>
                    {formatSectionWithCode(sec)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter by committee status"
                className="min-h-11 w-full min-w-[130px] text-xs sm:w-auto"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="needs-assignment">Needs Assignment</SelectItem>
                <SelectItem value="assigned">Complete Committee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right Side: Quick Team Select */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-2 lg:pt-0">
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
              Jump to:
            </span>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger
                aria-label="Jump to team"
                className="min-h-11 w-full min-w-0 max-w-xs text-xs font-medium sm:w-72"
              >
                <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
                  <SelectValue placeholder="No teams available" />
                </span>
              </SelectTrigger>
              <SelectContent>
                {filteredTeams.map((team) => {
                  const memberCount = (team.members || []).length;
                  return (
                    <SelectItem key={team._id} value={team._id}>
                      {team.name || 'Untitled Team'} ({memberCount}/4 Members)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading & Error States */}
      {isTeamsLoading && (
        <div
          role="status"
          aria-label="Loading committee assignments"
          className="grid grid-cols-1 gap-6 xl:grid-cols-3"
        >
          <span className="sr-only">Loading team roster and committee assignments.</span>
          <Card className="xl:col-span-1">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-6 pt-0 min-[1500px]:grid-cols-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full min-[1500px]:col-span-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {isTeamsError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load teams</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {teamsError?.response?.data?.error?.message || 'Failed to load teams.'}
            <Button type="button" variant="outline" size="sm" onClick={() => refetchTeams?.()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isTeamsLoading && !isTeamsError && filteredTeams.length === 0 && (
        <EmptyState
          icon={Users}
          title="No Teams Found"
          description="No student teams match your active search and filter options. Adjust the filters above."
          compact
        />
      )}

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE GRID (1 COL LEFT / 2 COLS RIGHT) */}
      {/* ============================================================ */}
      {selectedTeam && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ========================================================== */}
          {/* LEFT COLUMN: TEAM PROFILE & MEMBER ROSTER (1 COLUMN) */}
          {/* ========================================================== */}
          <div className="min-w-0 space-y-6 xl:col-span-1">
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="min-w-0 break-words text-base font-bold [overflow-wrap:anywhere]">
                      {selectedTeam.name || 'Untitled Team'}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      AY {selectedTeam.academicYear || '2025–2026'} ·{' '}
                      {selectedTeam.sectionId?.name || 'Section Unassigned'}
                    </CardDescription>
                  </div>
                  {hasApprovedProject ? (
                    <Badge variant="success" className="shrink-0 gap-1 text-[10px]">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Project Approved
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="shrink-0 gap-1 text-[10px]">
                      <AlertCircle className="h-2.5 w-2.5" /> No Approved Project
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-xs">
                {/* Proposed Title Snippet */}
                <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-1">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                    Proposed Title
                  </span>
                  <p className="text-xs font-medium text-foreground italic leading-snug">
                    {selectedProject?.title ||
                      selectedTeam?.assignment?.title ||
                      'No approved project manuscript on file.'}
                  </p>
                </div>

                {/* Enrolled Proponents List */}
                <div className="space-y-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                    Enrolled Proponents ({(selectedTeam.members || []).length} of 4)
                  </span>

                  <div className="space-y-2">
                    {/* Team Leader */}
                    {selectedTeam.leaderId && (
                      <div className="flex items-center justify-between p-2.5 rounded-md border border-border/50 bg-background/60">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            aria-label={`${formatFullName(selectedTeam.leaderId)} initials`}
                            className="size-8"
                          >
                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                              {getInitials(formatFullName(selectedTeam.leaderId))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-xs leading-tight truncate">
                              {formatFullName(selectedTeam.leaderId)}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {selectedTeam.leaderId.email || 'No email'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 shrink-0">
                          Leader
                        </Badge>
                      </div>
                    )}

                    {/* Regular Members */}
                    {(selectedTeam.members || [])
                      .filter((m) => {
                        const mId = m?._id || m;
                        const lId = selectedTeam.leaderId?._id || selectedTeam.leaderId;
                        return String(mId) !== String(lId);
                      })
                      .map((member) => (
                        <div
                          key={member._id || member}
                          className="flex items-center justify-between p-2.5 rounded-md border border-border/50 bg-background/60"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              aria-label={`${formatFullName(member)} initials`}
                              className="size-8"
                            >
                              <AvatarFallback className="text-xs font-bold">
                                {getInitials(formatFullName(member))}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-xs leading-tight truncate">
                                {formatFullName(member)}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {member.email || 'No email'}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1.5 text-muted-foreground shrink-0"
                          >
                            Member
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Quick Link to Project Details if Linked */}
                {selectedProjectId && (
                  <div className="pt-2">
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="h-auto gap-1.5 px-0 text-xs"
                    >
                      <a href={`/projects/${selectedProjectId}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3" aria-hidden="true" />
                        View Linked Project Workspace
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: FACULTY COMMITTEE ASSIGNMENT (2 COLUMNS) */}
          {/* ========================================================== */}
          <div className="min-w-0 space-y-6 xl:col-span-2">
            {/* Prerequisite Gate Alert */}
            {!hasApprovedProject && (
              <Alert variant="warning">
                <AlertTitle className="text-xs font-bold uppercase tracking-wider">
                  Assignment Locked
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs">
                  This team must submit an initial title proposal and receive course instructor
                  endorsement before official faculty committees can be assigned.
                </AlertDescription>
              </Alert>
            )}

            <Card
              className={`border-border/60 shadow-xs transition-opacity ${
                !hasApprovedProject ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Faculty Committee Board
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Appoint verified department personnel to guide and evaluate this capstone
                      project.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-normal text-xs">
                    {totalAppointed} / 5 Appointed
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* TOP TIER: Capstone Adviser & Committee Secretary (Grid of 2) */}
                <div className="grid grid-cols-1 min-[1500px]:grid-cols-2 gap-4">
                  {/* Capstone Adviser Card */}
                  <div className="space-y-2 rounded-lg border border-border/60 p-3.5 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-1.5">
                        Capstone Adviser <span className="text-destructive">*</span>
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        1 Required
                      </Badge>
                    </div>

                    <FacultySearchCombobox
                      id="adviser-assignment-combobox"
                      value={selectedAdviserId}
                      onChange={(val) => setSelectedAdviserId(val)}
                      facultyList={eligibleFaculty}
                      workloadMap={facultyWorkload}
                      conflictMap={adviserConflictMap}
                      placeholder="-- Search & assign adviser --"
                      isLoading={isFacultyLoading}
                      disabled={isFacultyLoading || !hasApprovedProject}
                    />

                    {/* Assigned Adviser Slot Preview */}
                    {assignedAdviser && (
                      <div className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-background mt-1 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            aria-label={`${formatFullName(assignedAdviser)} initials`}
                            className="size-7 border border-border/70"
                          >
                            <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                              {getInitials(formatFullName(assignedAdviser))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {formatFullName(assignedAdviser)}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                              <span className="truncate">{assignedAdviser.email}</span>
                              <span>·</span>
                              <span>{facultyWorkload[assignedAdviser._id] || 0} active teams</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedAdviserId('')}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                          aria-label="Clear assigned adviser"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      Directs technical development and approves manuscript drafts.
                    </p>
                  </div>

                  {/* Committee Secretary Card */}
                  <div className="space-y-2 rounded-lg border border-border/60 p-3.5 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-1.5">
                        Committee Secretary <span className="text-destructive">*</span>
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        1 Required
                      </Badge>
                    </div>

                    <FacultySearchCombobox
                      id="secretary-assignment-combobox"
                      value={selectedSecretaryId}
                      onChange={(val) => setSelectedSecretaryId(val)}
                      facultyList={eligibleFaculty}
                      workloadMap={facultyWorkload}
                      conflictMap={secretaryConflictMap}
                      placeholder="-- Search & assign secretary --"
                      isLoading={isFacultyLoading}
                      disabled={isFacultyLoading || !hasApprovedProject}
                    />

                    {/* Assigned Secretary Slot Preview */}
                    {assignedSecretary && (
                      <div className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-background mt-1 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            aria-label={`${formatFullName(assignedSecretary)} initials`}
                            className="size-7 border border-border/70"
                          >
                            <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                              {getInitials(formatFullName(assignedSecretary))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {formatFullName(assignedSecretary)}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                              <span className="truncate">{assignedSecretary.email}</span>
                              <span>·</span>
                              <span>
                                {facultyWorkload[assignedSecretary._id] || 0} active teams
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedSecretaryId('')}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                          aria-label="Clear assigned secretary"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      Maintains defense minutes, rubric collation, and compliance records.
                    </p>
                  </div>
                </div>

                {/* BOTTOM TIER: Defense Panelists (Up to 3) */}
                <div className="space-y-3 rounded-lg border border-border/60 p-4 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                        Defense Panelists
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Assign 3 faculty evaluators: one lead chair and two members.
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedPanelistIds.length} / 3 Selected
                    </Badge>
                  </div>

                  {/* Quick Add Dropdown */}
                  {selectedPanelistIds.length < 3 && (
                    <FacultySearchCombobox
                      id="panelist-add-combobox"
                      value=""
                      onChange={(val) => {
                        if (val) handleAddPanelist(val);
                      }}
                      facultyList={availablePanelistCandidates}
                      workloadMap={facultyWorkload}
                      placeholder="+ Add faculty member as panelist..."
                      emptyLabel={null}
                      isLoading={isFacultyLoading}
                      disabled={isFacultyLoading || !hasApprovedProject}
                    />
                  )}

                  {/* Selected Panelist Chips / Cards */}
                  <div className="grid grid-cols-1 min-[1500px]:grid-cols-3 gap-3 pt-1">
                    {selectedPanelistIds.map((panId, index) => {
                      const panObj = facultyMap.get(panId);
                      const panName = formatFullName(panObj);
                      const workload = facultyWorkload[panId] || 0;

                      return (
                        <Card
                          key={panId}
                          className="flex items-center justify-between p-2.5 text-xs shadow-none"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <Avatar aria-label={`${panName} initials`} className="size-7">
                              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                                {getInitials(panName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-0.5 min-w-0">
                              <p className="font-semibold text-foreground leading-none truncate">
                                {panName}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {index === 0 ? (
                                  <span className="text-primary font-medium">Lead / Chair</span>
                                ) : index === 1 ? (
                                  'Panel Member 1'
                                ) : (
                                  'Panel Member 2'
                                )}
                                {' · '}
                                <span className="text-muted-foreground">{workload} teams</span>
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePanelist(panId)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                            aria-label={`Remove panelist ${panName}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </Card>
                      );
                    })}

                    {selectedPanelistIds.length === 0 && (
                      <EmptyState
                        className="col-span-3"
                        icon={Users}
                        title="No panelists appointed yet"
                        description="Use the selector above to add faculty members."
                        compact
                      />
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 p-4">
                <span className="text-xs text-muted-foreground">
                  All assigned faculty will receive automated in-app notifications and email alerts.
                </span>
                <Button
                  size="sm"
                  onClick={handleSaveAssignments}
                  disabled={!hasApprovedProject || assignCommitteeMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  {assignCommitteeMutation.isPending ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  Save & Broadcast Assignments
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
