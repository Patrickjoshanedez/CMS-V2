import { Alert, AlertDescription } from '@/components/ui/Alert';

/**
 * AuthStatusAlert — small wrapper for consistent auth-page alerts with WCAG 2.2 live region support.
 */
export default function AuthStatusAlert({
  message,
  variant = 'destructive',
  className = 'auth-item mb-4',
}) {
  if (!message) {
    return null;
  }

  return (
    <div className={className}>
      <Alert
        variant={variant}
        role={variant === 'destructive' ? 'alert' : 'status'}
        aria-live={variant === 'destructive' ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
