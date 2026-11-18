import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

/**
 * PageHeader — canonical top-of-page identity bar across all roles and routes.
 * Enforces a single clear heading hierarchy, restrained metadata, and consistent
 * responsive action alignment.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  meta,
  actions,
  as: Heading = 'h1',
  className,
  headingProps,
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <div
            aria-hidden="true"
            className="hidden size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground sm:flex"
          >
            <Icon className="size-5" />
          </div>
        )}
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <Heading
            className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem] leading-tight"
            {...headingProps}
          >
            {title}
          </Heading>
          {description && (
            <p className="text-pretty max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          {meta && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      )}
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  eyebrow: PropTypes.node,
  icon: PropTypes.elementType,
  meta: PropTypes.node,
  actions: PropTypes.node,
  as: PropTypes.oneOf(['h1', 'h2']),
  className: PropTypes.string,
  headingProps: PropTypes.object,
};

export default PageHeader;
