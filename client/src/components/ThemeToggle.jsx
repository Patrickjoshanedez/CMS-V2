import { Moon, Sun, Type } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

/**
 * ThemeToggle — Accessibility controls for Light/Dark mode and Font Size scaling (Dr. Sales Aribe Jr. mandate).
 */
export default function ThemeToggle() {
  const { theme, toggleTheme, fontSizeMultiplier, setFontSize } = useThemeStore();

  const cycleFontSize = () => {
    if (fontSizeMultiplier === 1.0) setFontSize(1.25);
    else if (fontSizeMultiplier === 1.25) setFontSize(1.5);
    else setFontSize(1.0);
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={toggleTheme}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors overflow-hidden"
        title={`Current theme: ${theme}. Click to toggle.`}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400" />
        <span className="sr-only">Toggle theme</span>
      </button>

      <button
        onClick={cycleFontSize}
        className="inline-flex h-9 px-2.5 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-xs font-semibold text-muted-foreground hover:text-foreground gap-1"
        title={`Text scaling: ${fontSizeMultiplier}x. Click to cycle (1.0x, 1.25x, 1.5x).`}
        aria-label="Change font size"
      >
        <Type className="h-3.5 w-3.5" />
        <span>{fontSizeMultiplier}x</span>
      </button>
    </div>
  );
}
