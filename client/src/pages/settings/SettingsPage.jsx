import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Palette, Bell, Shield, Info } from 'lucide-react';

/**
 * SettingsPage — application settings for the current user.
 * Includes theme, notification preferences, and account sections.
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
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Change Password</p>
                <p className="text-xs text-muted-foreground">
                  Update your account password.
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Coming soon</span>
            </div>
          </SettingSection>

          {/* About */}
          <SettingSection
            icon={Info}
            title="About"
            description="System information."
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">0.1.0</span>
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
