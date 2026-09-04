import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Calendar,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { useAcademicYears, useSections } from '@/hooks/useAcademics';
import { useTeams, useAssignCommittee, teamKeys } from '@/hooks/useTeams';
import { useUsers } from '@/hooks/useUsers';
import { useProject, useSetDeadlines } from '@/hooks/useProjects';
import { useQueryClient } from '@tanstack/react-query';
import { ROLES } from '@cms/shared';
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

  // Deadline collapsable state
  const [isDeadlinesOpen, setIsDeadlinesOpen] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState({
    proposal: '',
    chapter1: '',
    chapter2: '',
    chapter3: '',
    chapter4: '',
    chapter5: '',
  });

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
  } = useTeams({
    academicYear: academicYear || undefined,
    sectionId: sectionId || undefined,
    page: 1,
    limit: 100,
  });

  const { data: facultyData, isLoading: isFacultyLoading } = useUsers({
    role: [ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST, ROLES.FACULTY]
      .filter(Boolean)
      .join(','),
    isActive: true,
    page: 1,
    limit: 200,
  });

  const allTeams = useMemo(() => teamData?.teams || [], [teamData?.teams]);

  // Filter faculty eligible for committee appointments
  const eligibleFaculty = useMemo(() => {
    const list = facultyData?.users || [];
    return list.filter(
      (u) =>
        u.role === ROLES.INSTRUCTOR ||
        u.role === ROLES.ADVISER ||
        u.role === ROLES.PANELIST ||
        u.role === 'faculty' ||
        u.role === ROLES.ADMIN,
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

  // Sync deadlines
  useEffect(() => {
    if (selectedProject?.deadlines) {
      setDeadlineDraft({
        proposal: selectedProject.deadlines.proposal?.split('T')[0] || '',
        chapter1: selectedProject.deadlines.chapter1?.split('T')[0] || '',
        chapter2: selectedProject.deadlines.chapter2?.split('T')[0] || '',
        chapter3: selectedProject.deadlines.chapter3?.split('T')[0] || '',
        chapter4: selectedProject.deadlines.chapter4?.split('T')[0] || '',
        chapter5: selectedProject.deadlines.chapter5?.split('T')[0] || '',
      });
    } else {
      setDeadlineDraft({
        proposal: '',
        chapter1: '',
        chapter2: '',
        chapter3: '',
        chapter4: '',
        chapter5: '',
      });
    }
  }, [selectedProject]);

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

  const setDeadlines = useSetDeadlines({
    onSuccess: () => {
      toast.success('Project deadlines updated.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update project deadlines.');
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

  // Save Deadlines
  const handleSaveDeadlines = () => {
    if (!selectedProjectId) {
      toast.error('Select a team with a linked project first.');
      return;
    }
    const payload = { projectId: selectedProjectId };
    Object.entries(deadlineDraft).forEach(([key, val]) => {
      if (val) payload[key] = val;
    });
    setDeadlines.mutate(payload);
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

  const totalAppointed =
    selectedPanelistIds.length + (selectedAdviserId ? 1 : 0) + (selectedSecretaryId ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 border-b pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Committee Assignments
          </h2>
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
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3 shadow-xs">
        {/* Left Side: Search + Academic Year + Section */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team name, leader, or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs bg-background/50 border-border/60"
            />
          </div>

          <select
            value={academicYear}
            onChange={(e) => {
              setAcademicYear(e.target.value);
              setSectionId('');
            }}
            className="h-9 rounded-md border border-border/60 bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[120px]"
          >
            <option value="">All Academic Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                AY {year}
              </option>
            ))}
          </select>

          <select
            value={sectionId}
            disabled={!academicYear}
            onChange={(e) => setSectionId(e.target.value)}
            className="h-9 rounded-md border border-border/60 bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[120px] disabled:opacity-50"
          >
            <option value="">All Sections</option>
            {sections.map((sec) => (
              <option key={sec._id} value={sec._id}>
                {sec.courseId?.code || 'SEC'} - {sec.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-border/60 bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[130px]"
          >
            <option value="all">All Statuses</option>
            <option value="needs-assignment">Needs Assignment</option>
            <option value="assigned">Complete Committee</option>
          </select>
        </div>

        {/* Right Side: Quick Team Select */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-2 lg:pt-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Jump to:</span>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="h-9 rounded-md border border-border/60 bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[220px] max-w-xs"
          >
            {filteredTeams.length === 0 ? (
              <option value="">No teams available</option>
            ) : (
              filteredTeams.map((team) => {
                const memberCount = (team.members || []).length;
                return (
                  <option key={team._id} value={team._id}>
                    {team.name || 'Untitled Team'} ({memberCount}/4 Members)
                  </option>
                );
              })
            )}
          </select>
        </div>
      </div>

      {/* Loading & Error States */}
      {isTeamsLoading && (
        <div className="flex items-center justify-center p-12 text-xs text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading teams and faculty rosters...
        </div>
      )}

      {isTeamsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {teamsError?.response?.data?.error?.message || 'Failed to load teams.'}
          </AlertDescription>
        </Alert>
      )}

      {!isTeamsLoading && !isTeamsError && filteredTeams.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-2">
          <Users className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
          <h4 className="text-sm font-semibold text-foreground">No Teams Found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No student teams match your active search and filter options. Adjust the filters above.
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE GRID (1 COL LEFT / 2 COLS RIGHT) */}
      {/* ============================================================ */}
      {selectedTeam && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ========================================================== */}
          {/* LEFT COLUMN: TEAM PROFILE & MEMBER ROSTER (1 COLUMN) */}
          {/* ========================================================== */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold">
                      {selectedTeam.name || 'Untitled Team'}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      AY {selectedTeam.academicYear || '2025–2026'} ·{' '}
                      {selectedTeam.sectionId?.name || 'Section Unassigned'}
                    </CardDescription>
                  </div>
                  {hasApprovedProject ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] shrink-0 gap-1"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5" /> Project Approved
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] shrink-0 gap-1"
                    >
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
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {getInitials(formatFullName(selectedTeam.leaderId))}
                          </div>
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
                            <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
                              {getInitials(formatFullName(member))}
                            </div>
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
                    <a
                      href={`/projects/${selectedProjectId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="h-3 w-3" /> View Linked Project Workspace
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: FACULTY COMMITTEE ASSIGNMENT (2 COLUMNS) */}
          {/* ========================================================== */}
          <div className="space-y-6 lg:col-span-2">
            {/* Prerequisite Gate Alert */}
            {!hasApprovedProject && (
              <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <AlertTitle className="text-xs font-bold uppercase tracking-wider">
                  Assignment Locked
                </AlertTitle>
                <AlertDescription className="text-xs mt-1 text-amber-700 dark:text-amber-300">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <select
                      value={selectedAdviserId}
                      onChange={(e) => setSelectedAdviserId(e.target.value)}
                      disabled={isFacultyLoading || !hasApprovedProject}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Search & assign adviser --</option>
                      {eligibleFaculty.map((fac) => {
                        const count = facultyWorkload[fac._id] || 0;
                        return (
                          <option key={fac._id} value={fac._id}>
                            {formatFullName(fac)} ({fac.email}) · {count} active teams
                          </option>
                        );
                      })}
                    </select>

                    {/* Assigned Adviser Slot Preview */}
                    {assignedAdviser && (
                      <div className="flex items-center justify-between p-2 rounded-md border border-border/50 bg-background mt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                            {getInitials(formatFullName(assignedAdviser))}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {formatFullName(assignedAdviser)}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {assignedAdviser.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedAdviserId('')}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          title="Clear Adviser"
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

                    <select
                      value={selectedSecretaryId}
                      onChange={(e) => setSelectedSecretaryId(e.target.value)}
                      disabled={isFacultyLoading || !hasApprovedProject}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Search & assign secretary --</option>
                      {eligibleFaculty.map((fac) => {
                        const count = facultyWorkload[fac._id] || 0;
                        return (
                          <option key={fac._id} value={fac._id}>
                            {formatFullName(fac)} ({fac.email}) · {count} active teams
                          </option>
                        );
                      })}
                    </select>

                    {/* Assigned Secretary Slot Preview */}
                    {assignedSecretary && (
                      <div className="flex items-center justify-between p-2 rounded-md border border-border/50 bg-background mt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                            {getInitials(formatFullName(assignedSecretary))}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {formatFullName(assignedSecretary)}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {assignedSecretary.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedSecretaryId('')}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          title="Clear Secretary"
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
                        Assign up to 3 faculty evaluators (Lead Chair + Members).
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedPanelistIds.length} / 3 Selected
                    </Badge>
                  </div>

                  {/* Quick Add Dropdown */}
                  {selectedPanelistIds.length < 3 && (
                    <select
                      value=""
                      onChange={(e) => handleAddPanelist(e.target.value)}
                      disabled={isFacultyLoading || !hasApprovedProject}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">+ Add faculty member as panelist...</option>
                      {availablePanelistCandidates.map((fac) => {
                        const count = facultyWorkload[fac._id] || 0;
                        return (
                          <option key={fac._id} value={fac._id}>
                            {formatFullName(fac)} ({fac.email}) · {count} active teams
                          </option>
                        );
                      })}
                    </select>
                  )}

                  {/* Selected Panelist Chips / Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {selectedPanelistIds.map((panId, index) => {
                      const panObj = facultyMap.get(panId);
                      const panName = formatFullName(panObj);
                      const workload = facultyWorkload[panId] || 0;

                      return (
                        <div
                          key={panId}
                          className="flex items-center justify-between p-2.5 rounded-md border border-border/70 bg-card text-xs shadow-2xs"
                        >
                          <div className="space-y-0.5 min-w-0 pr-1">
                            <p className="font-semibold text-foreground leading-none truncate">
                              {panName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {index === 0 ? (
                                <span className="text-primary font-medium">Lead / Chair</span>
                              ) : (
                                'Panel Member'
                              )}
                              {' · '}
                              <span className="text-muted-foreground">{workload} teams</span>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePanelist(panId)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove Panelist"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}

                    {selectedPanelistIds.length === 0 && (
                      <div className="col-span-3 text-center py-6 border border-dashed rounded-md text-xs text-muted-foreground">
                        No panelists appointed yet. Use the dropdown above to add members.
                      </div>
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
                  className="gap-1.5 text-xs bg-primary hover:bg-primary/90"
                >
                  {assignCommitteeMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  Save & Broadcast Assignments
                </Button>
              </CardFooter>
            </Card>

            {/* Collapsible Project Milestones / Deadline Setter */}
            {selectedProjectId && (
              <Card className="border-border/60 shadow-xs">
                <CardHeader
                  className="cursor-pointer py-3"
                  onClick={() => setIsDeadlinesOpen((prev) => !prev)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          Project Milestones & Deadlines
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Configure chapter submission cutoffs for this team.
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      {isDeadlinesOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {isDeadlinesOpen && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { key: 'proposal', label: 'Proposal' },
                        { key: 'chapter1', label: 'Chapter 1' },
                        { key: 'chapter2', label: 'Chapter 2' },
                        { key: 'chapter3', label: 'Chapter 3' },
                        { key: 'chapter4', label: 'Chapter 4' },
                        { key: 'chapter5', label: 'Chapter 5' },
                      ].map((entry) => (
                        <div
                          key={entry.key}
                          className="space-y-1 rounded-md border p-2.5 bg-muted/10"
                        >
                          <Label htmlFor={`deadline-${entry.key}`} className="text-xs">
                            {entry.label}
                          </Label>
                          <Input
                            id={`deadline-${entry.key}`}
                            type="date"
                            value={deadlineDraft[entry.key]}
                            onChange={(e) =>
                              setDeadlineDraft((prev) => ({
                                ...prev,
                                [entry.key]: e.target.value,
                              }))
                            }
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSaveDeadlines}
                        disabled={setDeadlines.isPending}
                        className="text-xs h-8"
                      >
                        {setDeadlines.isPending ? 'Saving...' : 'Save Deadlines'}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
