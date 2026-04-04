import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { User, Mail, Shield, Camera, Loader2, CheckCircle, GraduationCap } from 'lucide-react';
import { userService } from '@/services/authService';
import { useSections } from '@/hooks/useAcademics';
import { useInstructors } from '@/hooks/useUsers';
import { ROLES } from '@cms/shared';

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

/**
 * ProfilePage — user profile view and edit.
 * Displays name, email, role, and profile picture.
 * Allows editing name and profile picture.
 */

export default function ProfilePage() {
  const { user, fetchUser } = useAuthStore();
  const isStudent = user?.role === ROLES.STUDENT;

  const fileInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');

  // Academic info (students only)
  const [sectionId, setSectionId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);
  const [academicSaveError, setAcademicSaveError] = useState('');
  const [academicSaveSuccess, setAcademicSaveSuccess] = useState(false);

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
      setSectionId(user.sectionId?._id || user.sectionId || '');
      setInstructorId(user.instructorId?._id || user.instructorId || '');
    }
  }, [user]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
    setAvatarError('');
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await userService.uploadAvatar(formData);
      await fetchUser();
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
    const selectedSectionRecord = sections.find((section) => section._id === sectionId);
    const selectedInstructorRecord = instructors.find(
      (instructor) => instructor._id === instructorId,
    );

    const selectedSectionName = selectedSectionRecord?.name || 'Not selected';
    const selectedSectionCode = selectedSectionRecord?.code || 'Not selected';
    const selectedInstructorName = selectedInstructorRecord
      ? [
          selectedInstructorRecord.firstName,
          selectedInstructorRecord.middleName,
          selectedInstructorRecord.lastName,
        ]
          .filter(Boolean)
          .join(' ')
      : 'Not selected';

    const isConfirmed = window.confirm(
      `Please review your academic details:\n\n` +
        `Section: ${selectedSectionName}\n` +
        `Section Code: ${selectedSectionCode}\n` +
        `Instructor: ${selectedInstructorName}\n\n` +
        `Are these details correct and are you sure you want to save?`,
    );

    if (!isConfirmed) {
      return;
    }

    setAcademicSaveError('');
    setAcademicSaveSuccess(false);
    setIsSavingAcademic(true);
    try {
      await userService.updateMe({
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

  // Derive the course code from the selected section
  const selectedSection = sections.find((s) => s._id === sectionId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Profile</h3>
          <p className="text-muted-foreground">View and manage your account information.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile summary card */}
          <Card className="lg:col-span-1">
            <CardContent className="flex flex-col items-center pt-6">
              <div className="relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {initials || '?'}
                  </div>
                )}
                <button
                  type="button"
                  className="absolute bottom-0 right-0 rounded-full border-2 border-background bg-muted p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-50"
                  aria-label="Change profile picture"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
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
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Shield className="h-3 w-3" />
                {roleLabel}
              </div>
            </CardContent>
          </Card>

          {/* Editable details */}
          <Card className="lg:col-span-2">
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
                  <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
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
                  <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
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
                  <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm">{user.lastName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">
                  <span className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    Email Address
                  </span>
                </Label>
                <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
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
                <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {roleLabel}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-3">
              {saveSuccess && (
                <Alert variant="default" className="border-green-500/50 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Profile updated successfully.
                  </AlertDescription>
                </Alert>
              )}
              {saveError && (
                <Alert variant="destructive">
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
              {isEditing ? (
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    Your section and assigned instructor.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Section */}
              <div className="space-y-2">
                <Label htmlFor="profile-section">Section *</Label>
                <select
                  id="profile-section"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  disabled={sectionsLoading || isSavingAcademic}
                >
                  <option value="">
                    {sectionsLoading || sectionsFetching ? 'Loading...' : 'Select your section'}
                  </option>
                  {sections.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.courseId?.code ? `[${s.courseId.code}] ` : ''}
                      {s.name}
                      {s.code ? ` - ${s.code}` : ''} ({s.academicYear})
                    </option>
                  ))}
                </select>
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
                        {sectionsFetching && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
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
                      No active sections are available. Ask an instructor to create or activate a
                      section.
                    </p>
                  )}
              </div>

              {/* Section Code (read-only, from section's own code) */}
              <div className="space-y-2">
                <Label>Section Code</Label>
                <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {selectedSection?.code || '—'}
                </p>
              </div>

              {/* Instructor */}
              <div className="space-y-2">
                <Label htmlFor="profile-instructor">Instructor *</Label>
                <select
                  id="profile-instructor"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
                  value={instructorId}
                  onChange={(e) => setInstructorId(e.target.value)}
                  disabled={instructorsLoading || isSavingAcademic}
                >
                  <option value="">
                    {instructorsLoading || instructorsFetching
                      ? 'Loading...'
                      : 'Select your instructor'}
                  </option>
                  {instructors.map((ins) => (
                    <option key={ins._id} value={ins._id}>
                      {[ins.firstName, ins.middleName, ins.lastName].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
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
                        {instructorsFetching && (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
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
                <Alert variant="default" className="border-green-500/50 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Academic info saved successfully.
                  </AlertDescription>
                </Alert>
              )}
              {academicSaveError && (
                <Alert variant="destructive">
                  <AlertDescription>{academicSaveError}</AlertDescription>
                </Alert>
              )}
              <Button
                onClick={handleSaveAcademic}
                disabled={isSavingAcademic || (!sectionId && !instructorId)}
              >
                {isSavingAcademic && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Academic Info
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
