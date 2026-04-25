import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/components/ThemeProvider';
import {
  Palette,
  Bell,
  Shield,
  Info,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff,
  Settings2,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { ROLES } from '@cms/shared';
import { toast } from 'sonner';

/* ────────── Shared Layout Components ────────── */

function SettingSection({ icon: Icon, title, description, children, badge }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{title}</CardTitle>
              {badge && (
                <Badge variant="outline" className="text-[10px] font-medium">
                  {badge}
                </Badge>
              )}
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ────────── Navigation Tabs ────────── */

const BASE_TABS = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'about', label: 'About', icon: Info },
];

const ADMIN_TABS = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'administration', label: 'Administration', icon: Settings2 },
  { id: 'about', label: 'About', icon: Info },
];

/* ────────── Theme Selector ────────── */

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const options = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Classic bright interface',
      preview: 'bg-white border-gray-200',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Easier on the eyes',
      preview: 'bg-zinc-900 border-zinc-700',
    },
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Follow OS preference',
      preview: 'bg-gradient-to-br from-white to-zinc-900 border-gray-300 dark:border-zinc-600',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {options.map((opt) => {
        const isSelected = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={[
              'group relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-center transition-all duration-200',
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                : 'border-border hover:border-primary/40 hover:bg-accent/50',
            ].join(' ')}
          >
            {/* Preview swatch */}
            <div
              className={[
                'h-12 w-full rounded-lg border transition-transform duration-200 group-hover:scale-[1.02]',
                opt.preview,
              ].join(' ')}
            />
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <opt.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.description}</p>
            </div>
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CheckCircle className="h-3.5 w-3.5" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ────────── Appearance Section ────────── */

function AppearanceSection() {
  return (
    <SettingSection
      icon={Palette}
      title="Appearance"
      description="Customize how the application looks and feels."
    >
      <div className="space-y-4">
        <div>
          <Label className="mb-3 block text-sm font-medium">Theme</Label>
          <ThemeSelector />
        </div>
      </div>
    </SettingSection>
  );
}

/* ────────── Change Password Section ────────── */

function SecuritySection() {
  return (
    <SettingSection
      icon={Shield}
      title="Security"
      description="Manage your account security and authentication."
    >
      <div className="space-y-3">
        <ChangePasswordForm />
        <SettingRow
          label="Two-Factor Authentication"
          description="Add an extra layer of security to your account."
        >
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Coming soon
          </Badge>
        </SettingRow>
        <SettingRow
          label="Active Sessions"
          description="Manage devices currently logged into your account."
        >
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Coming soon
          </Badge>
        </SettingRow>
      </div>
    </SettingSection>
  );
}

function ChangePasswordForm() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuthState = useAuthStore((state) => state.clearAuthState);
  const [show, setShow] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isGoogleOnly = user?.authProvider === 'google' && !user?.password;

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
      const response = await authService.changePassword({ currentPassword, newPassword });
      const responseData = response?.data || {};
      setSuccess(true);
      resetForm();
      setShow(false);
      clearAuthState();
      toast.success(responseData?.message || 'Password changed successfully. Please log in again.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isGoogleOnly) {
    return (
      <SettingRow
        label="Change Password"
        description="Your account uses Google sign-in. Password change is not available."
      >
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Google Account
        </Badge>
      </SettingRow>
    );
  }

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
        <SettingRow label="Change Password" description="Update your account password.">
          <Button variant="outline" size="sm" onClick={() => setShow(true)}>
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Change
          </Button>
        </SettingRow>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Lock className="h-4 w-4 text-primary" />
        Change Password
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="settings-currentPassword">Current Password</Label>
        <div className="relative">
          <Input
            id="settings-currentPassword"
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
        <Label htmlFor="settings-newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="settings-newPassword"
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
        <Label htmlFor="settings-confirmPassword">Confirm New Password</Label>
        <Input
          id="settings-confirmPassword"
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

/* ────────── Notifications Section ────────── */

function NotificationsSection() {
  return (
    <SettingSection
      icon={Bell}
      title="Notifications"
      description="Configure how you receive notifications."
    >
      <div className="space-y-3">
        <SettingRow
          label="Email Notifications"
          description="Receive updates about submissions and approvals via email."
        >
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Coming soon
          </Badge>
        </SettingRow>
        <SettingRow
          label="In-App Notifications"
          description="Show real-time notifications within the application."
        >
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Coming soon
          </Badge>
        </SettingRow>
        <SettingRow
          label="Submission Reminders"
          description="Get reminded about upcoming deadlines and pending reviews."
        >
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Coming soon
          </Badge>
        </SettingRow>
      </div>
    </SettingSection>
  );
}

/* ────────── About Section ────────── */

function AboutSection() {
  const user = useAuthStore((s) => s.user);
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown';

  return (
    <SettingSection icon={Info} title="About" description="System information and account details.">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Version
            </p>
            <p className="mt-1 text-sm font-semibold">1.0.0</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Environment
            </p>
            <p className="mt-1 text-sm font-semibold">
              {import.meta.env.MODE === 'production' ? 'Production' : 'Development'}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Your Role
            </p>
            <p className="mt-1 text-sm font-semibold">{roleLabel}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Account
            </p>
            <p className="mt-1 truncate text-sm font-semibold">{user?.email || '—'}</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Capstone Management System &mdash; BukSU College of Technologies
          </p>
        </div>
      </div>
    </SettingSection>
  );
}

/* ────────── System Administration (Instructor Only) ────────── */

function AdministrationSection() {
  const { data: settings, isLoading, isError } = useSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState({
    plagiarismThreshold: 75,
    titleSimilarityThreshold: 0.65,
    maxFileSize: 25,
    systemAnnouncement: '',
    maintenanceMode: false,
  });
  const [dirty, setDirty] = useState(false);

  // Sync form when settings load
  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        plagiarismThreshold: settings.plagiarismThreshold ?? 75,
        titleSimilarityThreshold: settings.titleSimilarityThreshold ?? 0.65,
        maxFileSize: settings.maxFileSize ? Math.round(settings.maxFileSize / (1024 * 1024)) : 25,
        systemAnnouncement: settings.systemAnnouncement ?? '',
        maintenanceMode: Boolean(settings.maintenanceMode),
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
        maintenanceMode: Boolean(settings.maintenanceMode),
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
        maintenanceMode: Boolean(form.maintenanceMode),
      });
      toast.success('System settings updated successfully.');
      setDirty(false);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to update settings.');
    }
  };

  if (isLoading) {
    return (
      <SettingSection
        icon={Settings2}
        title="System Administration"
        description="Configure system-wide thresholds and announcements."
        badge="Instructor"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SettingSection>
    );
  }

  if (isError) {
    return (
      <SettingSection
        icon={Settings2}
        title="System Administration"
        description="Configure system-wide thresholds and announcements."
        badge="Instructor"
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load system settings. Please try again later.
          </AlertDescription>
        </Alert>
      </SettingSection>
    );
  }

  return (
    <SettingSection
      icon={Settings2}
      title="System Administration"
      description="Configure system-wide thresholds, limits, and announcements."
      badge="Instructor"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plagiarism Threshold */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="settings-plagiarismThreshold" className="text-sm font-medium">
                Minimum Originality Threshold
              </Label>
              <p className="text-xs text-muted-foreground">
                Submissions must meet this originality percentage to pass plagiarism checks.
              </p>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {form.plagiarismThreshold}%
            </Badge>
          </div>
          <Input
            id="settings-plagiarismThreshold"
            type="range"
            min={0}
            max={100}
            step={1}
            value={form.plagiarismThreshold}
            onChange={(e) => handleChange('plagiarismThreshold', Number(e.target.value))}
            className="h-2 cursor-pointer accent-primary"
          />
        </div>

        {/* Title Similarity Threshold */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="settings-titleSimilarityThreshold" className="text-sm font-medium">
                Title Similarity Threshold
              </Label>
              <p className="text-xs text-muted-foreground">
                Proposed titles exceeding this similarity score will trigger a duplicate warning.
              </p>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {(form.titleSimilarityThreshold * 100).toFixed(0)}%
            </Badge>
          </div>
          <Input
            id="settings-titleSimilarityThreshold"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={form.titleSimilarityThreshold}
            onChange={(e) => handleChange('titleSimilarityThreshold', Number(e.target.value))}
            className="h-2 cursor-pointer accent-primary"
          />
        </div>

        {/* Max File Size */}
        <div className="space-y-3 rounded-lg border p-4">
          <Label htmlFor="settings-maxFileSize" className="text-sm font-medium">
            Maximum File Size (MB)
          </Label>
          <Input
            id="settings-maxFileSize"
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
        <div className="space-y-3 rounded-lg border p-4">
          <Label htmlFor="settings-systemAnnouncement" className="text-sm font-medium">
            System Announcement
          </Label>
          <Textarea
            id="settings-systemAnnouncement"
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

        {/* Maintenance Mode */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">
                Temporarily restrict normal access. Enable only during maintenance windows.
              </p>
            </div>
            <label htmlFor="settings-maintenanceMode" className="flex items-center gap-2 text-sm">
              <input
                id="settings-maintenanceMode"
                type="checkbox"
                checked={form.maintenanceMode}
                onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className={form.maintenanceMode ? 'font-medium text-amber-600' : ''}>
                {form.maintenanceMode ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
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
    </SettingSection>
  );
}

/* ────────── Main Page ────────── */

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const tabs = isInstructor ? ADMIN_TABS : BASE_TABS;
  const [activeTab, setActiveTab] = useState('appearance');

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
        {/* Page Header */}
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Settings</h3>
          <p className="text-muted-foreground">
            Manage your preferences{isInstructor ? ' and system configuration' : ''}.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/50 p-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                ].join(' ')}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="grid gap-6">
          {activeTab === 'appearance' && <AppearanceSection />}
          {activeTab === 'security' && <SecuritySection />}
          {activeTab === 'notifications' && <NotificationsSection />}
          {activeTab === 'administration' && isInstructor && <AdministrationSection />}
          {activeTab === 'about' && <AboutSection />}
        </div>
      </div>
    </DashboardLayout>
  );
}
