import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { User, Mail, Shield, Camera, GraduationCap } from 'lucide-react';
import { userService } from '@/services/authService';
import { useSections } from '@/hooks/useAcademics';
import {
  formatCanonicalSectionName,
  formatSectionWithCode,
  extractSectionCode,
  resolveSectionCapstoneMeta,
} from '@/utils/sectionUtils';
import { useInstructors } from '@/hooks/useUsers';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { ROLES, ACADEMIC_TERMS, CAPSTONE_CURRICULUM_MAP } from '@cms/shared';
import { toast } from 'sonner';

const shouldRetryAcademicLookup = (failureCount, error) => {
  const status = error?.response?.status;

  // 401/403 need user action (re-auth/permissions), not blind retries.
  if (status === 401 || status === 403) {
    return false;
  }

  return failureCount < 2;
};

const getAcademicLookupErrorMessage = (error, fallbackMessage) => {
  const apiMessage = error?.response?.data?.error?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
    return apiMessage;
  }

  if (error?.response?.status === 401) {
    return 'Your session expired. Please sign in again.';
  }

  if (error?.response?.status === 403) {
    return 'You do not have permission to load this academic data.';
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  return fallbackMessage;
};

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * ProfilePage — user profile view and edit.
 * Displays name, email, role, and profile picture.
 * Allows editing name and profile picture.
 */

