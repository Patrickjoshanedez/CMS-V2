import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

export function Progress({ value = 0, max = 100, className, indicatorClassName, ...props }) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out',
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}

Progress.propTypes = {
  value: PropTypes.number,
  max: PropTypes.number,
  className: PropTypes.string,
  indicatorClassName: PropTypes.string,
};

export default Progress;
