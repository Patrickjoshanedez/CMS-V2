import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Loader2, Palette, Shield, Bell, Settings2, Info } from 'lucide-react';
import { ROLES } from '@cms/shared';

// Components
import AppearanceSection from '@/components/settings/AppearanceSection';
import SecuritySection from '@/components/settings/SecuritySection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import AboutSection from '@/components/settings/AboutSection';
import AdministrationSection from '@/components/settings/AdministrationSection';

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

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'appearance';

  const tabs =
    user?.role === ROLES.INSTRUCTOR || user?.role === ROLES.ADMIN ? ADMIN_TABS : BASE_TABS;

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  const handleTabChange = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', value);
    setSearchParams(nextParams, { replace: true });
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="border-b border-border">
            <TabsList className="bg-transparent p-0 flex h-auto gap-6 flex-wrap justify-start border-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="pt-2 focus-visible:outline-none">
            <TabsContent value="appearance" className="mt-0 focus-visible:outline-none">
              <AppearanceSection />
            </TabsContent>

            <TabsContent value="security" className="mt-0 focus-visible:outline-none">
              <SecuritySection />
            </TabsContent>

            <TabsContent value="notifications" className="mt-0 focus-visible:outline-none">
              <NotificationsSection />
            </TabsContent>

            {tabs.some((t) => t.id === 'administration') && (
              <TabsContent value="administration" className="mt-0 focus-visible:outline-none">
                <AdministrationSection />
              </TabsContent>
            )}

            <TabsContent value="about" className="mt-0 focus-visible:outline-none">
              <AboutSection />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
