import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

/**
 * ThemeButton — Moon/Sun toggle for the landing page header.
 */
export function ThemeButton() {
  const { theme, setTheme } = useThemeStore();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;

  return (
    <button
      onClick={cycleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur-sm hover:bg-accent transition-all duration-300"
      title={`Theme: ${theme}`}
      aria-label="Toggle theme"
    >
      <Icon className="h-4 w-4 text-foreground transition-transform duration-300" />
    </button>
  );
}
