import React, { useState, useEffect } from 'react';

const SCALE_OPTIONS = [
  { label: '1x (Normal)', scale: '100%', value: '100' },
  { label: '1.1x (Medium)', scale: '110%', value: '110' },
  { label: '1.25x (Large)', scale: '125%', value: '125' },
];

/**
 * TextScaleDropdown
 *
 * Dynamically adjusts root document font sizing across three tiers (1x, 1.1x, 1.25x).
 * Persists user preference in localStorage under 'app_text_scale'.
 */
export function TextScaleDropdown() {
  const [scale, setScale] = useState(() => {
    if (typeof window === 'undefined') return '100';
    try {
      return localStorage.getItem('app_text_scale') || '100';
    } catch {
      return '100';
    }
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const num = parseInt(scale, 10) || 100;
    // Scales the root document font so all rem-based typography scales together
    document.documentElement.style.fontSize = `${(num / 100) * 16}px`;
    document.documentElement.style.setProperty('--font-size-multiplier', `${num / 100}`);
    try {
      localStorage.setItem('app_text_scale', scale);
    } catch {
      // Ignore localStorage errors in private mode / restricted environments
    }
  }, [scale]);

  return (
    <div className="relative inline-flex items-center">
      <div className="flex h-9 items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 shadow-xs dark:border-slate-700 dark:bg-[#0c1424] transition-colors">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1.5 select-none">
          T
        </span>
        <select
          value={scale}
          onChange={(e) => setScale(e.target.value)}
          className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1"
          aria-label="Adjust text scaling"
        >
          {SCALE_OPTIONS.map((opt) => (
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
