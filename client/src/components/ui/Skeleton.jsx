import { cn } from '@/lib/utils';

/**
 * Skeleton — animated glassmorphism shimmer component for loading states.
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted/60 backdrop-blur-sm cms-skeleton-shimmer',
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonText({ className, lines = 1, ...props }) {
  if (lines === 1) {
    return <Skeleton className={cn('h-4 w-full rounded', className)} {...props} />;
  }

  return (
    <div className="space-y-2 w-full" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            'h-4 rounded',
            index === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
            className,
          )}
          {...props}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ className, size = 'md', ...props }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <Skeleton
      className={cn('rounded-full shrink-0', sizeClasses[size] || sizeClasses.md, className)}
      {...props}
    />
  );
}

export function SkeletonButton({ className, size = 'default', ...props }) {
  const sizeClasses = {
    default: 'h-10 w-24',
    sm: 'h-9 w-20',
    lg: 'h-11 w-32',
    icon: 'h-10 w-10',
  };

  return (
    <Skeleton
      className={cn('rounded-md', sizeClasses[size] || sizeClasses.default, className)}
      {...props}
    />
  );
}

export function SkeletonBadge({ className, ...props }) {
  return <Skeleton className={cn('h-5 w-16 rounded-full', className)} {...props} />;
}

export function SkeletonCard({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-card/60 p-6 shadow-sm space-y-4 backdrop-blur-sm',
        className,
      )}
      aria-hidden="true"
      {...props}
    >
      {children || (
        <>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-1/3 rounded-md" />
            <SkeletonBadge />
          </div>
          <Skeleton className="h-4 w-2/3 rounded" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </>
      )}
    </div>
  );
}

export default Skeleton;
