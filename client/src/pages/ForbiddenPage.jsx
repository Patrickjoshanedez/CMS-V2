import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/Card';

/**
 * ForbiddenPage — Displayed when a user attempts to access a
 * resource they do not have permission for (403).
 */
export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center gap-4 pb-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert aria-hidden="true" className="size-8" />
          </div>
          <Badge variant="destructive">403 · Access restricted</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Access denied
          </h1>
          <CardDescription className="mx-auto max-w-sm text-base">
            You don&apos;t have permission to view this page. If you believe you should have access,
            contact your course instructor or system administrator.
          </CardDescription>
        </CardContent>
        <CardFooter className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link to="/login">
              <LogIn aria-hidden="true" className="size-4" />
              Sign in
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
