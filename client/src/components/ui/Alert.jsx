import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

/**
 * Alert — shadcn/ui-compatible alert component.
 * Variants: default, success, destructive, info.
 */

const alertVariants = {
  default: 'bg-background text-foreground border',
  success: 'border-green-500/50 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20',
  destructive: 'border-destructive/50 text-destructive dark:text-red-400 bg-red-50 dark:bg-red-950/20',
  info: 'border-blue-500/50 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20',
};

const alertIcons = {
  default: Info,
  success: CheckCircle2,
  destructive: XCircle,
  info: AlertCircle,
};

const Alert = forwardRef(({ className, variant = 'default', children, ...props }, ref) => {
  const Icon = alertIcons[variant];

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
        alertVariants[variant],
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
