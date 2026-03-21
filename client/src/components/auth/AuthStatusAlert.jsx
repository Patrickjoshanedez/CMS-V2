import { Alert, AlertDescription } from '@/components/ui/Alert';

/**
 * AuthStatusAlert — small wrapper for consistent auth-page alerts.
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
      <Alert variant={variant}>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
