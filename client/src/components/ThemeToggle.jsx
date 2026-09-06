import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

/**
 * ThemeToggle — High-contrast Theme toggle button for Light/Dark mode.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 bg-white dark:bg-[#0c1424] transition-colors relative inline-flex items-center justify-center h-9 w-9 overflow-hidden"
      title={`Current theme: ${theme}. Click to toggle.`}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
