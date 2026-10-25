import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { Button } from '@/components/ui/Button';

/**
 * ThemeToggle — High-contrast Theme toggle button for Light/Dark mode.
 */
export default function ThemeToggle() {
  const themeState = useThemeStore((s) => s?.theme);
  const theme = typeof themeState === 'string' ? themeState : (themeState?.theme ?? 'light');
  const toggleTheme = useThemeStore((s) => s?.toggleTheme) ?? themeState?.toggleTheme ?? (() => {});

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="relative size-9 overflow-hidden"
      title={`Current theme: ${theme}. Click to toggle.`}
      aria-label="Toggle theme"
    >
      <Sun className="size-4 rotate-0 scale-100 text-foreground transition-all dark:-rotate-90 dark:scale-0" aria-hidden="true" />
      <Moon className="absolute size-4 rotate-90 scale-0 text-foreground transition-all dark:rotate-0 dark:scale-100" aria-hidden="true" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
