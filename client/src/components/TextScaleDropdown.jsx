import React, { useEffect } from 'react';
import { useSettingsStore, ZOOM_OPTIONS } from '@/stores/settingsStore';

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
    <div className="relative inline-flex items-center">
      <div className="flex h-9 items-center rounded-lg border border-slate-700 bg-white px-2.5 py-1.5 shadow-xs dark:border-slate-700 dark:bg-[#0c1424] transition-colors">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1.5 select-none">
          T
        </span>
        <select
          value={zoomLevel}
          onChange={(e) => setZoomLevel(e.target.value)}
          className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1"
          aria-label="Adjust text scaling"
        >
          {ZOOM_OPTIONS.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              {opt.scale}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default TextScaleDropdown;
