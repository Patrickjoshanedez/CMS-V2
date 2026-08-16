import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

/**
 * EmptyState — clean illustration & CTA component for empty views.
 */
export function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No records found',
  description = 'There are currently no items to display.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-card/40 ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 shadow-inner">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
