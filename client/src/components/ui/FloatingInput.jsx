import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

/**
 * FloatingInput — compatibility field composition using the shared shadcn Input
 * and Label primitives. The exported name remains stable for existing forms.
 */
const FloatingInput = forwardRef(
  ({ label, error, className, type = 'text', trailing, id, ...props }, ref) => {
    const fallbackId = useId();
    const inputId = id || props.id || fallbackId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full space-y-1.5">
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <div className="relative">
          <Input
            ref={ref}
            {...props}
            id={inputId}
            type={type}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : props['aria-describedby']}
            className={cn(trailing && 'pr-10', className)}
          />
          {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
        </div>

        {/* Error message */}
        {error && (
          <p id={errorId} className="text-sm font-medium text-destructive-text">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FloatingInput.displayName = 'FloatingInput';

export { FloatingInput };
