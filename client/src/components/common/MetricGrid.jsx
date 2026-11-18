import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

const GRID_COLS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
};

/**
 * MetricGrid — uniform responsive grid for StatCard items across all views.
 */
export function MetricGrid({ cols = 4, className, children }) {
  return (
    <div className={cn('grid gap-3 sm:gap-4', GRID_COLS[cols] || GRID_COLS[4], className)}>
      {children}
    </div>
  );
}

MetricGrid.propTypes = {
  cols: PropTypes.oneOf([2, 3, 4]),
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default MetricGrid;
