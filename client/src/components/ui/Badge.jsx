import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Badge — small status indicator label.
 * Follows shadcn/ui badge conventions with variant support.
 */

const badgeVariants = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-input bg-background text-foreground',
  success: 'border border-success/30 bg-success/10 text-success-foreground',
  warning: 'border border-warning/30 bg-warning/10 text-warning-foreground',
  info: 'border border-info/30 bg-info/10 text-foreground',
};

const Badge = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
        badgeVariants[variant] || badgeVariants.default,
        className,
      )}
      {...props}
    />
  );
});

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