export default function ProfilePage() {
  const { user, fetchUser } = useAuthStore();
  const isStudent = user?.role === ROLES.STUDENT;
  const isInstructor = user?.role === ROLES.INSTRUCTOR;

  const fileInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarBroken, setAvatarBroken] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');

  // Academic info (students only)
  const [studentId, setStudentId] = useState('');
  const [academicTerm, setAcademicTerm] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);
  const [academicSaveError, setAcademicSaveError] = useState('');
  const [academicSaveSuccess, setAcademicSaveSuccess] = useState(false);
  const [plagiarismThreshold, setPlagiarismThreshold] = useState(75);

  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const {
    data: sections = [],
    isLoading: sectionsLoading,
    isFetching: sectionsFetching,
    isError: sectionsError,
    error: sectionsQueryError,
    refetch: refetchSections,
  } = useSections(
    {},
    {
      enabled: isStudent,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: true,
      retry: shouldRetryAcademicLookup,
    },
  );
  const {
    data: instructors = [],
    isLoading: instructorsLoading,
    isFetching: instructorsFetching,
    isError: instructorsError,
    error: instructorsQueryError,
    refetch: refetchInstructors,
  } = useInstructors({
    enabled: isStudent,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
    retry: shouldRetryAcademicLookup,
  });

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setMiddleName(user.middleName || '');
      setLastName(user.lastName || '');
      setStudentId(user.studentId || '');
      setAcademicTerm(user.academicTerm || '');
      setSectionId(user.sectionId?._id || user.sectionId || '');
      setInstructorId(user.instructorId?._id || user.instructorId || '');
    }
  }, [user]);

  // Reset broken-avatar state when URL changes (e.g. after re-upload)
  useEffect(() => {
    setAvatarBroken(false);
  }, [user?.avatarUrl]);

  useEffect(() => {
    if (isInstructor && settings?.plagiarismThreshold !== undefined) {
      setPlagiarismThreshold(settings.plagiarismThreshold);
    }
  }, [isInstructor, settings]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const initials =
    [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const roleLabel = user.role?.charAt(0).toUpperCase() + user.role?.slice(1);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError('File size exceeds the 5MB limit for avatars.');
      e.target.value = '';
      return;
    }

    if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
      setAvatarError('Only JPEG, PNG, and WEBP images are allowed for avatars.');
      e.target.value = '';
      return;
    }

    setAvatarError('');
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await userService.uploadAvatar(formData);
      setAvatarBroken(false);
      await fetchUser();
      toast.success('Profile picture updated successfully!');
    } catch (err) {
      setAvatarError(err?.response?.data?.error?.message || 'Failed to upload avatar.');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      await userService.updateMe({ firstName, middleName, lastName });
      await fetchUser(); // Refresh global user state
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err?.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAcademic = async () => {
    setAcademicSaveError('');
    setAcademicSaveSuccess(false);
    setIsSavingAcademic(true);
    try {
      await userService.updateMe({
        studentId: studentId.trim(),
        academicTerm: academicTerm || null,
        sectionId: sectionId || null,
        instructorId: instructorId || null,
      });
      await fetchUser();
      setAcademicSaveSuccess(true);
      setTimeout(() => setAcademicSaveSuccess(false), 3000);
    } catch (err) {
      setAcademicSaveError(err?.response?.data?.error?.message || 'Failed to save academic info.');
    } finally {
      setIsSavingAcademic(false);
    }
  };

  const handleSavePlagiarismThreshold = async () => {
    if (!isInstructor) return;
    if (plagiarismThreshold < 0 || plagiarismThreshold > 100) {
      toast.error('Plagiarism threshold must be between 0 and 100.');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        plagiarismThreshold: Number(plagiarismThreshold),
      });
      toast.success('Plagiarism threshold updated.');
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.message || 'Failed to update plagiarism threshold.',
      );
    }
  };

  // Derive the course code from the selected section
  const selectedSection = sections.find((s) => s._id === sectionId) || user?.sectionId || null;
  const selectedSectionBlock = selectedSection ? formatCanonicalSectionName(selectedSection) : '';
  const selectedSectionTCode = selectedSection ? extractSectionCode(selectedSection) : '';
  const selectedCapstoneMeta = selectedSection
    ? resolveSectionCapstoneMeta(selectedSection, academicTerm)
    : null;
  const teamEnrollments = Array.isArray(user?.teamId?.capstoneEnrollments)
    ? user.teamId.capstoneEnrollments
    : [];

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
          <p className="text-muted-foreground">View and manage your account information.</p>
        </div>

        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-3 xl:gap-8">
          {/* Profile summary card */}
          <Card className="min-w-0 xl:col-span-1">
            <CardContent className="flex flex-col items-center pt-6">
              <div className="relative">
                {user.avatarUrl && !avatarBroken ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName || 'User avatar'}
                    data-testid="profile-avatar-img"
                    className="h-24 w-24 rounded-full object-cover"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {initials || '?'}
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-0 right-0 size-9 min-h-9 min-w-9 rounded-full border-2 border-background p-0"
                  aria-label="Change profile picture"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
              </div>
              {avatarError && <p className="mt-1 text-xs text-destructive">{avatarError}</p>}
              <h4 className="mt-4 text-lg font-semibold">{user.fullName}</h4>
              <p className="max-w-full break-words text-center text-sm text-muted-foreground">
                {user.email}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Shield className="h-3 w-3" />
                {roleLabel}
              </div>
            </CardContent>
          </Card>

          {/* Editable details */}
          <Card className="min-w-0 xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-firstName">
                  <span className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    First Name
                  </span>
                </Label>
                {isEditing ? (
                  <Input
                    id="profile-firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                ) : (
                  <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                    {user.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-middleName">
                  <span className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Middle Name <span className="text-muted-foreground">(optional)</span>
                  </span>
                </Label>
                {isEditing ? (
                  <Input
                    id="profile-middleName"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                  />
                ) : (
                  <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                    {user.middleName || '—'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-lastName">
                  <span className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Last Name
                  </span>
                </Label>
                {isEditing ? (
                  <Input
                    id="profile-lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                ) : (
                  <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                    {user.lastName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">
                  <span className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    Email Address
                  </span>
                </Label>
                <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {user.email}
                  <span className="ml-2 text-xs">(cannot be changed)</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  <span className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5" />
                    Role
                  </span>
                </Label>
                <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {roleLabel}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-3">
              {saveSuccess && (
                <Alert variant="success">
                  <AlertDescription>Profile updated successfully.</AlertDescription>
                </Alert>
              )}
              {saveError && (
                <Alert variant="destructive">
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
              {isEditing ? (
                <div className="flex gap-2">
                  <Button onClick={handleSave} loading={isSaving} loadingText="Saving...">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Instructor threshold controls */}
        {isInstructor && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plagiarism Threshold</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set the minimum originality percentage required for plagiarism checks.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="profile-plagiarism-threshold">Minimum Originality Threshold</Label>
                <span className="text-sm font-medium tabular-nums">{plagiarismThreshold}%</span>
              </div>
              <Input
                id="profile-plagiarism-threshold"
                type="range"
                min={0}
                max={100}
                step={1}
                value={plagiarismThreshold}
                onChange={(event) => setPlagiarismThreshold(Number(event.target.value))}
                className="h-2 cursor-pointer accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Submissions below this originality score are treated as failing plagiarism criteria.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSavePlagiarismThreshold}
                loading={updateSettings.isPending}
                loadingText="Saving..."
              >
                Save Threshold
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Academic Info — students only */}
        {isStudent && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-muted p-2 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Academic Info</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Your Student ID, academic term, year & section, and assigned instructor.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-student-id">Student ID *</Label>
                <Input
                  id="profile-student-id"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  maxLength={32}
                  autoComplete="off"
                  disabled={isSavingAcademic}
                  placeholder="Enter your institutional Student ID"
                />
              </div>

              {/* Section */}
              <div className="space-y-2">
                <Label htmlFor="profile-section">Year and Section *</Label>
                <Select
                  value={sectionId}
                  onValueChange={(nextId) => {
                    setSectionId(nextId);
                    const matchedSec = sections.find((s) => s._id === nextId);
                    if (matchedSec?.academicTerm) {
                      setAcademicTerm(matchedSec.academicTerm);
                    }
                  }}
                  disabled={sectionsLoading || isSavingAcademic}
                >
                  <SelectTrigger id="profile-section" aria-invalid={Boolean(sectionsError)}>
                    <SelectValue
                      placeholder={
                        sectionsLoading || sectionsFetching
                          ? 'Loading...'
                          : 'Select your year and section'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => {
                      const secMeta = resolveSectionCapstoneMeta(s);
                      const termTag = secMeta?.courseTitle
                        ? ` — ${secMeta.courseTitle} (${secMeta.curriculumLabel})`
                        : s.academicTerm
                          ? ` — ${s.academicTerm}`
                          : '';
                      return (
                        <SelectItem key={s._id} value={s._id}>
                          {formatSectionWithCode(s)}
                          {termTag} {s.academicYear ? `(${s.academicYear})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {sectionsError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription className="flex items-center justify-between gap-3">
                      <span>
                        {getAcademicLookupErrorMessage(
                          sectionsQueryError,
                          'Failed to load sections.',
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetchSections()}
                        disabled={sectionsFetching || isSavingAcademic}
                      >
                        {sectionsFetching && <Spinner className="size-3.5" />}
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {!sectionsError &&
                  !sectionsLoading &&
                  !sectionsFetching &&
                  sections.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No active year and sections are available. Ask an instructor to create or
                      activate a section.
                    </p>
                  )}
              </div>

              {/* Section Block vs Section Code (T-Code) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Section Block</Label>
                  <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
                    {selectedSectionBlock || '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Section Code (T-Code)</Label>
                  <p className="rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-sm font-semibold text-primary">
                    {selectedSectionTCode || '—'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Degree Program</Label>
                  <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    {selectedSection?.courseId?.name || selectedSection?.courseId?.code || '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-academic-term">Academic Term *</Label>
                  <Select
                    value={academicTerm}
                    onValueChange={setAcademicTerm}
                    disabled={isSavingAcademic}
                  >
                    <SelectTrigger id="profile-academic-term">
                      <SelectValue placeholder="Select your academic term" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ACADEMIC_TERMS).map((term) => (
                        <SelectItem key={term} value={term}>
                          {term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    {selectedSection?.academicYear || '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Active Capstone Track</Label>
                  <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
                    {selectedCapstoneMeta?.courseTitle
                      ? `${selectedCapstoneMeta.courseTitle} (${selectedCapstoneMeta.curriculumLabel})`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Multi-Semester Capstone 1–3 Progression Overview */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">
                    BukSU Multi-Semester Capstone Progression
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    Each Capstone course has its own Semester &amp; Section Code (e.g. T65)
                  </span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {[1, 2, 3].map((courseNum) => {
                    const track = CAPSTONE_CURRICULUM_MAP[courseNum];
                    const enrolled = teamEnrollments.find(
                      (enr) => Number(enr.capstoneCourse) === courseNum,
                    );
                    const isActiveCourse =
                      Number(selectedCapstoneMeta?.capstoneCourse) === courseNum;
                    return (
                      <div
                        key={courseNum}
                        className={`rounded-md border p-2.5 text-xs ${
                          isActiveCourse
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border/60 bg-background'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-foreground">{track.courseTitle}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                            {enrolled?.sectionCode ||
                              (isActiveCourse ? selectedSectionTCode || 'Active' : 'Upcoming')}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {track.curriculumLabel}
                        </p>
                        {(enrolled?.sectionName || (isActiveCourse && selectedSectionBlock)) && (
                          <p className="mt-0.5 text-[11px] font-medium text-foreground/80">
                            Block:{' '}
                            {enrolled?.sectionName
                              ? formatCanonicalSectionName(enrolled.sectionName)
                              : selectedSectionBlock}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instructor */}
              <div className="space-y-2">
                <Label htmlFor="profile-instructor">Instructor *</Label>
                <Select
                  value={instructorId}
                  onValueChange={setInstructorId}
                  disabled={instructorsLoading || isSavingAcademic}
                >
                  <SelectTrigger id="profile-instructor" aria-invalid={Boolean(instructorsError)}>
                    <SelectValue
                      placeholder={
                        instructorsLoading || instructorsFetching
                          ? 'Loading...'
                          : 'Select your instructor'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map((ins) => (
                      <SelectItem key={ins._id} value={ins._id}>
                        {[ins.firstName, ins.middleName, ins.lastName].filter(Boolean).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {instructorsError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription className="flex items-center justify-between gap-3">
                      <span>
                        {getAcademicLookupErrorMessage(
                          instructorsQueryError,
                          'Failed to load instructors.',
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetchInstructors()}
                        disabled={instructorsFetching || isSavingAcademic}
                      >
                        {instructorsFetching && <Spinner className="size-3.5" />}
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {!instructorsError &&
                  !instructorsLoading &&
                  !instructorsFetching &&
                  instructors.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No active instructors are available. Ask your admin to activate at least one
                      instructor account.
                    </p>
                  )}
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-3">
              {academicSaveSuccess && (
                <Alert variant="success">
                  <AlertDescription>Academic info saved successfully.</AlertDescription>
                </Alert>
              )}
              {academicSaveError && (
                <Alert variant="destructive">
                  <AlertDescription>{academicSaveError}</AlertDescription>
                </Alert>
              )}
              <Button
                onClick={handleSaveAcademic}
                loading={isSavingAcademic}
                loadingText="Saving..."
                disabled={
                  isSavingAcademic ||
                  !studentId.trim() ||
                  !academicTerm ||
                  !sectionId ||
                  !instructorId
                }
              >
                Save Academic Info
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
