import { Info } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { SettingSection } from './SettingsShared';

export default function AboutSection() {
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
