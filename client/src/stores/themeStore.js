import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark', // Primary render default
      fontSizeMultiplier: 1.0, // Standard size multiplier (e.g. 1.0, 1.25, 1.5)

      toggleTheme: () =>
        set((state) => {
          const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', nextTheme === 'dark');
            document.documentElement.classList.toggle('light', nextTheme === 'light');
          }
          return { theme: nextTheme };
        }),

      setTheme: (theme) =>
        set(() => {
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', theme === 'dark');
            document.documentElement.classList.toggle('light', theme === 'light');
          }
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
      storage: createJSONStorage(() => localStorage), // Avoids dark flash on initial DOM painting
    },
  ),
);

export default useThemeStore;
