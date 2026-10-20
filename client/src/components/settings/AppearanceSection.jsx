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
      description="Choose a theme, adjust contrast, and set text size."
    >
      <div className="space-y-6">
        <div>
          <Label className="mb-3 block text-sm font-medium">Theme Mode</Label>
          <ThemeSelector />
        </div>

        {/* High Contrast Mode Toggle */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="high-contrast-toggle" className="text-sm font-medium cursor-pointer">
                High-Contrast Interface
              </Label>
              <p className="text-xs text-muted-foreground">
                Increase text and border contrast for easier reading.
              </p>
            </div>
            <input
              type="checkbox"
              id="high-contrast-toggle"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              className="h-5 w-5 shrink-0 cursor-pointer rounded border-input text-primary focus:ring-primary"
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
