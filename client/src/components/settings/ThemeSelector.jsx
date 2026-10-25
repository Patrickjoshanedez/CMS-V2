import { useThemeStore } from '@/stores/themeStore';
import { Check, Sun, Moon, Monitor } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/Label';

export default function ThemeSelector() {
  const { theme, setTheme } = useThemeStore();

  const options = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Classic bright interface',
      preview: 'bg-background border-border',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Easier on the eyes',
      preview: 'bg-foreground border-foreground',
    },
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Follow OS preference',
      preview: 'bg-muted border-border',
    },
  ];

  return (
    <RadioGroup
      value={theme}
      onValueChange={setTheme}
      aria-label="Color theme"
      className="grid gap-3 sm:grid-cols-3"
    >
      {options.map((opt) => {
        const isSelected = theme === opt.value;
        return (
          <div
            key={opt.value}
            className={[
              'group relative flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-accent/50',
            ].join(' ')}
          >
            <RadioGroupItem id={`theme-${opt.value}`} value={opt.value} aria-label={opt.label} />
            {/* Preview swatch */}
            <div
              className={[
                'h-12 w-full rounded-md border transition-transform duration-200 group-hover:scale-[1.02]',
                opt.preview,
              ].join(' ')}
            >
              {opt.value === 'system' && (
                <div className="grid h-full grid-cols-2 overflow-hidden rounded-[inherit]">
                  <span className="bg-background" />
                  <span className="bg-foreground" />
                </div>
              )}
            </div>
            <Label htmlFor={`theme-${opt.value}`} className="cursor-pointer font-normal">
              <div className="flex items-center justify-center gap-1.5">
                <opt.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.description}</p>
            </Label>
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        );
      })}
    </RadioGroup>
  );
}
