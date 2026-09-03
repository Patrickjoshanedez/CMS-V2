import { useState, useCallback, useMemo, useEffect } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import TeamCommitteeAssignmentsView from '@/components/users/TeamCommitteeAssignmentsView';
import CreateAcademicNodeDialog from '@/components/users/CreateAcademicNodeDialog';
import {
  Users,
  UserPlus,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Archive,
  FolderTree,
  UserCheck,
} from 'lucide-react';
import { ROLES, ROLE_VALUES } from '@cms/shared';
import { useAuthStore } from '@/stores/authStore';
import {
  useUsers,
  useCreateUser,
  useChangeRole,
  useDeleteUser,
  useActivateUser,
} from '@/hooks/useUsers';
import {
  useAcademicHierarchy,
  useAcademicYears,
  useCourses,
  useSections,
} from '@/hooks/useAcademics';
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
  const roleStyles = {
    instructor: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    adviser: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    panelist: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    faculty: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    student: 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10',
    admin: 'border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10',
    coordinator: 'border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize text-[10px] py-0 px-2 font-medium tracking-wide',
        roleStyles[role] || 'border-border text-muted-foreground',
      )}
    >
      {role}
    </Badge>
  );
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

function HierarchyView() {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [navAcademicYear, setNavAcademicYear] = useState('');
  const [navCourseKey, setNavCourseKey] = useState('');
  const [navSectionId, setNavSectionId] = useState('');
  const [navTeamId, setNavTeamId] = useState('');
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);

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
    setNavAcademicYear('');
    setNavCourseKey('');
    setNavSectionId('');
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

  return (
    <div className="space-y-6">
      {/* Create Academic Node Modal */}
      <CreateAcademicNodeDialog
        isOpen={showAddNodeModal}
        onClose={() => setShowAddNodeModal(false)}
        courses={courses}
        years={years}
      />

      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <FolderTree className="h-4 w-4 text-primary" />
                Student Management Hierarchy
              </CardTitle>
              <CardDescription className="text-xs">
                Drill down from academic year to degree program, section cohort, and capstone teams.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddNodeModal(true)}
              className="gap-1.5 text-xs bg-primary shrink-0 self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Academic Level
            </Button>
          </div>

          <div className="mt-2">
            <HierarchyBreadcrumb
              course={selectedCourse}
              academicYear={selectedAcademicYear}
              section={selectedSection}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Filter by Course</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedSectionId('');
                }}
              >
                <option value="">All Courses / Programs</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.code} — {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Filter by Academic Year</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedAcademicYear}
                onChange={(e) => {
                  setSelectedAcademicYear(e.target.value);
                  setSelectedSectionId('');
                }}
              >
                <option value="">All Academic Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Filter by Section</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                .filter(
                  (node) =>
                    !hierarchySearch ||
                    node.academicYear.toLowerCase().includes(hierarchySearch.toLowerCase()),
                )
                .map((yearNode) => (
                  <button
                    key={yearNode.academicYear}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/50"
                    onClick={() => {
                      setNavAcademicYear(yearNode.academicYear);
                      setHierarchySearch('');
                    }}
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
                .filter(
                  (node) =>
                    !hierarchySearch ||
                    node.course?.code?.toLowerCase().includes(hierarchySearch.toLowerCase()) ||
                    node.course?.name?.toLowerCase().includes(hierarchySearch.toLowerCase()),
                )
                .map((courseNode) => (
                  <button
                    key={courseNode.courseKey}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/50"
                    onClick={() => {
                      setNavCourseKey(courseNode.courseKey);
                      setHierarchySearch('');
                    }}
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
                .filter(
                  (sec) =>
                    !hierarchySearch ||
                    sec.name.toLowerCase().includes(hierarchySearch.toLowerCase()) ||
                    sec.code?.toLowerCase().includes(hierarchySearch.toLowerCase()),
                )
                .map((section) => (
                  <button
                    key={section._id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/50"
                    onClick={() => {
                      setNavSectionId(section._id);
                      setHierarchySearch('');
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {section.code && section.name
                          ? `${section.code} · ${section.name}`
                          : section.code || section.name}
                      </p>
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
                .filter(
                  (t) =>
                    !hierarchySearch ||
                    t.name?.toLowerCase().includes(hierarchySearch.toLowerCase()),
                )
                .map((team) => (
                  <button
                    key={team._id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/50"
                    onClick={() => {
                      setNavTeamId(team._id);
                      setHierarchySearch('');
                    }}
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
                    .filter(
                      (m) =>
                        !hierarchySearch ||
                        `${m.firstName} ${m.lastName} ${m.email}`
                          .toLowerCase()
                          .includes(hierarchySearch.toLowerCase()),
                    )
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
                        <Badge variant="outline" className="mt-1">
                          {selectedFolderTeam.assignment.projectStatus}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phase</p>
                        <p className="font-medium mt-1">
                          {selectedFolderTeam.assignment.capstonePhase}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Title Status</p>
                        <Badge variant="secondary" className="mt-1">
                          {selectedFolderTeam.assignment.titleStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `/projects/${selectedFolderTeam.assignment.projectId}`,
                            '_blank',
                          )
                        }
                      >
                        Open Project Viewer
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() =>
                          window.open(
                            `/project/submissions?mode=view&projectId=${selectedFolderTeam.assignment.projectId}`,
                            '_blank',
                          )
                        }
                      >
                        Submissions & Documents
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                    No project created for this team yet.
                  </p>
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

function UserRow({ user, currentUserId, onChangeRole, onDeactivate, onActivate }) {
  const isSelf = user._id === currentUserId;
  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
  const initials = (user.firstName?.[0] || user.email?.[0] || '?').toUpperCase();

  return (
    <div className="user-row-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3.5 transition-colors hover:border-primary/40 min-w-0">
      {/* Identity block protected with min-w-0 */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary border border-primary/20">
          {initials}
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {fullName || 'Unnamed'}
            </p>
            <RoleBadge role={user.role} />
            {!user.isVerified && (
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px] py-0 px-1.5"
              >
                Unverified
              </Badge>
            )}
            {!user.isActive && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 uppercase">
                Deactivated
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
            {user.teamId && (
              <>
                {' '}
                ·{' '}
                <span className="text-foreground/80 font-medium">
                  Team: {user.teamId.name || user.teamId}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right: Role Change Dropdown & Actions */}
      {!isSelf && (
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <select
            aria-label={`Change role for ${fullName}`}
            className="h-8 w-[130px] rounded-md border border-input bg-muted/30 px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={user.role}
            onChange={(e) => onChangeRole(user._id, e.target.value)}
            disabled={!user.isActive}
          >
            {ROLE_VALUES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>

          {user.isActive ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-amber-600 hover:text-white transition-colors"
              onClick={() => onDeactivate(user._id, fullName)}
              title="Archive / Deactivate user"
            >
              <Archive className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-green-600 hover:text-white transition-colors"
              onClick={() => onActivate(user._id, fullName)}
              title="Activate user"
            >
              <UserCheck className="h-4 w-4" />
            </Button>
          )}
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

  const activateUser = useActivateUser({
    onSuccess: () => toast.success('User activated.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to activate user.'),
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

  const handleActivate = useCallback(
    (id, name) => {
      if (window.confirm(`Re-activate "${name}"? They will be able to log in again.`)) {
        activateUser.mutate(id);
      }
    },
    [activateUser],
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
      <div className="flex-1 space-y-6 max-w-[1600px] mx-auto min-w-0 w-full">
        {/* Page header */}
        <div className="flex flex-col gap-1 border-b border-border/60 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Administer platform access, academic structures, and capstone evaluation committees.
          </p>
        </div>

        {/* Primary Sub-Navigation: Horizontal Pill Tabs */}
        <Tabs value={activePanel} onValueChange={setActivePanel} className="space-y-6">
          <TabsList className="bg-muted/40 p-1 border border-border/60 rounded-lg inline-flex h-10">
            <TabsTrigger value="hierarchy" className="gap-2 text-xs">
              <FolderTree className="h-3.5 w-3.5" /> Academic Hierarchy
            </TabsTrigger>
            <TabsTrigger value="rbac" className="gap-2 text-xs">
              <Shield className="h-3.5 w-3.5" /> Role Management (RBAC)
            </TabsTrigger>
            <TabsTrigger value="committee" className="gap-2 text-xs">
              <Users className="h-3.5 w-3.5" /> Committee Assignments
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Academic Hierarchy */}
          <TabsContent value="hierarchy" className="space-y-6 min-w-0 w-full">
            <HierarchyView />
          </TabsContent>

          {/* Tab 2: Committee Assignments */}
          <TabsContent value="committee" className="space-y-6 min-w-0 w-full">
            <TeamCommitteeAssignmentsView />
          </TabsContent>

          {/* Tab 3: Role Management (RBAC) */}
          <TabsContent value="rbac" className="space-y-6 min-w-0 w-full">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Roles & Permissions</h2>
                  <p className="text-xs text-muted-foreground">
                    Manage user credentials, platform permissions, and authentication access.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-primary shrink-0 self-start sm:self-auto"
                  onClick={() => setShowCreateForm((prev) => !prev)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {showCreateForm ? 'Cancel' : 'New User'}
                </Button>
              </div>

              {/* Create student form */}
              {showCreateForm && <CreateUserForm onCancel={() => setShowCreateForm(false)} />}

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3.5 rounded-lg border border-border/60">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search users by name or email..."
                    className="pl-9 h-9 text-xs"
                    value={search}
                    onChange={handleSearch}
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Label
                    htmlFor="roleFilter"
                    className="text-xs text-muted-foreground whitespace-nowrap"
                  >
                    Role:
                  </Label>
                  <select
                    id="roleFilter"
                    className="h-9 w-full sm:w-[150px] rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              </div>

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

              {/* User Directory List */}
              {!isLoading && !isError && users.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      User Directory
                    </p>
                    <span className="text-xs text-muted-foreground">
                      Showing {users.length} of {pagination.total || 0} total users
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {users.map((user) => (
                      <UserRow
                        key={user._id}
                        user={user}
                        currentUserId={currentUser?._id}
                        onChangeRole={handleChangeRole}
                        onDeactivate={handleDeactivate}
                        onActivate={handleActivate}
                      />
                    ))}
                  </div>
                  <div className="pt-2">
                    <Pagination pagination={pagination} onPageChange={setPage} />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
