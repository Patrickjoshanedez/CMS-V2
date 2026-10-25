import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FileQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/Card';

/**
 * NotFoundPage — displayed for any unmatched route (404).
 * Does not wrap in DashboardLayout because the user may be unauthenticated.
 */
export default function NotFoundPage() {
  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-center">
      <Card className="w-full max-w-xl">
        <CardHeader className="items-center gap-4 pb-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileQuestion aria-hidden="true" className="size-8" />
          </div>
          <Badge variant="secondary">404 · Page unavailable</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Page not found
          </h1>
          <CardDescription className="mx-auto max-w-md text-base">
            The page you&apos;re looking for doesn&apos;t exist or may have moved. Check the address
            or choose where you&apos;d like to go next.
          </CardDescription>
        </CardContent>
        <CardFooter className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <Button variant="outline" onClick={handleGoBack}>
            Go Back
          </Button>
          <Button asChild>
            <Link to="/dashboard">Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
