import { forwardRef, useState, useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * FloatingInput — Custom input with a floating label that animates
 * upward on focus or when a value is present (including browser autofill).
 *
 * On focus the border glows with BukSU Royal Blue / Academic Gold.
 * Supports an optional trailing action slot (e.g. password reveal toggle).
 */
const FloatingInput = forwardRef(
  ({ label, error, className, type = 'text', trailing, id, ...props }, ref) => {
    const fallbackId = useId();
    const inputId = id || props.id || fallbackId;
    const [focused, setFocused] = useState(false);

    const hasValue = props.value !== undefined && props.value !== null && props.value !== '';
    const isFloating = focused || hasValue;

    return (
      <div className="relative w-full">
        {/* The input */}
        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder=" "
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            'floating-input peer flex h-14 w-full rounded-lg border bg-background px-4 pt-5 pb-1.5 text-sm text-foreground outline-none transition-all duration-200',
            /* default border */
            'border-slate-300 dark:border-[#1E3356] bg-white dark:bg-[#0B1B3D]/60',
            /* focus glow: BukSU Royal Blue & Academic Gold */
            'focus:border-[#1A448A] dark:focus:border-[#E5A823] focus:ring-1 focus:ring-[#1A448A]/40 dark:focus:ring-[#E5A823]/40 focus:shadow-[0_0_0_3px_rgba(26,68,138,0.15)] dark:focus:shadow-[0_0_0_3px_rgba(229,168,35,0.15)]',
            /* error state */
            error &&
              'border-rose-500 focus:border-rose-500 focus:ring-rose-500/40 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]',
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
            'floating-label pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 origin-left select-none',
            /* floated position in CSS via peer selectors */
            'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:scale-75 peer-focus:font-medium',
            'peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-75',
            'peer-autofill:top-2 peer-autofill:translate-y-0 peer-autofill:scale-75',
            /* focus color */
            'peer-focus:text-[#1A448A] dark:peer-focus:text-[#E5A823]',
            /* floated state from React */
            isFloating && 'floating-label-active top-2 translate-y-0 scale-75 font-medium',
            isFloating &&
              !error &&
              (focused
                ? 'text-[#1A448A] dark:text-[#E5A823]'
                : 'text-slate-500 dark:text-slate-400'),
            error &&
              'text-rose-500 dark:text-rose-400 peer-focus:text-rose-500 dark:peer-focus:text-rose-400',
          )}
        >
          {label}
        </label>

        {/* Trailing action slot (e.g. eye icon) */}
        {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}

        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-xs font-medium text-rose-500 dark:text-rose-400">{error}</p>
        )}
      </div>
    );
  },
);

FloatingInput.displayName = 'FloatingInput';

export { FloatingInput };
