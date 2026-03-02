import { forwardRef, useState, useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * FloatingInput — Custom input with a floating label that animates
 * upward on focus or when a value is present.
 *
 * On focus the border glows with the system's gradient palette.
 * Supports an optional trailing action slot (e.g. password reveal toggle).
 */
const FloatingInput = forwardRef(
  ({ label, error, className, type = 'text', trailing, ...props }, ref) => {
    const fallbackId = useId();
    const inputId = props.id || fallbackId;
    const [focused, setFocused] = useState(false);

    /** The label floats when the input is focused OR has a value. */
    const hasValue = props.value !== undefined ? !!props.value : false;
    const isFloating = focused || hasValue;

    return (
      <div className="relative w-full">
        {/* The input */}
        <input
          ref={ref}
          id={inputId}
          type={type}
          {...props}
          placeholder=" "
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            'peer flex h-14 w-full rounded-lg border bg-background px-4 pt-6 pb-2 text-sm text-foreground outline-none transition-all duration-200',
            /* default border */
            'border-input',
            /* focus glow: gradient-inspired purple border + soft shadow */
            'focus:border-[#673ab7] focus:ring-1 focus:ring-[#673ab7]/40 focus:shadow-[0_0_0_3px_rgba(103,58,183,0.12)]',
            /* error state */
            error &&
              'border-[#ff5722] focus:border-[#ff5722] focus:ring-[#ff5722]/40 focus:shadow-[0_0_0_3px_rgba(255,87,34,0.12)]',
            /* disabled */
            'disabled:cursor-not-allowed disabled:opacity-50',
            /* trailing slot padding */
            trailing && 'pr-11',
            className,
          )}
        />

        {/* Floating label */}
        <label
          htmlFor={inputId}
          className={cn(
            'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 origin-left',
            /* floated position */
            (isFloating || props.placeholder !== ' ') &&
              'peer-focus:top-[0.55rem] peer-focus:translate-y-0 peer-focus:scale-75 peer-focus:text-[#673ab7]',
            isFloating && 'top-[0.55rem] translate-y-0 scale-75',
            isFloating && !error && 'text-[#673ab7]',
            isFloating && error && 'text-[#ff5722]',
          )}
        >
          {label}
        </label>

        {/* Trailing action slot (e.g. eye icon) */}
        {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}

        {/* Error message */}
        {error && <p className="mt-1.5 text-xs font-medium text-[#ff5722]">{error}</p>}
      </div>
    );
  },
);

FloatingInput.displayName = 'FloatingInput';

export { FloatingInput };
