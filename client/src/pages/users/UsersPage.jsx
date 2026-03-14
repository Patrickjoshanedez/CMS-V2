import { useState, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
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
} from 'lucide-react';
import { ROLES, ROLE_VALUES } from '@cms/shared';
import { useAuthStore } from '@/stores/authStore';
import { useUsers, useCreateUser, useChangeRole, useDeleteUser } from '@/hooks/useUsers';
import {
  useAcademicHierarchy,
  useAcademicYears,
  useCourses,
  useCreateCourse,
  useCreateSection,
  useSections,
} from '@/hooks/useAcademics';
import { toast } from 'sonner';

/**
 * UsersPage — Instructor-only student and RBAC management page.
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

function HierarchyView() {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [sectionName, setSectionName] = useState('');

  const { data: courses = [] } = useCourses();
  const { data: years = [] } = useAcademicYears();
  const { data: sections = [] } = useSections(
    {
      courseId: selectedCourseId || undefined,
      academicYear: selectedAcademicYear || undefined,
    },
    { enabled: Boolean(selectedCourseId || selectedAcademicYear) },
  );

  const { data: hierarchy = [], isLoading } = useAcademicHierarchy(
    {
      courseId: selectedCourseId || undefined,
      academicYear: selectedAcademicYear || undefined,
      sectionId: selectedSectionId || undefined,
    },
    { enabled: Boolean(selectedCourseId || selectedAcademicYear || selectedSectionId) },
  );

  const createCourse = useCreateCourse({
    onSuccess: () => {
      toast.success('Course created successfully.');
      setCourseName('');
      setCourseCode('');
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to create course.'),
  });

  const createSection = useCreateSection({
    onSuccess: () => {
      toast.success('Section created successfully.');
      setSectionName('');
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to create section.'),
  });

  const selectedCourse = courses.find((course) => course._id === selectedCourseId);
  const selectedSection = sections.find((section) => section._id === selectedSectionId);

  const onCreateCourse = (event) => {
    event.preventDefault();
    createCourse.mutate({ name: courseName.trim(), code: courseCode.trim() });
  };

  const onCreateSection = (event) => {
    event.preventDefault();
    createSection.mutate({
      name: sectionName.trim(),
      courseId: selectedCourseId,
      academicYear: selectedAcademicYear,
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
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
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

            <form onSubmit={onCreateSection} className="space-y-2 rounded-md border p-3">
              <Label className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4" />
                Add Section
              </Label>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="BSIT-3C"
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
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
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
                disabled={createSection.isPending || !selectedCourseId || !selectedAcademicYear}
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
          <CardTitle>Teams and Student Members</CardTitle>
          <CardDescription>
            Hover rows for quick details. Active selection stays visible via breadcrumb.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading hierarchy...
            </div>
          )}

          {!isLoading && hierarchy.length === 0 && (
            <p className="text-sm text-muted-foreground">No sections matched your filters yet.</p>
          )}

          {!isLoading &&
            hierarchy.map((section) => (
              <div key={section._id} className="rounded-md border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{section.courseId?.code}</Badge>
                  <span className="text-sm font-semibold">{section.name}</span>
                  <span className="text-xs text-muted-foreground">{section.academicYear}</span>
                  <span className="text-xs text-muted-foreground">
                    {section.teamCount} teams | {section.studentCount} students
                  </span>
                </div>

                <div className="space-y-2">
                  {(section.teams || []).map((team) => (
                    <div key={team._id} className="rounded-md border bg-muted/30 p-2">
                      <p className="text-sm font-medium">{team.name}</p>
                      <div className="mt-1 grid gap-1 sm:grid-cols-2">
                        {(team.members || []).map((member) => (
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
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
    <div className="flex items-center justify-between gap-4 rounded-md border p-4 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{fullName || 'Unnamed'}</p>
          <RoleBadge role={user.role} />
          {!user.isActive && (
            <Badge variant="destructive" className="text-xs">
              Inactive
            </Badge>
          )}
          {!user.isVerified && (
            <Badge variant="outline" className="text-xs">
              Unverified
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        {user.teamId && (
          <p className="text-xs text-muted-foreground">Team: {user.teamId.name || user.teamId}</p>
        )}
      </div>

      {!isSelf && (
        <div className="flex shrink-0 items-center gap-2">
          {/* Role change dropdown */}
          <select
            aria-label={`Change role for ${fullName}`}
            className="h-8 rounded-md border bg-background px-2 text-xs"
            value={user.role}
            onChange={(e) => onChangeRole(user._id, e.target.value)}
          >
            {ROLE_VALUES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Deactivate button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
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
      toast.success('Student created successfully!');
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
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to create student.'),
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
        <CardTitle className="text-base">Create a New Student</CardTitle>
        <CardDescription>
          The student will be pre-verified and can log in immediately.
        </CardDescription>
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
              Create Student
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
        Page {pagination.page} of {pagination.pages} ({pagination.total} students)
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
          <p className="text-sm text-muted-foreground">Only Instructors can manage students.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header + section switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Student Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage hierarchy (Course {'>'} Year {'>'} Section {'>'} Teams {'>'} Students) and
              RBAC.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-1">
            <Button
              type="button"
              size="sm"
              variant={activePanel === 'hierarchy' ? 'default' : 'ghost'}
              onClick={() => setActivePanel('hierarchy')}
            >
              Hierarchy
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activePanel === 'rbac' ? 'default' : 'ghost'}
              onClick={() => setActivePanel('rbac')}
            >
              RBAC
            </Button>
          </div>
        </div>

        {activePanel === 'hierarchy' && <HierarchyView />}

        {activePanel === 'rbac' && (
          <>
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateForm((prev) => !prev)}>
                <UserPlus className="mr-2 h-4 w-4" />
                {showCreateForm ? 'Cancel' : 'New Student'}
              </Button>
            </div>

            {/* Create student form */}
            {showCreateForm && <CreateUserForm onCancel={() => setShowCreateForm(false)} />}

            {/* Filters */}
            <Card>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="search" className="text-xs text-muted-foreground">
                    Search
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
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
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
                  {error?.response?.data?.error?.message || 'Failed to load students.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Empty state */}
            {!isLoading && !isError && users.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No students found</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {search || roleFilter
                    ? 'Try adjusting your filters.'
                    : 'Start by creating a new student.'}
                </p>
              </div>
            )}

            {/* Student list with RBAC controls */}
            {!isLoading && !isError && users.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Students and Roles</CardTitle>
                  <CardDescription>
                    Showing {users.length} of {pagination.total || 0} students
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {users.map((user) => (
                    <UserRow
                      key={user._id}
                      user={user}
                      currentUserId={currentUser?._id}
                      onChangeRole={handleChangeRole}
                      onDeactivate={handleDeactivate}
                    />
                  ))}
                  <Pagination pagination={pagination} onPageChange={setPage} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
