import { useEffect, useRef } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

/**
 * AutoExpandingTextarea
 *
 * Ghost auto-resizing textarea that expands vertically without internal scrollbars.
 * In resting state, renders as clean document typography; on hover or focus,
 * surfaces subtle editing borders and focus rings.
 */
export default function AutoExpandingTextarea({
  value = '',
  onChange,
  onBlur,
  placeholder = '',
  disabled = false,
  readOnly = false,
  savingStatus = null, // 'saving' | 'saved' | 'error' | null
  className = '',
  minRows = 1,
  ...props
}) {
  const textareaRef = useRef(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, minRows * 20)}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  const handleChange = (e) => {
    resize();
    if (onChange) onChange(e);
  };

  const isEditable = !disabled && !readOnly;

  return (
    <div className="relative group w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        rows={minRows}
        className={`w-full resize-none overflow-hidden text-xs sm:text-sm leading-relaxed transition-colors font-sans ${
          isEditable
            ? 'border border-transparent hover:border-border/60 focus:border-primary/60 focus:ring-1 focus:ring-primary/40 focus:bg-background/70 rounded px-2 py-1.5 focus:outline-none'
            : 'border-none bg-transparent px-1 py-1 cursor-default select-text'
        } ${className}`}
        {...props}
      />
      {savingStatus && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 text-[10px] pointer-events-none print:hidden">
          {savingStatus === 'saving' && (
            <span className="flex items-center gap-1 text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border shadow-xs">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
          {savingStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-background/80 px-1.5 py-0.5 rounded border border-emerald-500/30 shadow-xs">
              <Check className="h-2.5 w-2.5" />
              <span>Saved</span>
            </span>
          )}
          {savingStatus === 'error' && (
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-background/80 px-1.5 py-0.5 rounded border border-rose-500/30 shadow-xs">
              <AlertCircle className="h-2.5 w-2.5" />
              <span>Error</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
