import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { TagInput } from '@/components/ui/TagInput';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { YearInput } from '@/components/ui/YearInput';
import {
  Users,
  UserPlus,
  Search,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Trash2,
  FolderTree,
  BookOpen,
  Layers,
  CalendarDays,
  Crown,
} from 'lucide-react';
import { ROLES, ROLE_VALUES } from '@cms/shared';
import { useAuthStore } from '@/stores/authStore';
import { useUsers, useCreateUser, useChangeRole, useDeleteUser } from '@/hooks/useUsers';
import { useTeams, teamKeys } from '@/hooks/useTeams';
import {
  useAssignAdviser,
  useAssignPanelist,
  useRemovePanelist,
  useProject,
  useSetDeadlines,
} from '@/hooks/useProjects';
import { useAcademicHierarchy, useAcademicYears, useCourses, useCreateCourse, useCreateSection, useCreateAcademicYear, useSections } from '@/hooks/useAcademics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * UsersPage — Instructor-only user and RBAC management page.
 *
 * Features:
 * - Paginated user list with search and role filter
 * - Create new user form
 * - Inline role change
 * - Deactivate (soft-delete) user
 */

/* ────────── Role Badge ────────── */

function RoleBadge({ role }) {
  const variants = {
    instructor: 'default',
    adviser: 'secondary',
    panelist: 'outline',
    student: 'outline',
  };
  return <Badge variant={variants[role] || 'outline'}>{role}</Badge>;
}

