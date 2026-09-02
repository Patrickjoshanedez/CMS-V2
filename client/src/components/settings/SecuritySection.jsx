import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { SettingSection, SettingRow } from './SettingsShared';
import ChangePasswordForm from './ChangePasswordForm';

export default function SecuritySection() {
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
