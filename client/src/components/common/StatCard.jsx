import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

const TONE_VALUE_CLASSES = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive-text',
};

const TONE_DOT_CLASSES = {
  default: 'bg-muted-foreground/50',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

/**
 * StatCard — unified KPI & metric surface across dashboards and management views.
 * Replaces divergent inline stat cards with one consistent, scannable layout.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  active = false,
  onClick,
  loading = false,
  className,
  testId,
}) {
  const valueClass = TONE_VALUE_CLASSES[tone] || TONE_VALUE_CLASSES.default;
  const dotClass = TONE_DOT_CLASSES[tone] || TONE_DOT_CLASSES.default;

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {tone !== 'default' && (
            <span className={cn('size-1.5 shrink-0 rounded-full', dotClass)} aria-hidden="true" />
          )}
          <span className="truncate">{label}</span>
        </span>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground/75" aria-hidden="true" />}
      </div>

      {loading ? (
        <div className="mt-2.5 space-y-2" aria-busy="true">
          <Skeleton className="h-7 w-16" />
          {hint !== undefined && <Skeleton className="h-3.5 w-28" />}
        </div>
      ) : (
        <>
          <div
            className={cn(
              'mt-2 text-xl sm:text-2xl font-semibold tracking-tight tabular-nums',
              valueClass,
            )}
          >
            {value}
          </div>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </>
      )}
    </>
  );

  const baseSurfaceClass = cn(
    'rounded-xl border bg-card p-3.5 sm:p-5 text-card-foreground transition-colors',
    active ? 'border-primary/60 bg-primary/[0.04] ring-1 ring-primary/30' : 'border-border',
    onClick &&
      'w-full min-h-11 text-left cursor-pointer hover:border-border/90 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        data-testid={testId}
        className={baseSurfaceClass}
      >
        {content}
      </button>
    );
  }

  return (
    <div data-testid={testId} className={baseSurfaceClass}>
      {content}
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.node,
  hint: PropTypes.node,
  icon: PropTypes.elementType,
  tone: PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'destructive']),
  active: PropTypes.bool,
  onClick: PropTypes.func,
  loading: PropTypes.bool,
  className: PropTypes.string,
  testId: PropTypes.string,
};

export default StatCard;
