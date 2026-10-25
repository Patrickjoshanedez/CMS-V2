import { memo } from 'react';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Progress from './Progress';
import Spinner from './Spinner';

/**
 * LoadingScreen — shared application loading state built from the CMS design system.
 *
 * @param {Object} props
 * @param {string} [props.message="Loading..."] - Status message
 * @param {string} [props.subtitle="Capstone Management System"] - Subtitle
 * @param {boolean} [props.fullScreen=true] - Whether to occupy the full viewport
 * @param {'sm'|'md'|'lg'} [props.size="md"] - Size preset
 * @param {boolean} [props.showLogo=false] - Whether to render the institutional mark
 * @param {string} [props.className=""] - Additional container classes
 */
function LoadingScreenComponent({
  message = 'Loading...',
  subtitle = 'Capstone Management System',
  fullScreen = true,
  size = 'md',
  showLogo = false,
  className = '',
}) {
  const iconSize = { sm: 'size-5', md: 'size-7', lg: 'size-9' }[size] || 'size-7';

  const content = (
    <div
      className={cn(
        'flex w-full max-w-sm flex-col items-center gap-5 rounded-lg border border-border bg-card px-6 py-8 text-center shadow-sm',
        className,
      )}
    >
      {showLogo && (
        <div className="flex size-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GraduationCap className={iconSize} aria-hidden="true" />
        </div>
      )}
      {showLogo && (
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight text-foreground">BukSU CMS</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div role="status" aria-live="polite" aria-label={message} className="flex flex-col items-center gap-3">
        <Spinner className="size-5 text-primary" />
        {message && <p className="text-sm font-medium text-muted-foreground">{message}</p>}
      </div>
      <Progress indeterminate aria-label={message || 'Loading'} className="h-1.5 max-w-40" />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-60 w-full items-center justify-center p-4">
      {content}
    </div>
  );
}

const LoadingScreen = memo(LoadingScreenComponent);

export default LoadingScreen;
export { LoadingScreen as PageLoadingSpinner, LoadingScreen as LoadingLogo };
