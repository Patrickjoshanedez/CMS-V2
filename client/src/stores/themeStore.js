import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Resolves the effective theme ('dark' | 'light') for a given preference.
 * When preference is 'system', defers to the OS prefers-color-scheme media query.
 */
export function resolveTheme(preference) {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference === 'dark' ? 'dark' : 'light';
}

/**
 * Applies the correct .dark class to <html> based on a stored preference.
 * Safe to call before React mounts (used in main.jsx bootstrap).
 */
export function applyTheme(preference) {
  if (typeof document === 'undefined') return;
  const effective = resolveTheme(preference);
  document.documentElement.classList.toggle('dark', effective === 'dark');
  document.documentElement.classList.remove('light'); // Tailwind uses .dark only — keep DOM clean
}

export const useThemeStore = create(
  persist(
    (set) => ({
      /** 'dark' | 'light' | 'system' */
      theme: 'dark',
      fontSizeMultiplier: 1.0,

      /**
       * Toggle between dark and light. If current preference is 'system',
       * toggles to the opposite of the current effective theme.
       */
      toggleTheme: () =>
        set((state) => {
          const effective = resolveTheme(state.theme);
          const nextTheme = effective === 'dark' ? 'light' : 'dark';
          applyTheme(nextTheme);
          return { theme: nextTheme };
        }),

      /** Explicitly set theme preference: 'dark' | 'light' | 'system' */
      setTheme: (theme) =>
        set(() => {
          applyTheme(theme);
          return { theme };
        }),

      setFontSize: (multiplier) =>
        set(() => {
          if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--font-size-multiplier', `${multiplier}`);
          }
          return { fontSizeMultiplier: multiplier };
        }),

      cycleFontSize: () =>
        set((state) => {
          const next =
            state.fontSizeMultiplier === 1.0 ? 1.25 : state.fontSizeMultiplier === 1.25 ? 1.5 : 1.0;
          if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--font-size-multiplier', `${next}`);
          }
          return { fontSizeMultiplier: next };
        }),
    }),
    {
      name: 'cms-accessibility-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export default useThemeStore;
