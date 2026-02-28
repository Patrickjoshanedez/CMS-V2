import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FileQuestion } from 'lucide-react';

/**
 * NotFoundPage — displayed for any unmatched route (404).
 * Does not wrap in DashboardLayout because the user may be unauthenticated.
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <FileQuestion className="mb-6 h-20 w-20 text-muted-foreground" />
      <h1 className="text-6xl font-extrabold tracking-tight text-foreground">404</h1>
      <p className="mt-3 text-xl font-medium text-muted-foreground">
        Page not found
      </p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/login">Back to Login</Link>
        </Button>
      </div>
    </div>
  );
}
