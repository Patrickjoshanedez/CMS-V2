import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { SettingSection, SettingRow } from './SettingsShared';

export default function NotificationsSection() {
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
