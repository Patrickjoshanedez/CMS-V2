import { useThemeStore } from '@/stores/themeStore';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

export default function ThemeSelector() {
  const { theme, setTheme } = useThemeStore();

  const options = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Classic bright interface',
      preview: 'bg-white border-gray-200',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Easier on the eyes',
      preview: 'bg-zinc-900 border-zinc-700',
    },
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Follow OS preference',
      preview: 'bg-gradient-to-br from-white to-zinc-900 border-gray-300 dark:border-zinc-600',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {options.map((opt) => {
        const isSelected = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={[
              'group relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-center transition-all duration-200',
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                : 'border-border hover:border-primary/40 hover:bg-accent/50',
            ].join(' ')}
          >
            {/* Preview swatch */}
            <div
              className={[
                'h-12 w-full rounded-lg border transition-transform duration-200 group-hover:scale-[1.02]',
                opt.preview,
              ].join(' ')}
            />
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <opt.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.description}</p>
            </div>
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