function HierarchyBreadcrumb({ course, academicYear, section }) {
  const crumbs = [
    { label: 'Students' },
    { label: course ? course.code : 'All Courses' },
    { label: academicYear || 'All Years' },
    { label: section ? section.name : 'All Sections' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {crumbs.map((crumb, idx) => (
        <div key={`${crumb.label}-${idx}`} className="flex items-center gap-2">
          <span className="rounded-md bg-muted px-2 py-1">{crumb.label}</span>
          {idx < crumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
        </div>
      ))}
    </div>
  );
}

function formatFullName(user) {
  if (!user) return 'Unknown';
  return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || user.email;
}

function formatCommitteeOption(user) {
  return `${formatFullName(user)} • ${user?.email || 'No email provided'}`;
}

function TeamCommitteeAssignmentsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [academicYear, setAcademicYear] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [committeeFilter, setCommitteeFilter] = useState('all');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [deadlineDraft, setDeadlineDraft] = useState({
    chapter1: '',
    chapter2: '',
    chapter3: '',
    proposal: '',
    chapter4: '',
    chapter5: '',
  });

  const { data: years = [] } = useAcademicYears();
  const { data: sections = [] } = useSections(
    { academicYear: academicYear || undefined },
    { enabled: Boolean(academicYear) },
  );

  const { data: teamData, isLoading, isError, error } = useTeams(filters);
  const { data: adviserData, isLoading: isAdvisersLoading } = useUsers({
    role: ROLES.ADVISER,
    isActive: true,
    page: 1,
    limit: 200,
  });
  const { data: panelistData, isLoading: isPanelistsLoading } = useUsers({
    role: ROLES.PANELIST,
    isActive: true,
    page: 1,
    limit: 200,
  });

  const assignAdviser = useAssignAdviser({
    onSuccess: () => {
      toast.success('Adviser assigned successfully.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to assign adviser.'),
  });

  const assignPanelist = useAssignPanelist({
    onSuccess: () => {
      toast.success('Panelist assigned successfully.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to assign panelist.'),
  });

  const removePanelist = useRemovePanelist({
    onSuccess: () => {
      toast.success('Panelist removed successfully.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to remove panelist.'),
  });

  const allTeams = useMemo(() => teamData?.teams || [], [teamData?.teams]);
  const adviserOptions = useMemo(() => adviserData?.users || [], [adviserData?.users]);
  const panelistOptions = useMemo(() => panelistData?.users || [], [panelistData?.users]);

  const filteredTeams = useMemo(() => {
    return allTeams.filter((team) => {
      if (committeeFilter === 'all') return true;

      const assignment = team.assignment || {};
      const panelists = assignment.panelists || [];

      if (committeeFilter === 'no-adviser') return !assignment.adviser;
      if (committeeFilter === 'needs-panelists') return panelists.length < 3;
      if (committeeFilter === 'complete')
        return Boolean(assignment.adviser) && panelists.length >= 3;

      return true;
    });
  }, [allTeams, committeeFilter]);

  const selectedTeam = filteredTeams.find((team) => team._id === selectedTeamId) || null;
  const selectedAssignment = selectedTeam?.assignment || {};
  const selectedPanelists = selectedAssignment.panelists || [];
  const selectedProjectId = selectedAssignment.projectId || null;

  const { data: selectedProject } = useProject(selectedProjectId, {
    enabled: Boolean(selectedProjectId),
  });

  const setDeadlines = useSetDeadlines({
    onSuccess: () => {
      toast.success('Project deadlines updated.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to update project deadlines.'),
  });

  const adviserSuggestions = useMemo(
    () => adviserOptions.map(formatCommitteeOption),
    [adviserOptions],
  );

  const panelistSuggestions = useMemo(
    () =>
      panelistOptions
        .filter((panelist) => !selectedPanelists.some((existing) => existing?._id === panelist._id))
        .map(formatCommitteeOption),
    [panelistOptions, selectedPanelists],
  );

  useEffect(() => {
    if (selectedTeamId && !filteredTeams.some((team) => team._id === selectedTeamId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTeamId('');
    }
  }, [filteredTeams, selectedTeamId]);

  useEffect(() => {
    if (!selectedProjectId || !selectedProject) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeadlineDraft({
        chapter1: '',
        chapter2: '',
        chapter3: '',
        proposal: '',
        chapter4: '',
        chapter5: '',
      });
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeadlineDraft({
      chapter1: selectedProject?.deadlines?.chapter1?.split('T')[0] || '',
      chapter2: selectedProject?.deadlines?.chapter2?.split('T')[0] || '',
      chapter3: selectedProject?.deadlines?.chapter3?.split('T')[0] || '',
      proposal: selectedProject?.deadlines?.proposal?.split('T')[0] || '',
      chapter4: selectedProject?.deadlines?.chapter4?.split('T')[0] || '',
      chapter5: selectedProject?.deadlines?.chapter5?.split('T')[0] || '',
    });
  }, [selectedProjectId, selectedProject]);

  const openSubmissionViewer = (docKey) => {
    if (!selectedProjectId) return;

    const base = `/project/submissions?mode=view&projectId=${encodeURIComponent(selectedProjectId)}`;
    const chapterMatch = /^chapter(\d+)$/.exec(docKey);
    const href = chapterMatch ? `${base}&chapter=${chapterMatch[1]}` : base;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const openProjectViewer = () => {
    if (!selectedProjectId) return;
    window.open(`/projects/${selectedProjectId}`, '_blank', 'noopener,noreferrer');
  };

  const handleSaveDeadlines = () => {
    if (!selectedProjectId) {
      toast.error('Select a team with a linked project first.');
      return;
    }

    const payload = { projectId: selectedProjectId };
    Object.entries(deadlineDraft).forEach(([key, value]) => {
      if (value) {
        payload[key] = value;
      }
    });

    setDeadlines.mutate(payload);
  };

  const handleTeamSearch = (event) => {
    event.preventDefault();
    setFilters({
      search: search.trim() || undefined,
      academicYear: academicYear || undefined,
      sectionId: sectionId || undefined,
      page: 1,
    });
  };

  const handleAdviserSelect = (selectedTags) => {
    const selectedLabel = selectedTags.at(-1);
    if (!selectedLabel || !selectedProjectId || !selectedTeam) {
      return;
    }

    const adviser = adviserOptions.find(
      (option) => formatCommitteeOption(option) === selectedLabel,
    );
    if (!adviser) {
      toast.error('Select a valid adviser from the suggestions.');
      return;
    }

    if (selectedAssignment.adviser?._id === adviser._id) {
      toast.error('This adviser is already assigned.');
      return;
    }

    assignAdviser.mutate({ projectId: selectedProjectId, adviserId: adviser._id });
  };

  const handlePanelistSelect = (selectedTags) => {
    const selectedLabel = selectedTags.at(-1);
    if (!selectedLabel || !selectedProjectId || !selectedTeam) {
      return;
    }

    if (selectedPanelists.length >= 3) {
      toast.error('Only a maximum of 3 panelists can be assigned per team.');
      return;
    }

    const panelist = panelistOptions.find(
      (option) => formatCommitteeOption(option) === selectedLabel,
    );
    if (!panelist) {
      toast.error('Select a valid panelist from the suggestions.');
      return;
    }

    if (selectedPanelists.some((existing) => existing?._id === panelist._id)) {
      toast.error('This panelist is already assigned to the team.');
      return;
    }

    assignPanelist.mutate({ projectId: selectedProjectId, panelistId: panelist._id });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Team Committee Assignment</CardTitle>
          <CardDescription>
            Assign exactly one adviser and up to three panelists per team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleTeamSearch} className="grid gap-2 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              value={academicYear}
              onChange={(event) => {
                setAcademicYear(event.target.value);
                setSectionId('');
              }}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={sectionId}
              disabled={!academicYear}
              onChange={(event) => setSectionId(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All sections</option>
              {sections.map((section) => (
                <option key={section._id} value={section._id}>
                  {section.courseId?.code} - {section.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="committeeFilter">Committee Filter</Label>
              <select
                id="committeeFilter"
                value={committeeFilter}
                onChange={(event) => setCommitteeFilter(event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All teams</option>
                <option value="no-adviser">No adviser assigned</option>
                <option value="needs-panelists">Needs panelists (&lt;3)</option>
                <option value="complete">Complete committee</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="teamQuickSelect">Quick Team Select</Label>
              <select
                id="teamQuickSelect"
                value={selectedTeamId}
                onChange={(event) => setSelectedTeamId(event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select a team</option>
                {filteredTeams.map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.name || 'Untitled Team'}
                    {team.academicYear ? ` • ${team.academicYear}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading teams...
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error?.response?.data?.error?.message || 'Failed to load teams.'}
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && filteredTeams.length === 0 && (
            <p className="rounded-md border border-dashed bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">
              No teams found for the selected criteria.
            </p>
          )}

          {selectedTeam && (
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{selectedTeam.name || 'Untitled Team'}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedTeam.academicYear || 'No academic year'} •{' '}
                    {(selectedTeam.members || []).length} members
                  </p>
                </div>
                <Badge variant="outline">
                  {selectedProjectId ? 'Project Linked' : 'No Project Yet'}
                </Badge>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Team Leader
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatFullName(selectedTeam.leaderId)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedTeam.leaderId?.email || 'No email available'}
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Adviser
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedAssignment.adviser
                      ? formatFullName(selectedAssignment.adviser)
                      : 'Not assigned yet'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedAssignment.adviser?.email || 'No adviser assigned'}
                  </p>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Search and assign adviser
                    </p>
                    <TagInput
                      value={[]}
                      onChange={handleAdviserSelect}
                      suggestions={adviserSuggestions}
                      placeholder={
                        isAdvisersLoading ? 'Loading advisers...' : 'Type to search advisers'
                      }
                      maxTags={1}
                      disabled={!selectedProjectId || isAdvisersLoading || assignAdviser.isPending}
                    />
                  </div>
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Panelists ({selectedPanelists.length}/3)
                  </p>
                  {selectedPanelists.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {selectedPanelists.map((panelist) => (
                        <div
                          key={panelist._id}
                          className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 px-2 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{formatFullName(panelist)}</p>
                            <p className="text-xs text-muted-foreground">{panelist.email}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!selectedProjectId || removePanelist.isPending}
                            onClick={() =>
                              removePanelist.mutate({
                                projectId: selectedProjectId,
                                panelistId: panelist._id,
                              })
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No panelists assigned yet</p>
                  )}

                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Search and add panelist
                    </p>
                    <TagInput
                      value={[]}
                      onChange={handlePanelistSelect}
                      suggestions={panelistSuggestions}
                      placeholder={
                        isPanelistsLoading ? 'Loading panelists...' : 'Type to search panelists'
                      }
                      maxTags={3}
                      disabled={
                        !selectedProjectId ||
                        isPanelistsLoading ||
                        assignPanelist.isPending ||
                        selectedPanelists.length >= 3
                      }
                    />
                    {selectedPanelists.length >= 3 && (
                      <p className="text-xs text-muted-foreground">
                        Maximum reached: only 3 panelists are allowed per team.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {!selectedProjectId && (
                <p className="text-xs text-muted-foreground">
                  Create and approve the team project first before assigning adviser and panelists.
                </p>
              )}

              {selectedProjectId && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Deadline Setter</p>
                      <p className="text-xs text-muted-foreground">
                        Set proposal and chapter deadlines, then open the same submission/project
                        viewers used by instructors and faculty.
                      </p>
                    </div>
                    <Badge variant="outline">Project {selectedProjectId.slice(-6)}</Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { key: 'proposal', label: 'Proposal' },
                      { key: 'chapter1', label: 'Chapter 1' },
                      { key: 'chapter2', label: 'Chapter 2' },
                      { key: 'chapter3', label: 'Chapter 3' },
                      { key: 'chapter4', label: 'Chapter 4' },
                      { key: 'chapter5', label: 'Chapter 5' },
                    ].map((entry) => (
                      <div key={entry.key} className="space-y-2 rounded-md border p-2">
                        <Label htmlFor={`deadline-${entry.key}`}>{entry.label}</Label>
                        <Input
                          id={`deadline-${entry.key}`}
                          type="date"
                          value={deadlineDraft[entry.key]}
                          onChange={(event) =>
                            setDeadlineDraft((prev) => ({
                              ...prev,
                              [entry.key]: event.target.value,
                            }))
                          }
                        />
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openSubmissionViewer(entry.key)}
                          >
                            Submission Viewer
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={openProjectViewer}
                          >
                            Project Viewer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openProjectViewer}
                      disabled={!selectedProjectId}
                    >
                      Open Project Viewer
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveDeadlines}
                      disabled={!selectedProjectId || setDeadlines.isPending}
                    >
                      {setDeadlines.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Deadlines
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Team Members
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(selectedTeam.members || []).map((member) => {
                    const isLeader =
                      (selectedTeam.leaderId?._id || selectedTeam.leaderId) === member._id;

                    return (
                      <div
                        key={member._id}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {member.firstName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{formatFullName(member)}</p>
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        {isLeader && (
                          <Badge variant="outline" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Leader
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HierarchyView() {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [navAcademicYear, setNavAcademicYear] = useState('');
  const [navCourseKey, setNavCourseKey] = useState('');
  const [navSectionId, setNavSectionId] = useState('');
  const [navTeamId, setNavTeamId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [sectionCode, setSectionCode] = useState('');
  const [newSectionYear, setNewSectionYear] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('');
  const [hierarchySearch, setHierarchySearch] = useState('');

  const { data: courses = [] } = useCourses();
  const { data: years = [] } = useAcademicYears();
  const { data: sections = [] } = useSections(
    {
      courseId: selectedCourseId || undefined,
      academicYear: selectedAcademicYear || undefined,
    },
    { enabled: Boolean(selectedCourseId || selectedAcademicYear) },
  );

  const { data: hierarchy = [], isLoading } = useAcademicHierarchy({
    courseId: selectedCourseId || undefined,
    academicYear: selectedAcademicYear || undefined,
    sectionId: selectedSectionId || undefined,
  });

  const createCourse = useCreateCourse({
    onSuccess: () => {
      toast.success('Course created successfully.');
      setCourseName('');
      setCourseCode('');
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to create course.'),
  });
  const createAcademicYear = useCreateAcademicYear({
    onSuccess: () => {
      toast.success('Academic Year created successfully');
      setNewAcademicYear('');
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to create academic year.'),
  });
  const createSection = useCreateSection({
    onSuccess: () => {
      toast.success('Section created successfully.');
      setSectionName('');
      setSectionCode('');
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to create section.'),
  });

  const selectedCourse = courses.find((course) => course._id === selectedCourseId);
  const selectedSection = sections.find((section) => section._id === selectedSectionId);

  const folderHierarchy = useMemo(() => {
    const yearsMap = new Map();

    hierarchy.forEach((section) => {
      const yearKey = section.academicYear || 'Unknown Academic Year';
      const courseObject = section.courseId || {};
      const courseKey =
        courseObject._id || `${courseObject.code || 'UNKNOWN'}-${courseObject.name || section._id}`;

      if (!yearsMap.has(yearKey)) {
        yearsMap.set(yearKey, {
          academicYear: yearKey,
          coursesMap: new Map(),
          sectionCount: 0,
          teamCount: 0,
          studentCount: 0,
        });
      }

      const yearNode = yearsMap.get(yearKey);

      if (!yearNode.coursesMap.has(courseKey)) {
        yearNode.coursesMap.set(courseKey, {
          courseKey,
          course: courseObject,
          sections: [],
          teamCount: 0,
          studentCount: 0,
        });
      }

      const courseNode = yearNode.coursesMap.get(courseKey);
      courseNode.sections.push(section);
      courseNode.teamCount += section.teamCount || 0;
      courseNode.studentCount += section.studentCount || 0;

      yearNode.sectionCount += 1;
      yearNode.teamCount += section.teamCount || 0;
      yearNode.studentCount += section.studentCount || 0;
    });

    return Array.from(yearsMap.values())
      .map((yearNode) => ({
        ...yearNode,
        courses: Array.from(yearNode.coursesMap.values()).sort((a, b) => {
          const left = a.course?.code || a.course?.name || '';
          const right = b.course?.code || b.course?.name || '';
          return left.localeCompare(right);
        }),
      }))
      .sort((a, b) => b.academicYear.localeCompare(a.academicYear));
  }, [hierarchy]);

  const selectedYearNode =
    folderHierarchy.find((node) => node.academicYear === navAcademicYear) || null;
  const selectedCourseNode =
    selectedYearNode?.courses?.find((courseNode) => courseNode.courseKey === navCourseKey) || null;
  const selectedFolderSection =
    selectedCourseNode?.sections?.find((section) => section._id === navSectionId) || null;
  const selectedFolderTeam =
    selectedFolderSection?.teams?.find((team) => team._id === navTeamId) || null;

  const canGoBack = Boolean(navTeamId || navSectionId || navCourseKey || navAcademicYear);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavAcademicYear('');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavCourseKey('');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavSectionId('');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavTeamId('');
  }, [selectedCourseId, selectedAcademicYear, selectedSectionId]);

  const handleBack = () => {
    if (navTeamId) {
      setNavTeamId('');
      return;
    }
    if (navSectionId) {
      setNavSectionId('');
      return;
    }
    if (navCourseKey) {
      setNavCourseKey('');
      return;
    }
    if (navAcademicYear) {
      setNavAcademicYear('');
    }
  };

  const onCreateCourse = (event) => {
    event.preventDefault();
    createCourse.mutate({ name: courseName.trim(), code: courseCode.trim() });
  };

  const onCreateAcademicYear = (event) => {
    event.preventDefault();
    createAcademicYear.mutate({ year: newAcademicYear.trim() });
  };

  const onCreateSection = (event) => {
    event.preventDefault();
    createSection.mutate({
      section: sectionName.trim(),
      code: sectionCode.trim(),
      courseId: selectedCourseId,
      academicYear: newSectionYear.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Student Management Hierarchy
          </CardTitle>
          <CardDescription>
            Drill down from course to year, section, teams, and student members.
          </CardDescription>
          <HierarchyBreadcrumb
            course={selectedCourse}
            academicYear={selectedAcademicYear}
            section={selectedSection}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-1">
              <Label>Course</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedSectionId('');
                }}
              >
                <option value="">All Courses</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Academic Year</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={selectedAcademicYear}
                onChange={(e) => {
                  setSelectedAcademicYear(e.target.value);
                  setSelectedSectionId('');
                }}
              >
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Section</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
              >
                <option value="">All Sections</option>
                {sections.map((section) => (
                  <option key={section._id} value={section._id}>
                    {section.name}
                    {section.code ? ` (${section.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <form onSubmit={onCreateCourse} className="space-y-2 rounded-md border p-3">
              <Label className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4" />
                Add Course
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="BSIT"
                  required
                />
                <Input
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="BS Information Technology"
                  required
                />
              </div>
              <Button type="submit" size="sm" disabled={createCourse.isPending}>
                {createCourse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Course
              </Button>
            </form>

            <form onSubmit={onCreateAcademicYear} className="space-y-2 rounded-md border p-3">
              <Label className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4" />
                Add Academic Year
              </Label>
              <div className="grid gap-2">
                <YearInput
                  value={newAcademicYear}
                  onChange={(e) => setNewAcademicYear(e)}
                  placeholder="2025"
                  required
                />
              </div>
              <Button type="submit" size="sm" disabled={createAcademicYear.isPending}>
                {createAcademicYear.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Year
              </Button>
            </form>

            <form onSubmit={onCreateSection} className="space-y-2 rounded-md border p-3">
              <Label className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4" />
                Add Section
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="Section/Year e.g. 1A"
                  title="Format: Year + Cluster (e.g., 1A, 2B, 4C)"
                  pattern="\d{1,2}[A-Za-z]"
                  required
                />
                <Input
                  value={sectionCode}
                  onChange={(e) => setSectionCode(e.target.value)}
                  placeholder="Section Code e.g. T88"
                  title="Section code example: T88"
                  required
                />
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.code}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={newSectionYear}
                  onChange={(e) => setNewSectionYear(e.target.value)}
                  required
                >
                  <option value="">Select Year</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={
                  createSection.isPending || !selectedCourseId || !newSectionYear || !sectionCode
                }
              >
                {createSection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Section
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hierarchy Navigator</CardTitle>
          <CardDescription>
            Folder-style navigation: Academic Year -&gt; Course -&gt; Section -&gt; Team -&gt;
            Students.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                setNavAcademicYear('');
                setNavCourseKey('');
                setNavSectionId('');
                setNavTeamId('');
              }}
            >
              School Years
            </Button>
            {navAcademicYear && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => {
                    setNavCourseKey('');
                    setNavSectionId('');
                    setNavTeamId('');
                  }}
                >
                  {navAcademicYear}
                </Button>
              </>
            )}
            {selectedCourseNode && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => {
                    setNavSectionId('');
                    setNavTeamId('');
                  }}
                >
                  {selectedCourseNode.course?.code || selectedCourseNode.course?.name || 'Course'}
                </Button>
              </>
            )}
            {selectedFolderSection && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setNavTeamId('')}
                >
                  {selectedFolderSection.name}
                </Button>
              </>
            )}
            {selectedFolderTeam && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="rounded-md bg-muted px-2 py-1">{selectedFolderTeam.name}</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {!navAcademicYear && 'Select an academic year'}
              {navAcademicYear && !navCourseKey && 'Select a course'}
              {navAcademicYear && navCourseKey && !navSectionId && 'Select a section'}
              {navAcademicYear && navCourseKey && navSectionId && !navTeamId && 'Select a team'}
              {navAcademicYear && navCourseKey && navSectionId && navTeamId && 'Students'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={!canGoBack}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </div>
          
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search current list..."
              value={hierarchySearch}
              onChange={(e) => setHierarchySearch(e.target.value)}
              className="pl-9 w-full sm:max-w-xs h-9 text-sm"
            />
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading hierarchy...
            </div>
          )}

          {!isLoading && hierarchy.length === 0 && (
            <p className="text-sm text-muted-foreground">No sections found.</p>
          )}

          {!isLoading && !navAcademicYear && (
            <div className="space-y-2">
              {folderHierarchy
                .filter(node => !hierarchySearch || node.academicYear.toLowerCase().includes(hierarchySearch.toLowerCase()))
                .map((yearNode) => (
                <button
                  key={yearNode.academicYear}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/50"
                  onClick={() => { setNavAcademicYear(yearNode.academicYear); setHierarchySearch(''); }}
                >
                  <div>
                    <p className="text-sm font-semibold">{yearNode.academicYear}</p>
                    <p className="text-xs text-muted-foreground">
                      {yearNode.sectionCount} sections | {yearNode.teamCount} teams |{' '}
                      {yearNode.studentCount} students
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {!isLoading && navAcademicYear && !navCourseKey && (
            <div className="space-y-2">
              {(selectedYearNode?.courses || [])
                .filter(node => !hierarchySearch || node.course?.code?.toLowerCase().includes(hierarchySearch.toLowerCase()) || node.course?.name?.toLowerCase().includes(hierarchySearch.toLowerCase()))
                .map((courseNode) => (
                <button
                  key={courseNode.courseKey}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/50"
                  onClick={() => { setNavCourseKey(courseNode.courseKey); setHierarchySearch(''); }}
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {courseNode.course?.code || 'N/A'} -{' '}
                      {courseNode.course?.name || 'Unknown Course'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {courseNode.sections.length} sections | {courseNode.teamCount} teams |{' '}
                      {courseNode.studentCount} students
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {!isLoading && navAcademicYear && navCourseKey && !navSectionId && (
            <div className="space-y-2">
              {(selectedCourseNode?.sections || [])
                .filter(sec => !hierarchySearch || sec.name.toLowerCase().includes(hierarchySearch.toLowerCase()) || sec.code?.toLowerCase().includes(hierarchySearch.toLowerCase()))
                .map((section) => (
                <button
                  key={section._id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/50"
                  onClick={() => { setNavSectionId(section._id); setHierarchySearch(''); }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{section.code || section.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {section.teamCount} teams | {section.studentCount} students
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {!isLoading && navAcademicYear && navCourseKey && navSectionId && !navTeamId && (
            <div className="space-y-2">
              {(selectedFolderSection?.teams || [])
                .filter(t => !hierarchySearch || t.name?.toLowerCase().includes(hierarchySearch.toLowerCase()))
                .map((team) => (
                <button
                  key={team._id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/50"
                  onClick={() => { setNavTeamId(team._id); setHierarchySearch(''); }}
                >
                  <div>
                    <p className="text-sm font-semibold">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {team.members?.length || 0} students
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}

              {(selectedFolderSection?.teams || []).length === 0 && (
                <p className="rounded-md border bg-muted/30 p-2 text-sm text-muted-foreground">
                  No teams in this section yet.
                </p>
              )}
            </div>
          )}

          {!isLoading && navAcademicYear && navCourseKey && navSectionId && navTeamId && (
            <div className="space-y-4">
              <div className="rounded-md border bg-background p-3">
                <p className="mb-2 text-sm font-semibold">Students in {selectedFolderTeam?.name}</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {(selectedFolderTeam?.members || [])
                    .filter(m => !hierarchySearch || `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(hierarchySearch.toLowerCase()))
                    .map((member) => (
                    <div
                      key={member._id}
                      className="rounded border bg-background px-2 py-1 text-xs transition-colors hover:border-primary/60"
                    >
                      <p className="font-medium">
                        {[member.firstName, member.middleName, member.lastName]
                          .filter(Boolean)
                          .join(' ')}
                      </p>
                      <p className="text-muted-foreground">{member.email}</p>
                    </div>
                  ))}
                </div>

                {(selectedFolderTeam?.members || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No student members found in this team.
                  </p>
                )}
              </div>

              {/* Project details card */}
              <div className="rounded-md border bg-muted/10 p-3">
                 <p className="text-sm font-semibold mb-3">Project Details</p>
                 {selectedFolderTeam?.assignment?.projectId ? (
                   <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                         <div>
                            <p className="text-muted-foreground">Project Status</p>
                            <Badge variant="outline" className="mt-1">{selectedFolderTeam.assignment.projectStatus}</Badge>
                         </div>
                         <div>
                            <p className="text-muted-foreground">Phase</p>
                            <p className="font-medium mt-1">{selectedFolderTeam.assignment.capstonePhase}</p>
                         </div>
                         <div>
                            <p className="text-muted-foreground">Title Status</p>
                            <Badge variant="secondary" className="mt-1">{selectedFolderTeam.assignment.titleStatus}</Badge>
                         </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                         <Button size="sm" variant="outline" onClick={() => window.open(`/projects/${selectedFolderTeam.assignment.projectId}`, '_blank')}>
                            Open Project Viewer
                         </Button>
                         <Button size="sm" variant="default" onClick={() => window.open(`/project/submissions?mode=view&projectId=${selectedFolderTeam.assignment.projectId}`, '_blank')}>
                            Submissions & Documents
                         </Button>
                      </div>
                   </div>
                 ) : (
                   <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">No project created for this team yet.</p>
                 )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ────────── User Row ────────── */

function UserRow({ user, currentUserId, onChangeRole, onDeactivate }) {
  const isSelf = user._id === currentUserId;
  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');

  return (
    <div className="user-row-card flex items-center justify-between gap-4 rounded-md border p-4 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary sm:flex">
            {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium">{fullName || 'Unnamed'}</p>
              <RoleBadge role={user.role} />
              {!user.isActive && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase">
                  Inactive
                </Badge>
              )}
              {!user.isVerified && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase">
                  Unverified
                </Badge>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
            {user.teamId && (
              <p className="mt-0.5 text-xs text-muted-foreground">Team: {user.teamId.name || user.teamId}</p>
            )}
          </div>
        </div>
      </div>

      {!isSelf && (
        <div className="flex shrink-0 items-center gap-2">
          {/* Role change dropdown */}
          <select
            aria-label={`Change role for ${fullName}`}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={user.role}
            onChange={(e) => onChangeRole(user._id, e.target.value)}
          >
            {ROLE_VALUES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>

          {/* Deactivate button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onDeactivate(user._id, fullName)}
            title="Deactivate user"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ────────── Create User Form ────────── */

function CreateUserForm({ onCancel }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    password: '',
    role: ROLES.STUDENT,
  });

  const createUser = useCreateUser({
    onSuccess: () => {
      toast.success('User created successfully!');
      setFormData({
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        password: '',
        role: ROLES.STUDENT,
      });
      onCancel();
    },
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to create user.'),
  });

  const handleChange = useCallback(
    (field) => (e) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    createUser.mutate({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      middleName: formData.middleName.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create a New User</CardTitle>
        <CardDescription>The user will be pre-verified and can log in immediately.</CardDescription>
      </CardHeader>
      <CardContent>
        {createUser.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {createUser.error?.response?.data?.error?.message || 'Failed to create user.'}
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="Juan"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                required
                minLength={2}
                maxLength={50}
                disabled={createUser.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                placeholder="Dela"
                value={formData.middleName}
                onChange={handleChange('middleName')}
                maxLength={50}
                disabled={createUser.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Cruz"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                required
                minLength={2}
                maxLength={50}
                disabled={createUser.isPending}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@buksu.edu.ph"
                value={formData.email}
                onChange={handleChange('email')}
                required
                disabled={createUser.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange('password')}
                required
                minLength={8}
                maxLength={128}
                disabled={createUser.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={formData.role}
              onChange={handleChange('role')}
              disabled={createUser.isPending}
            >
              {ROLE_VALUES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={createUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ────────── Pagination ────────── */

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.pages} ({pagination.total} users)
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.pages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ────────── Main Page ────────── */

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [activePanel, setActivePanel] = useState('hierarchy');

  // Filters state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Build query params
  const filters = useMemo(() => {
    const params = { page, limit: 20 };
    if (search.trim()) params.search = search.trim();
    if (roleFilter) params.role = roleFilter;
    return params;
  }, [page, search, roleFilter]);

  // Fetch users
  const { data, isLoading, isError, error } = useUsers(filters);

  const users = data?.users || [];
  const pagination = data?.pagination || {};

  // Mutations
  const changeRole = useChangeRole({
    onSuccess: () => toast.success('Role updated.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to update role.'),
  });

  const deleteUser = useDeleteUser({
    onSuccess: () => toast.success('User deactivated.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to deactivate user.'),
  });

  const handleChangeRole = useCallback(
    (id, role) => {
      changeRole.mutate({ id, role });
    },
    [changeRole],
  );

  const handleDeactivate = useCallback(
    (id, name) => {
      if (window.confirm(`Are you sure you want to deactivate "${name}"?`)) {
        deleteUser.mutate(id);
      }
    },
    [deleteUser],
  );

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search change
  }, []);

  const handleRoleFilter = useCallback((e) => {
    setRoleFilter(e.target.value);
    setPage(1);
  }, []);

  // Guard: only Instructors should see this page
  if (currentUser?.role !== ROLES.INSTRUCTOR) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">Only Instructors can manage users.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage hierarchy, roles, permissions, and committee assignments.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* Sidebar Nav */}
          <Card className="h-fit shrink-0 md:w-64">
            <CardContent className="p-3">
              <nav className="users-tab-nav">
                <button
                  type="button"
                  className={cn('users-tab-btn', activePanel === 'hierarchy' && 'active')}
                  onClick={() => setActivePanel('hierarchy')}
                >
                  <FolderTree className="h-4 w-4" />
                  Academic Hierarchy
                </button>
                <button
                  type="button"
                  className={cn('users-tab-btn', activePanel === 'rbac' && 'active')}
                  onClick={() => setActivePanel('rbac')}
                >
                  <Shield className="h-4 w-4" />
                  Role Management (RBAC)
                </button>
                <button
                  type="button"
                  className={cn('users-tab-btn', activePanel === 'committee' && 'active')}
                  onClick={() => setActivePanel('committee')}
                >
                  <Users className="h-4 w-4" />
                  Committee Assignments
                </button>
              </nav>
            </CardContent>
          </Card>

          {/* Main Content Area */}
          <div className="min-w-0 flex-1 users-panel-enter" key={activePanel}>
            {activePanel === 'hierarchy' && <HierarchyView />}

            {activePanel === 'committee' && <TeamCommitteeAssignmentsView />}

            {activePanel === 'rbac' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Roles & Permissions</h2>
                  <Button onClick={() => setShowCreateForm((prev) => !prev)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {showCreateForm ? 'Cancel' : 'New User'}
                  </Button>
                </div>

                {/* Create student form */}
                {showCreateForm && <CreateUserForm onCancel={() => setShowCreateForm(false)} />}

                {/* Filters */}
                <Card className="users-stat-card">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="search" className="text-xs text-muted-foreground">
                        Search Users
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Search by name or email..."
                          className="pl-9"
                          value={search}
                          onChange={handleSearch}
                        />
                      </div>
                    </div>
                    <div className="w-full space-y-1 sm:w-48">
                      <Label htmlFor="roleFilter" className="text-xs text-muted-foreground">
                        Filter by Role
                      </Label>
                      <select
                        id="roleFilter"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={roleFilter}
                        onChange={handleRoleFilter}
                      >
                        <option value="">All Roles</option>
                        {ROLE_VALUES.map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* Loading state */}
                {isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}

                {/* Error state */}
                {isError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {error?.response?.data?.error?.message || 'Failed to load users.'}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Empty state */}
                {!isLoading && !isError && users.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
                    <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No users found</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      {search || roleFilter
                        ? 'Try adjusting your filters.'
                        : 'Start by creating a new user.'}
                    </p>
                  </div>
                )}

                {/* Student list with RBAC controls */}
                {!isLoading && !isError && users.length > 0 && (
                  <Card className="users-stat-card border-none shadow-none bg-transparent">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-base">User Directory</CardTitle>
                      <CardDescription>
                        Showing {users.length} of {pagination.total || 0} total users
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 px-0">
                      {users.map((user) => (
                        <UserRow
                          key={user._id}
                          user={user}
                          currentUserId={currentUser?._id}
                          onChangeRole={handleChangeRole}
                          onDeactivate={handleDeactivate}
                        />
                      ))}
                      <div className="pt-2">
                        <Pagination pagination={pagination} onPageChange={setPage} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
