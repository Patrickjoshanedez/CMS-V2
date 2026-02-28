import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * AuthLayout — shared layout wrapper for all authentication pages.
 * Centers the content vertically and horizontally with a card-like container.
 */
export default function AuthLayout({ children, title, description }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Theme toggle (top-right corner) */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {/* Logo / App name */}
      <div className="mb-8 text-center">
        <Link to="/" className="inline-block">
          <h1 className="text-3xl font-bold tracking-tight text-primary">CMS</h1>
          <p className="text-xs text-muted-foreground">Capstone Management System</p>
        </Link>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-md">
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          {title && (
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
