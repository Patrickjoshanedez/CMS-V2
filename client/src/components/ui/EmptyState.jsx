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
 *   actions      — array of { label, onClick, variant?, size?, icon? } for multi-CTA support
 *   actionLabel  — legacy single-action label (compat)
 *   onAction     — legacy single-action handler (compat)
 *   compact      — reduces spacing for empty sections within a page
 *   className    — extra classes on the wrapper
 */
export function EmptyState({
  icon: Icon = FolderOpen,
  iconVariant = 'circle',
  title = 'No records found',
  description = 'There are currently no items to display.',
  actions,
  actionLabel,
  onAction,
  compact = false,
  className = '',
}) {
  // Normalise: support both legacy single-action and new multi-action API
  const resolvedActions =
    actions ?? (actionLabel && onAction ? [{ label: actionLabel, onClick: onAction }] : []);

  const iconShape = iconVariant === 'square' ? 'rounded-2xl' : 'rounded-full';

  return (
    <div
      className={`flex flex-col items-center justify-center ${compact ? 'py-8 px-5' : 'py-16 px-8'} text-center rounded-xl border border-dashed border-border bg-card/40 ${className}`}
    >
      <div
        className={`flex ${compact ? 'h-12 w-12 mb-3' : 'h-16 w-16 mb-5'} items-center justify-center ${iconShape} bg-primary/10 text-primary shadow-inner`}
      >
        <Icon className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p
        className={`text-sm text-muted-foreground max-w-sm leading-relaxed ${compact && resolvedActions.length === 0 ? '' : 'mb-6'}`}
      >
        {description}
      </p>
      {resolvedActions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {resolvedActions.map(
            ({ label, onClick, variant = 'default', size = 'sm', icon: ActionIcon }, i) => (
              <Button key={i} onClick={onClick} size={size} variant={variant}>
                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                {label}
              </Button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
