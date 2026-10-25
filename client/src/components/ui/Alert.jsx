import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

/**
 * Alert — shadcn/ui-compatible alert component.
 * Variants: default, success, destructive, info.
 */

const alertVariants = {
  default: 'bg-background text-foreground border',
  success: 'border-success/30 bg-success/10 text-success-foreground',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive-text',
  warning: 'border-warning/30 bg-warning/10 text-warning-foreground',
  info: 'border-info/30 bg-info/10 text-foreground',
};

const alertIcons = {
  default: Info,
  success: CheckCircle2,
  destructive: XCircle,
  warning: AlertCircle,
  info: AlertCircle,
};

const Alert = forwardRef(({ className, variant = 'default', children, ...props }, ref) => {
  const resolvedVariant = alertVariants[variant] ? variant : 'default';
  const Icon = alertIcons[resolvedVariant] || alertIcons.default;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-md border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-current',
        alertVariants[resolvedVariant],
        className,
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </div>
  );
});
Alert.displayName = 'Alert';

const AlertTitle = forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
