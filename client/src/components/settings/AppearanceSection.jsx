import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useSettingsStore, ZOOM_OPTIONS } from '@/stores/settingsStore';
import { Palette } from 'lucide-react';
import { SettingSection } from './SettingsShared';
import ThemeSelector from './ThemeSelector';

export default function AppearanceSection() {
  const { zoomLevel, setZoomLevel, highContrast, setHighContrast } = useSettingsStore();

  const currentOption = ZOOM_OPTIONS.find((opt) => opt.value === zoomLevel) || ZOOM_OPTIONS[2];

  return (
    <SettingSection
      icon={Palette}
      title="Appearance & Accessibility"
      description="Choose a theme, adjust contrast, and set text size."
    >
      <div className="space-y-6">
        <div>
          <Label className="mb-3 block text-sm font-medium">Theme Mode</Label>
          <ThemeSelector />
        </div>

        {/* High Contrast Mode Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="high-contrast-toggle" className="text-sm font-medium cursor-pointer">
                High-Contrast Interface
              </Label>
              <p className="text-xs text-muted-foreground">
                Increase text and border contrast for easier reading.
              </p>
            </div>
            <Switch
              id="high-contrast-toggle"
              checked={highContrast}
              onCheckedChange={setHighContrast}
              aria-label="High-Contrast Interface"
            />
          </div>
        </Card>

        {/* Font Scaling Options */}
        <div>
          <Label htmlFor="font-size-select" className="mb-2 block text-sm font-medium">
            Dynamic Font Scaling
          </Label>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <Select value={zoomLevel} onValueChange={setZoomLevel}>
              <SelectTrigger id="font-size-select" className="w-full sm:max-w-[240px]">
                <SelectValue placeholder="Choose text size" />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} — {opt.scale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{currentOption.desc}</p>
          </div>
        </div>
      </div>
    </SettingSection>
  );
}
