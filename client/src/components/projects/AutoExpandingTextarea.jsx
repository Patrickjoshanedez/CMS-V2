import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Loader2, Check, AlertCircle } from 'lucide-react';

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

  const adjustHeight = () => {
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
  };

  useEffect(() => {
    adjustHeight();
  }, [value, effectiveMinHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [effectiveMinHeight]);

  const handleChange = (e) => {
    adjustHeight();
    if (onChange) {
      onChange(e);
    }
  };

  const isEditable = !disabled && !readOnly;
  const isGhost = variant === 'ghost';

  const baseStyles =
    'w-full resize-none overflow-y-hidden box-border transition-[height,border-color,box-shadow,background-color] duration-200 ease-out leading-relaxed';

  const variantStyles = isGhost
    ? isEditable
      ? 'border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 dark:focus:border-blue-500 dark:focus:ring-blue-900/40 focus:bg-background/70 rounded px-2 py-1.5 focus:outline-hidden text-xs sm:text-sm font-sans'
      : 'border-none bg-transparent px-1 py-1 cursor-default select-text text-xs sm:text-sm'
    : 'rounded-lg border border-slate-400/80 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:bg-[#080d18] dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/40 shadow-xs outline-none';

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-0.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative w-full">
        <textarea
          ref={textareaRef}
          id={id}
          rows={effectiveMinRows}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`${baseStyles} ${variantStyles} ${className}`}
          {...props}
        />
        {savingStatus && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 text-[10px] pointer-events-none print:hidden">
            {savingStatus === 'saving' && (
              <span className="flex items-center gap-1 text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border shadow-2xs">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {savingStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-background/80 px-1.5 py-0.5 rounded border border-emerald-500/30 shadow-2xs">
                <Check className="h-2.5 w-2.5" />
                <span>Saved</span>
              </span>
            )}
            {savingStatus === 'error' && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-background/80 px-1.5 py-0.5 rounded border border-rose-500/30 shadow-2xs">
                <AlertCircle className="h-2.5 w-2.5" />
                <span>Error</span>
              </span>
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
