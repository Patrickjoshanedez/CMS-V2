import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';

/**
 * AutoExpandingTextarea
 *
 * Dynamically expandable textarea component that measures scroll height on typing
 * and adjusts container height with smooth CSS transitions. Replaces single-line
 * inputs and fixed textareas to eliminate horizontal text cutoffs and awkward scrollbars.
 *
 * @param {Object} props
 * @param {string} [props.label] - Optional field label.
 * @param {boolean} [props.required=false] - Whether field displays required asterisk.
 * @param {string} [props.value=''] - Current textarea value.
 * @param {Function} [props.onChange] - Change handler.
 * @param {Function} [props.onBlur] - Blur handler.
 * @param {string} [props.placeholder=''] - Placeholder text.
 * @param {boolean} [props.disabled=false] - Disabled state.
 * @param {boolean} [props.readOnly=false] - Read-only state.
 * @param {'saving'|'saved'|'error'|null} [props.savingStatus=null] - Floating save badge status.
 * @param {string} [props.className=''] - Additional CSS classes.
 * @param {number} [props.minRows=1] - Minimum rows rendered.
 * @param {number} [props.rows] - Alias for minRows.
 * @param {number} [props.minHeight] - Minimum height in pixels (defaults to 40 for 1-row, 72 for 3-row).
 * @param {'default'|'outline'|'ghost'} [props.variant='default'] - Visual style variant.
 * @param {string} [props.id] - Element ID.
 */
export function AutoExpandingTextarea({
  label,
  required = false,
  value = '',
  onChange,
  onBlur,
  placeholder = '',
  disabled = false,
  readOnly = false,
  savingStatus = null,
  className = '',
  minRows = 1,
  rows,
  minHeight,
  variant = 'default',
  id,
  ...props
}) {
  const textareaRef = useRef(null);

  const effectiveMinRows = rows || minRows || 1;
  const effectiveMinHeight =
    minHeight || (effectiveMinRows > 1 ? Math.max(effectiveMinRows * 24 + 16, 68) : 40);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Preserve parent viewport scroll position before height reset to eliminate jitter/jumping
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    // Reset height temporarily to correctly compute shrinking scrollHeight
    textarea.style.height = 'auto';
    // Apply the scroll height dynamically with minimum height constraint
    textarea.style.height = `${Math.max(textarea.scrollHeight, effectiveMinHeight)}px`;
    if (typeof window !== 'undefined' && window.scrollY !== scrollY) {
      window.scrollTo({ top: scrollY });
    }
  }, [effectiveMinHeight]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  const handleChange = (e) => {
    adjustHeight();
    if (onChange) {
      onChange(e);
    }
  };

  const isGhost = variant === 'ghost';

  const baseStyles =
    'min-h-0 w-full resize-none overflow-y-hidden box-border leading-relaxed transition-[height] duration-200 ease-out';

  const variantStyles = isGhost
    ? readOnly
      ? 'cursor-default select-text border-none bg-transparent px-1 py-1 text-xs shadow-none focus-visible:ring-0 sm:text-sm'
      : 'rounded border-transparent bg-transparent px-2 py-1.5 font-sans text-xs shadow-none hover:border-input focus-visible:border-ring focus-visible:bg-background/70 focus-visible:ring-1 sm:text-sm'
    : 'rounded-lg px-3.5 py-2.5 text-xs shadow-xs sm:text-sm';

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <Label
          htmlFor={id}
          className="mb-0.5 flex items-center gap-1 text-xs font-bold text-foreground"
        >
          {label}{' '}
          {required && (
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          )}
        </Label>
      )}
      <div className="relative w-full">
        <Textarea
          ref={textareaRef}
          id={id}
          rows={effectiveMinRows}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          style={{ minHeight: `${effectiveMinHeight}px` }}
          className={`${baseStyles} ${variantStyles} ${savingStatus ? 'pr-20' : ''} ${className}`}
          {...props}
        />
        {savingStatus && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-1 text-[10px] print:hidden"
          >
            {savingStatus === 'saving' && (
              <Badge
                variant="warning"
                className="gap-1 rounded border bg-background/80 px-1.5 py-0.5 text-[10px] shadow-2xs"
              >
                <Spinner className="size-2.5" />
                <span>Saving...</span>
              </Badge>
            )}
            {savingStatus === 'saved' && (
              <Badge
                variant="success"
                className="gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] shadow-2xs"
              >
                <Check aria-hidden="true" className="h-2.5 w-2.5" />
                <span>Saved</span>
              </Badge>
            )}
            {savingStatus === 'error' && (
              <Badge
                variant="destructive"
                className="gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] shadow-2xs"
              >
                <AlertCircle aria-hidden="true" className="h-2.5 w-2.5" />
                <span>Error</span>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

AutoExpandingTextarea.propTypes = {
  label: PropTypes.string,
  required: PropTypes.bool,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  savingStatus: PropTypes.oneOf(['saving', 'saved', 'error', null]),
  className: PropTypes.string,
  minRows: PropTypes.number,
  rows: PropTypes.number,
  minHeight: PropTypes.number,
  variant: PropTypes.oneOf(['default', 'outline', 'ghost']),
  id: PropTypes.string,
};

export const ResilientTextarea = AutoExpandingTextarea;
export default AutoExpandingTextarea;
