import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { User, Mail, Shield, Camera, Loader2, CheckCircle } from 'lucide-react';
import { userService } from '@/services/authService';

/**
 * ProfilePage — user profile view and edit.
 * Displays name, email, role, and profile picture.
 * Allows editing name and profile picture.
 */

export default function ProfilePage() {
  const { user, fetchUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setMiddleName(user.middleName || '');
      setLastName(user.lastName || '');
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
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {initials || '?'}
                </div>
                <button
                  className="absolute bottom-0 right-0 rounded-full border-2 border-background bg-muted p-1.5 text-muted-foreground hover:bg-accent"
                  aria-label="Change profile picture"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
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
      </div>
    </DashboardLayout>
  );
}
