import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Palette, Bell, Shield, Info, Loader2, CheckCircle, Eye, EyeOff,
  Settings2, Save, RotateCcw,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { ROLES } from '@cms/shared';
import { toast } from 'sonner';

/**
 * SettingsPage — application settings for the current user.
 * Includes theme, notification preferences, account, and instructor-only system administration sections.
 */

function SettingSection({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-muted p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Settings</h3>
          <p className="text-muted-foreground">Manage your application preferences.</p>
        </div>

        <div className="grid gap-6">
          {/* Appearance */}
          <SettingSection
            icon={Palette}
            title="Appearance"
            description="Customize how the application looks."
          >
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">
                  Toggle between light, dark, or system theme.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </SettingSection>

          {/* Notifications */}
          <SettingSection
            icon={Bell}
            title="Notifications"
            description="Configure how you receive notifications."
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive updates about submissions and approvals via email.
                  </p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">Coming soon</span>
              </div>
              <div className="flex items-center justify-between rounded-md border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">In-App Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Show real-time notifications within the application.
                  </p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">Coming soon</span>
              </div>
            </div>
          </SettingSection>

          {/* Security */}
          <SettingSection
            icon={Shield}
            title="Security"
            description="Manage your account security."
          >
            <ChangePasswordForm />
          </SettingSection>

          {/* System Administration — Instructor only */}
          {user.role === ROLES.INSTRUCTOR && (
            <SettingSection
              icon={Settings2}
              title="System Administration"
              description="Configure system-wide thresholds and announcements."
            >
              <SystemSettingsForm />
            </SettingSection>
          )}

          {/* About */}
          <SettingSection icon={Info} title="About" description="System information.">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">0.9.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <span className="font-medium">Development</span>
              </div>
            </div>
          </SettingSection>
        </div>
      </div>
    </DashboardLayout>
  );
}

/**
 * ChangePasswordForm — inline form for updating the user password.
 * Validates confirm-password match on the client before calling the API.
 */
function ChangePasswordForm() {
  const [show, setShow] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      resetForm();
      setShow(false);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) {
    return (
      <div className="space-y-3">
        {success && (
          <Alert variant="default" className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Password changed successfully.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex items-center justify-between rounded-md border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Change Password</p>
            <p className="text-xs text-muted-foreground">Update your account password.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShow(true)}>
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCurrent(!showCurrent)}
            tabIndex={-1}
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowNew(!showNew)}
            tabIndex={-1}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          At least 8 characters with uppercase, lowercase, and a number.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Password
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm();
            setShow(false);
          }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * SystemSettingsForm — instructor-only form for managing system-wide settings.
 * Covers plagiarism threshold, title similarity, max file size, and system announcement.
 */
function SystemSettingsForm() {
  const { data: settings, isLoading, isError } = useSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState({
    plagiarismThreshold: 75,
    titleSimilarityThreshold: 0.65,
    maxFileSize: 25,
    systemAnnouncement: '',
  });
  const [dirty, setDirty] = useState(false);

  // Sync form when settings load
  useEffect(() => {
    if (settings) {
      setForm({
        plagiarismThreshold: settings.plagiarismThreshold ?? 75,
        titleSimilarityThreshold: settings.titleSimilarityThreshold ?? 0.65,
        maxFileSize: settings.maxFileSize ? Math.round(settings.maxFileSize / (1024 * 1024)) : 25,
        systemAnnouncement: settings.systemAnnouncement ?? '',
      });
      setDirty(false);
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleReset = () => {
    if (settings) {
      setForm({
        plagiarismThreshold: settings.plagiarismThreshold ?? 75,
        titleSimilarityThreshold: settings.titleSimilarityThreshold ?? 0.65,
        maxFileSize: settings.maxFileSize ? Math.round(settings.maxFileSize / (1024 * 1024)) : 25,
        systemAnnouncement: settings.systemAnnouncement ?? '',
      });
      setDirty(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (form.plagiarismThreshold < 0 || form.plagiarismThreshold > 100) {
      toast.error('Plagiarism threshold must be between 0 and 100.');
      return;
    }
    if (form.titleSimilarityThreshold < 0 || form.titleSimilarityThreshold > 1) {
      toast.error('Title similarity threshold must be between 0 and 1.');
      return;
    }
    if (form.maxFileSize < 1 || form.maxFileSize > 100) {
      toast.error('Max file size must be between 1 and 100 MB.');
      return;
    }
    if (form.systemAnnouncement.length > 500) {
      toast.error('System announcement must be 500 characters or less.');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        plagiarismThreshold: Number(form.plagiarismThreshold),
        titleSimilarityThreshold: Number(form.titleSimilarityThreshold),
        maxFileSize: Number(form.maxFileSize) * 1024 * 1024,
        systemAnnouncement: form.systemAnnouncement.trim(),
      });
      toast.success('System settings updated successfully.');
      setDirty(false);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to update settings.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load system settings. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Plagiarism Threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="plagiarismThreshold">Minimum Originality Threshold</Label>
          <span className="text-sm font-medium tabular-nums">{form.plagiarismThreshold}%</span>
        </div>
        <Input
          id="plagiarismThreshold"
          type="range"
          min={0}
          max={100}
          step={1}
          value={form.plagiarismThreshold}
          onChange={(e) => handleChange('plagiarismThreshold', Number(e.target.value))}
          className="h-2 cursor-pointer accent-primary"
        />
        <p className="text-xs text-muted-foreground">
          Submissions must meet this originality percentage to pass the plagiarism check during archival.
        </p>
      </div>

      {/* Title Similarity Threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="titleSimilarityThreshold">Title Similarity Threshold</Label>
          <span className="text-sm font-medium tabular-nums">
            {(form.titleSimilarityThreshold * 100).toFixed(0)}%
          </span>
        </div>
        <Input
          id="titleSimilarityThreshold"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={form.titleSimilarityThreshold}
          onChange={(e) => handleChange('titleSimilarityThreshold', Number(e.target.value))}
          className="h-2 cursor-pointer accent-primary"
        />
        <p className="text-xs text-muted-foreground">
          Proposed titles exceeding this similarity score will trigger a duplicate warning.
        </p>
      </div>

      {/* Max File Size */}
      <div className="space-y-2">
        <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
        <Input
          id="maxFileSize"
          type="number"
          min={1}
          max={100}
          value={form.maxFileSize}
          onChange={(e) => handleChange('maxFileSize', Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          Maximum allowed file size for chapter uploads and final submissions.
        </p>
      </div>

      {/* System Announcement */}
      <div className="space-y-2">
        <Label htmlFor="systemAnnouncement">System Announcement</Label>
        <Textarea
          id="systemAnnouncement"
          placeholder="Enter a brief system-wide announcement (optional)..."
          maxLength={500}
          rows={3}
          value={form.systemAnnouncement}
          onChange={(e) => handleChange('systemAnnouncement', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {form.systemAnnouncement.length}/500 characters. Visible to all users on the dashboard.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={updateSettings.isPending || !dirty}>
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={updateSettings.isPending || !dirty}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </form>
  );
}
