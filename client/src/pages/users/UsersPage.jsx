import { useState, useCallback, useMemo, useEffect } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import CreateAcademicNodeDialog from '@/components/users/CreateAcademicNodeDialog';
import {
  Users,
  UserPlus,
  Plus,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Archive,
  FolderTree,
  UserCheck,
  GraduationCap,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
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
import { ROLES, PRIMARY_ROLE_VALUES, CAPSTONE_CURRICULUM_MAP } from '@cms/shared';
import { useAuthStore } from '@/stores/authStore';
import {
  formatCanonicalSectionName,
  formatSectionWithCode,
  extractSectionCode,
  resolveSectionCapstoneMeta,
} from '@/utils/sectionUtils';
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
  const isFacultyRole = ['faculty', 'adviser', 'panelist', 'chair', 'secretary'].includes(role);
  const displayRole = isFacultyRole ? 'faculty' : role;

  return (
    <Badge data-testid="user-role-badge" variant="secondary" className="capitalize text-xs">
      {displayRole}
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
  const [navStudentId, setNavStudentId] = useState('');
  const [sectionStudentFilter, setSectionStudentFilter] = useState('all');
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
  const selectedFolderStudent =
    selectedFolderTeam?.members?.find((member) => member._id === navStudentId) ||
    selectedFolderSection?.students?.find((student) => student._id === navStudentId) ||
    null;

  const canGoBack = Boolean(
    navStudentId || navTeamId || navSectionId || navCourseKey || navAcademicYear,
  );

  useEffect(() => {
    setNavAcademicYear('');
    setNavCourseKey('');
    setNavSectionId('');
    setNavTeamId('');
    setNavStudentId('');
  }, [selectedCourseId, selectedAcademicYear, selectedSectionId]);

  const handleBack = () => {
    if (navStudentId) {
      setNavStudentId('');
      return;
    }
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
              <Select
                value={selectedCourseId}
                onValueChange={(courseId) => {
                  setSelectedCourseId(courseId);
                  setSelectedSectionId('');
                }}
              >
                <SelectTrigger aria-label="Filter by Course" className="min-h-11 text-xs">
                  <SelectValue placeholder="All Courses / Programs" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course._id} value={course._id}>
                      {course.code} — {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Filter by Academic Year</Label>
              <Select
                value={selectedAcademicYear}
                onValueChange={(academicYear) => {
                  setSelectedAcademicYear(academicYear);
                  setSelectedSectionId('');
                }}
              >
                <SelectTrigger aria-label="Filter by Academic Year" className="min-h-11 text-xs">
                  <SelectValue placeholder="All Academic Years" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Filter by Section</Label>
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger aria-label="Filter by Section" className="min-h-11 text-xs">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section._id} value={section._id}>
                      {formatSectionWithCode(section)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hierarchy Navigator</CardTitle>
          <CardDescription>
            Folder-style navigation: Academic Year -&gt; Program -&gt; Section Block (attached with
            Section Code) -&gt; Teams -&gt; Students -&gt; Student Information.
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
                setNavStudentId('');
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
                    setNavStudentId('');
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
                    setNavStudentId('');
                  }}
                >
                  {selectedCourseNode.course?.code || selectedCourseNode.course?.name || 'Program'}
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
                  onClick={() => {
                    setNavTeamId('');
                    setNavStudentId('');
                  }}
                >
                  {formatSectionWithCode(selectedFolderSection)}
                </Button>
              </>
            )}
            {selectedFolderTeam && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setNavStudentId('')}
                >
                  {selectedFolderTeam.name}
                </Button>
              </>
            )}
            {selectedFolderStudent && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                  {[
                    selectedFolderStudent.firstName,
                    selectedFolderStudent.middleName,
                    selectedFolderStudent.lastName,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {!navAcademicYear && 'Select an academic year'}
              {navAcademicYear && !navCourseKey && 'Select a program'}
              {navAcademicYear && navCourseKey && !navSectionId && 'Select a section block'}
              {navAcademicYear &&
                navCourseKey &&
                navSectionId &&
                !navTeamId &&
                !navStudentId &&
                'Select a team or student'}
              {navAcademicYear &&
                navCourseKey &&
                navSectionId &&
                navTeamId &&
                !navStudentId &&
                'Students in Team (click a student to view Student Information)'}
              {navAcademicYear &&
                navCourseKey &&
                navSectionId &&
                navStudentId &&
                'Student Information'}
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
              <Spinner className="size-4" />
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
                  <Button
                    variant="ghost"
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
                  </Button>
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
                  <Button
                    variant="ghost"
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
                  </Button>
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
                .map((section) => {
                  const sectionBlock = formatCanonicalSectionName(
                    section,
                    selectedCourseNode?.course?.code || 'BSIT',
                  );
                  const sectionTCode = extractSectionCode(section);
                  const capstoneMeta = resolveSectionCapstoneMeta(section);

                  return (
                    <Button
                      variant="ghost"
                      key={section._id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/50"
                      onClick={() => {
                        setNavSectionId(section._id);
                        setHierarchySearch('');
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{sectionBlock}</p>
                          <Badge
                            variant="outline"
                            className="font-mono text-[11px] border-primary/40 bg-primary/10 text-primary"
                          >
                            Section Code: {sectionTCode || 'Unassigned'}
                          </Badge>
                          {capstoneMeta?.courseTitle && (
                            <Badge variant="secondary" className="text-[11px]">
                              {capstoneMeta.courseTitle} ({capstoneMeta.curriculumLabel})
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {capstoneMeta?.academicTerm || section.academicTerm || '1st Semester'} •{' '}
                          {section.teamCount} teams | {section.studentCount} students
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  );
                })}
            </div>
          )}

          {!isLoading &&
            navAcademicYear &&
            navCourseKey &&
            navSectionId &&
            !navTeamId &&
            !navStudentId &&
            (() => {
              const teams = selectedFolderSection?.teams || [];
              const allStudents = selectedFolderSection?.students || [];
              const studentToTeamMap = new Map();
              teams.forEach((t) => {
                (t.members || []).forEach((m) => {
                  const mId = (m._id || m).toString();
                  studentToTeamMap.set(mId, t);
                });
              });

              const unassignedStudents = allStudents.filter(
                (s) => !s.teamId && !studentToTeamMap.has(s._id.toString()),
              );

              const filteredTeams = teams.filter(
                (t) =>
                  !hierarchySearch || t.name?.toLowerCase().includes(hierarchySearch.toLowerCase()),
              );

              const filteredStudents = allStudents.filter((s) => {
                const matchesSearch =
                  !hierarchySearch ||
                  `${s.firstName} ${s.lastName} ${s.email} ${s.studentId || ''}`
                    .toLowerCase()
                    .includes(hierarchySearch.toLowerCase());
                if (!matchesSearch) return false;

                const isAssigned = Boolean(s.teamId || studentToTeamMap.has(s._id.toString()));
                if (sectionStudentFilter === 'unassigned') return !isAssigned;
                if (sectionStudentFilter === 'in_team') return isAssigned;
                return true;
              });

              return (
                <div className="space-y-4">
                  {/* Teams Section */}
                  <div className="rounded-md border border-border/60 bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" />
                        Teams in Section ({filteredTeams.length})
                      </p>
                      <span className="text-xs text-muted-foreground">
                        Select a team to inspect its roster
                      </span>
                    </div>

                    <div className="space-y-2">
                      {filteredTeams.map((team) => (
                        <Button
                          variant="ghost"
                          key={team._id}
                          type="button"
                          className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/50"
                          onClick={() => {
                            setNavTeamId(team._id);
                            setNavStudentId('');
                            setHierarchySearch('');
                          }}
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold">{team.name}</p>
                              {team.assignment?.capstonePhase && (
                                <Badge variant="outline" className="text-[10px]">
                                  Capstone {team.assignment.capstonePhase}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {team.members?.length || 0} students
                              {Array.isArray(team.capstoneEnrollments) &&
                                team.capstoneEnrollments.length > 0 && (
                                  <span>
                                    {' '}
                                    • Enrolled:{' '}
                                    {team.capstoneEnrollments
                                      .map(
                                        (enr) =>
                                          `C${enr.capstoneCourse}: ${enr.sectionCode || enr.sectionName}`,
                                      )
                                      .join(' → ')}
                                  </span>
                                )}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      ))}

                      {filteredTeams.length === 0 && (
                        <p className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                          No teams found in this section.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Enrolled & Unassigned Students Section */}
                  <div className="rounded-md border border-border/60 bg-card p-3 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          Students Enrolled in Section ({allStudents.length})
                        </p>
                        <span className="text-xs text-muted-foreground">
                          Click any student (including unassigned) to view Student Information
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={sectionStudentFilter === 'all' ? 'secondary' : 'ghost'}
                          className="h-7 text-xs px-2"
                          onClick={() => setSectionStudentFilter('all')}
                        >
                          All ({allStudents.length})
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={sectionStudentFilter === 'unassigned' ? 'secondary' : 'ghost'}
                          className="h-7 text-xs px-2"
                          onClick={() => setSectionStudentFilter('unassigned')}
                        >
                          Unassigned ({unassignedStudents.length})
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={sectionStudentFilter === 'in_team' ? 'secondary' : 'ghost'}
                          className="h-7 text-xs px-2"
                          onClick={() => setSectionStudentFilter('in_team')}
                        >
                          In Team ({allStudents.length - unassignedStudents.length})
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {filteredStudents.map((student) => {
                        const fullName = [student.firstName, student.middleName, student.lastName]
                          .filter(Boolean)
                          .join(' ');
                        const assignedTeam = studentToTeamMap.get(student._id.toString());
                        return (
                          <Button
                            variant="ghost"
                            key={student._id}
                            type="button"
                            onClick={() => {
                              setNavStudentId(student._id);
                              setHierarchySearch('');
                            }}
                            className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary/60 hover:bg-muted/30"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="font-semibold text-foreground">{fullName}</p>
                                {student.studentId && (
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    ID: {student.studentId}
                                  </span>
                                )}
                              </div>
                              <p className="break-all text-muted-foreground">{student.email}</p>
                              <div className="pt-0.5">
                                {assignedTeam ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1.5 border-primary/40 bg-primary/10 text-primary"
                                  >
                                    Team: {assignedTeam.name}
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                                    Unassigned / No Team
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                          </Button>
                        );
                      })}
                    </div>

                    {filteredStudents.length === 0 && (
                      <p className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                        No students matching current filter in this section.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

          {!isLoading &&
            navAcademicYear &&
            navCourseKey &&
            navSectionId &&
            navTeamId &&
            !navStudentId && (
              <div className="space-y-4">
                <div className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Students in {selectedFolderTeam?.name}</p>
                    <span className="text-xs text-muted-foreground">
                      Select a student to inspect Student Information
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(selectedFolderTeam?.members || [])
                      .filter(
                        (m) =>
                          !hierarchySearch ||
                          `${m.firstName} ${m.lastName} ${m.email} ${m.studentId || ''}`
                            .toLowerCase()
                            .includes(hierarchySearch.toLowerCase()),
                      )
                      .map((member) => {
                        const fullName = [member.firstName, member.middleName, member.lastName]
                          .filter(Boolean)
                          .join(' ');
                        return (
                          <Button
                            variant="ghost"
                            key={member._id}
                            type="button"
                            onClick={() => {
                              setNavStudentId(member._id);
                              setHierarchySearch('');
                            }}
                            className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary/60 hover:bg-muted/30"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="font-semibold text-foreground">{fullName}</p>
                                {member.isLeader && (
                                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                    Leader
                                  </Badge>
                                )}
                                {member.studentId && (
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    ID: {member.studentId}
                                  </span>
                                )}
                              </div>
                              <p className="break-all text-muted-foreground">{member.email}</p>
                              {member.teamRole && (
                                <p className="text-[11px] font-medium text-primary">
                                  {member.teamRole}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                          </Button>
                        );
                      })}
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

          {!isLoading &&
            navAcademicYear &&
            navCourseKey &&
            navSectionId &&
            navStudentId &&
            selectedFolderStudent &&
            (() => {
              const studentFullName = [
                selectedFolderStudent.firstName,
                selectedFolderStudent.middleName,
                selectedFolderStudent.lastName,
              ]
                .filter(Boolean)
                .join(' ');
              const sectionBlock = formatCanonicalSectionName(
                selectedFolderSection,
                selectedCourseNode?.course?.code || 'BSIT',
              );
              const sectionTCode = extractSectionCode(selectedFolderSection);
              const capstoneMeta = resolveSectionCapstoneMeta(
                selectedFolderSection,
                selectedFolderStudent.academicTerm,
              );
              const assignedInstructorName = selectedFolderStudent.instructorId
                ? [
                    selectedFolderStudent.instructorId.firstName,
                    selectedFolderStudent.instructorId.middleName,
                    selectedFolderStudent.instructorId.lastName,
                  ]
                    .filter(Boolean)
                    .join(' ')
                : 'Assigned via Section';
              const studentTeam =
                selectedFolderTeam ||
                selectedFolderSection?.teams?.find((t) =>
                  (t.members || []).some(
                    (m) => (m._id || m).toString() === selectedFolderStudent._id.toString(),
                  ),
                ) ||
                null;
              const teamEnrollments = studentTeam?.capstoneEnrollments || [];

              return (
                <div
                  data-testid="hierarchy-student-info-card"
                  className="space-y-4 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex flex-col justify-between gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-foreground">{studentFullName}</h4>
                        <RoleBadge role={selectedFolderStudent.role || 'student'} />
                        {selectedFolderStudent.isLeader && (
                          <Badge variant="secondary" className="text-[10px]">
                            Team Leader
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedFolderStudent.email}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="self-start font-mono text-xs border-primary/40 bg-primary/10 text-primary sm:self-center"
                    >
                      Section Code: {sectionTCode || 'Unassigned'}
                    </Badge>
                  </div>

                  <div className="grid gap-3 text-xs sm:grid-cols-2 md:grid-cols-3">
                    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-muted-foreground">Student ID</p>
                      <p className="mt-1 font-mono font-semibold text-foreground">
                        {selectedFolderStudent.studentId || 'Not set'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-muted-foreground">Section Block</p>
                      <p className="mt-1 font-semibold text-foreground">{sectionBlock}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-muted-foreground">Section Code (T-Code)</p>
                      <p className="mt-1 font-mono font-semibold text-primary">
                        {sectionTCode || '—'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-muted-foreground">Degree Program</p>
                      <p className="mt-1 font-medium text-foreground">
                        {selectedCourseNode?.course?.code} — {selectedCourseNode?.course?.name}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-muted-foreground">Academic Year &amp; Term</p>
                      <p className="mt-1 font-medium text-foreground">
                        {selectedFolderSection?.academicYear} •{' '}
                        {selectedFolderStudent.academicTerm ||
                          selectedFolderSection?.academicTerm ||
                          '1st Semester'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-muted-foreground">Current Capstone Track</p>
                      <p className="mt-1 font-medium text-foreground">
                        {capstoneMeta?.courseTitle
                          ? `${capstoneMeta.courseTitle} (${capstoneMeta.curriculumLabel})`
                          : capstoneMeta?.curriculumLabel || '—'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-muted-foreground">Team &amp; Role Assignment</p>
                      <p className="mt-1 font-medium text-foreground">
                        {studentTeam?.name ? `${studentTeam.name} • ` : 'Unassigned / No Team • '}
                        {selectedFolderStudent.teamRole ||
                          (selectedFolderStudent.isLeader ? 'Project Lead' : 'Member')}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-muted-foreground">Assigned Instructor</p>
                      <p className="mt-1 font-medium text-foreground">{assignedInstructorName}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-muted-foreground">Account Status</p>
                      <p className="mt-1 font-medium text-foreground">
                        {selectedFolderStudent.isVerified !== false ? 'Verified' : 'Unverified'} •{' '}
                        {selectedFolderStudent.isActive !== false ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>

                  {/* Multi-Semester Capstone 1–3 Progression Track */}
                  <div className="rounded-md border border-border/60 bg-muted/10 p-3">
                    <p className="mb-2 text-xs font-semibold text-foreground">
                      Multi-Semester Capstone Progression (3rd Yr 1st Sem → 3rd Yr 2nd Sem → 4th Yr
                      1st Sem)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[1, 2, 3].map((courseNum) => {
                        const trackMeta = CAPSTONE_CURRICULUM_MAP[courseNum];
                        const enrollment = teamEnrollments.find(
                          (enr) => Number(enr.capstoneCourse) === courseNum,
                        );
                        const isCurrentSectionCourse =
                          Number(capstoneMeta?.capstoneCourse) === courseNum;
                        return (
                          <div
                            key={courseNum}
                            className={cn(
                              'rounded-md border p-2.5 text-xs',
                              isCurrentSectionCourse
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-border/60 bg-background',
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                {trackMeta.courseTitle}
                              </span>
                              <span className="font-mono text-[11px] font-semibold text-primary">
                                {enrollment?.sectionCode ||
                                  (isCurrentSectionCourse ? sectionTCode || 'Current' : 'Pending')}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {trackMeta.curriculumLabel}
                            </p>
                            {enrollment && (
                              <p className="mt-1 text-[11px] text-foreground/80">
                                Block: {enrollment.sectionName} ({enrollment.academicYear})
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
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
  const normalizedRole = ['faculty', 'adviser', 'panelist', 'chair', 'secretary'].includes(
    user.role,
  )
    ? 'faculty'
    : user.role;

  return (
    <div
      data-testid="user-row"
      className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-border/60 bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.02] sm:flex-row sm:items-center"
    >
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
              <Badge variant="warning" className="text-[10px] py-0 px-1.5">
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
          <Select
            value={normalizedRole}
            onValueChange={(role) => onChangeRole(user._id, role)}
            disabled={!user.isActive}
          >
            <SelectTrigger
              aria-label={`Change role for ${fullName}`}
              className="h-9 min-h-9 w-[130px] min-w-0 text-xs font-medium"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIMARY_ROLE_VALUES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {user.isActive ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-warning hover:bg-warning/10 hover:text-warning-foreground"
              onClick={() => onDeactivate(user._id, fullName)}
              aria-label={`Deactivate ${fullName}`}
              title="Deactivate user"
            >
              <Archive className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-success hover:bg-success/10 hover:text-success-foreground"
              onClick={() => onActivate(user._id, fullName)}
              aria-label={`Activate ${fullName}`}
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
            <Select
              value={formData.role}
              onValueChange={(role) => setFormData((previous) => ({ ...previous, role }))}
              disabled={createUser.isPending}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIMARY_ROLE_VALUES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" loading={createUser.isPending} loadingText="Creating...">
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
  const [pendingUserAction, setPendingUserAction] = useState(null);

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

  const handleDeactivate = useCallback((id, name) => {
    setPendingUserAction({ id, name, type: 'deactivate' });
  }, []);

  const handleActivate = useCallback((id, name) => {
    setPendingUserAction({ id, name, type: 'activate' });
  }, []);

  const confirmUserAction = useCallback(() => {
    if (!pendingUserAction) return;
    if (pendingUserAction.type === 'deactivate') {
      deleteUser.mutate(pendingUserAction.id);
    } else {
      activateUser.mutate(pendingUserAction.id);
    }
    setPendingUserAction(null);
  }, [activateUser, deleteUser, pendingUserAction]);

  const userActionPending = deleteUser.isPending || activateUser.isPending;

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search change
  }, []);

  const handleRoleFilter = useCallback((role) => {
    setRoleFilter(role);
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
      <div className="flex-1 space-y-6 lg:space-y-8 max-w-7xl mx-auto min-w-0 w-full">
        {/* Page header */}
        <div className="flex flex-col gap-1 border-b border-border/60 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic structures, user accounts, and access.
          </p>
        </div>

        {/* Primary Sub-Navigation: Horizontal Pill Tabs */}
        <Tabs value={activePanel} onValueChange={setActivePanel} className="space-y-6">
          <TabsList className="bg-muted/40 p-1 border border-border/60 rounded-lg grid grid-cols-2 sm:inline-flex h-auto">
            <TabsTrigger
              value="hierarchy"
              className="min-h-11 min-w-0 gap-2 whitespace-normal text-xs sm:text-sm"
            >
              <FolderTree className="h-3.5 w-3.5" /> Academic Hierarchy
            </TabsTrigger>
            <TabsTrigger
              value="rbac"
              className="min-h-11 min-w-0 gap-2 whitespace-normal text-xs sm:text-sm"
            >
              <Shield className="h-3.5 w-3.5" /> Account Roles
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Academic Hierarchy */}
          <TabsContent value="hierarchy" className="space-y-6 min-w-0 w-full">
            <HierarchyView />
          </TabsContent>

          {/* Tab 2: Account Roles */}
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
                    className="pl-9 min-h-11 text-base sm:text-sm"
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
                  <Select value={roleFilter} onValueChange={handleRoleFilter}>
                    <SelectTrigger
                      id="roleFilter"
                      aria-label="Filter users by role"
                      className="min-h-11 w-full text-xs sm:w-[150px]"
                    >
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIMARY_ROLE_VALUES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Spinner className="size-8 text-primary" />
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
      <AlertDialog
        open={Boolean(pendingUserAction)}
        onOpenChange={(open) => {
          if (!open && !userActionPending) setPendingUserAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingUserAction?.type === 'deactivate' ? 'Deactivate user?' : 'Reactivate user?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              {pendingUserAction?.type === 'deactivate'
                ? `Are you sure you want to deactivate "${pendingUserAction?.name}"?`
                : `Reactivate "${pendingUserAction?.name}"? They will be able to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={userActionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={pendingUserAction?.type === 'deactivate' ? 'destructive' : 'default'}
              onClick={confirmUserAction}
              disabled={userActionPending}
            >
              {pendingUserAction?.type === 'deactivate' ? 'Deactivate user' : 'Reactivate user'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
