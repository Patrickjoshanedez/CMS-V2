import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

/**
 * FilterToolbar — unified single-surface filter & search bar replacing ad-hoc
 * multi-box toolbars across directory, review, archive, and reporting routes.
 */
export function FilterToolbar({ top, children, footer, className }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3', className)}>
      {top && <div className="min-w-0">{top}</div>}
      {children && (
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          {children}
        </div>
      )}
      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

FilterToolbar.propTypes = {
  top: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  className: PropTypes.string,
};

export default FilterToolbar;
