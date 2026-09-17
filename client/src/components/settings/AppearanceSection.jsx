import { Label } from '@/components/ui/Label';
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
      description="Dr. Sales G. Aribe Jr. Requirement: Customize display themes, high-contrast mode, and dynamic text scaling for enhanced readability."
    >
      <div className="space-y-6">
        <div>
          <Label className="mb-3 block text-sm font-medium">Theme Mode</Label>
          <ThemeSelector />
        </div>

        {/* High Contrast Mode Toggle */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="high-contrast-toggle" className="text-sm font-medium cursor-pointer">
                High-Contrast Interface
              </Label>
              <p className="text-xs text-muted-foreground">
                Enhances text contrast, sharpens borders, and deepens dark/light backgrounds for
                maximum legibility.
              </p>
            </div>
            <input
              type="checkbox"
              id="high-contrast-toggle"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Font Scaling Options */}
        <div>
          <Label htmlFor="font-size-select" className="mb-2 block text-sm font-medium">
            Dynamic Font Scaling
          </Label>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <select
              id="font-size-select"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary sm:max-w-[240px]"
            >
              {ZOOM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.scale}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{currentOption.desc}</p>
          </div>
        </div>
      </div>
    </SettingSection>
  );
}
