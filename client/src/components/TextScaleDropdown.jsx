import React, { useEffect } from 'react';
import { useSettingsStore, ZOOM_OPTIONS } from '@/stores/settingsStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

/**
 * TextScaleDropdown
 *
 * Dynamically adjusts root document font sizing across 7 synchronized tiers (75% to 150%).
 * Synchronized bidirectionally with Settings > Appearance and persisted in localStorage.
 */
export function TextScaleDropdown() {
  const zoomLevel = useSettingsStore((s) => s.zoomLevel);
  const setZoomLevel = useSettingsStore((s) => s.setZoomLevel);

  useEffect(() => {
    const handleStorage = (e) => {
      if ((e.key === 'app_text_scale' || e.key === 'cms-zoom-level') && e.newValue) {
        setZoomLevel(e.newValue);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, [setZoomLevel]);

  return (
    <Select value={zoomLevel} onValueChange={setZoomLevel}>
      <SelectTrigger
        className="h-9 w-[4.85rem] shrink-0 gap-1 whitespace-nowrap px-2 sm:w-[5.75rem] sm:px-2.5"
        aria-label="Adjust text scaling"
      >
        <span aria-hidden="true" className="text-xs font-semibold text-muted-foreground">
          T
        </span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {ZOOM_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.scale}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default TextScaleDropdown;
