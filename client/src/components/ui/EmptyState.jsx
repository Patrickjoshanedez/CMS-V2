import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

/**
 * EmptyState — canonical empty view component for all student and faculty pages.
 *
 * Props:
 *   icon         — Lucide icon component (default: FolderOpen)
 *   iconVariant  — 'circle' (default) | 'square' — controls icon container shape
 *   title        — heading text
 *   description  — supporting text
 *   gradient     — if true, adds a subtle gradient background (default: true)
 *   actions      — array of { label, onClick, variant? } for multi-CTA support
 *   actionLabel  — legacy single-action label (compat)
 *   onAction     — legacy single-action handler (compat)
 *   className    — extra classes on the wrapper
 */
export function EmptyState({
  icon: Icon = FolderOpen,
  iconVariant = 'circle',
  title = 'No records found',
  description = 'There are currently no items to display.',
  gradient = true,
  actions,
  actionLabel,
  onAction,
  className = '',
}) {
  // Normalise: support both legacy single-action and new multi-action API
  const resolvedActions =
    actions ?? (actionLabel && onAction ? [{ label: actionLabel, onClick: onAction }] : []);

  const iconShape = iconVariant === 'square' ? 'rounded-2xl' : 'rounded-full';

  const bgClass = gradient ? 'bg-gradient-to-b from-muted/30 to-muted/60' : 'bg-card/40';

  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-8 text-center rounded-xl border border-dashed border-border ${bgClass} ${className}`}
    >
      <div
        className={`flex h-16 w-16 items-center justify-center ${iconShape} bg-primary/10 text-primary mb-5 shadow-inner`}
      >
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">{description}</p>
      {resolvedActions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {resolvedActions.map(({ label, onClick, variant = 'default' }, i) => (
            <Button key={i} onClick={onClick} size="sm" variant={variant}>
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
