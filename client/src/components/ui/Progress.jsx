import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

export function Progress({
  value = 0,
  max = 100,
  indeterminate = false,
  className,
  indicatorClassName,
  ...props
}) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      {...(!indeterminate ? { 'aria-valuenow': value } : {})}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-muted',
        indeterminate && 'cms-progress-indeterminate',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-all duration-300 ease-in-out',
          !indeterminate && 'w-full',
          indicatorClassName,
        )}
        style={indeterminate ? undefined : { transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}

Progress.propTypes = {
  value: PropTypes.number,
  max: PropTypes.number,
  indeterminate: PropTypes.bool,
  className: PropTypes.string,
  indicatorClassName: PropTypes.string,
};

export default Progress;
