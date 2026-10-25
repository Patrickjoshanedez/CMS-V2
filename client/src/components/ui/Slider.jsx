import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

/**
 * Slider — shared, accessible range control styled with CMS design tokens.
 */
export const Slider = forwardRef(({ className, min = 0, max = 100, step = 1, ...props }, ref) => (
  <input
    ref={ref}
    type="range"
    min={min}
    max={max}
    step={step}
    className={cn(
      'h-2 w-full cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));

Slider.displayName = 'Slider';

Slider.propTypes = {
  className: PropTypes.string,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  'aria-label': PropTypes.string.isRequired,
};

export default Slider;
