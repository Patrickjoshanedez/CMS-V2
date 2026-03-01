import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

/**
 * ForbiddenPage — Displayed when a user attempts to access a
 * resource they do not have permission for (403).
 */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <ShieldAlert className="mb-6 h-20 w-20 text-destructive" />
      <h1 className="text-4xl font-bold tracking-tight text-foreground">403</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Access Denied — You don&apos;t have permission to view this page.
      </p>
      <div className="mt-8 flex gap-3">
        <Button variant="outline" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Button asChild>
          <Link to="/login">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Link>
        </Button>
      </div>
    </div>
  );
}
