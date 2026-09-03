import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const SelectContext = createContext(null);

export function Select({ value, defaultValue, onValueChange, children, disabled }) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [open, setOpen] = useState(false);
  const [displayLabel, setDisplayLabel] = useState('');
  const selectRef = useRef(null);

  const selectedValue = value !== undefined ? value : internalValue;

  const handleSelect = (val, label) => {
    if (value === undefined) setInternalValue(val);
    setDisplayLabel(label);
    onValueChange?.(val);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value: selectedValue,
        onSelect: handleSelect,
        open,
        setOpen,
        disabled,
        displayLabel,
        setDisplayLabel,
      }}
    >
      <div ref={selectRef} className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }) {
  const { open, setOpen, disabled } = useContext(SelectContext);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-expanded={open}
      onClick={() => !disabled && setOpen(!open)}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-1.5 text-xs text-foreground shadow-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-2 shrink-0" />
    </button>
  );
}

export function SelectValue({ placeholder }) {
  const { value, displayLabel } = useContext(SelectContext);
  return (
    <span className="truncate">
      {displayLabel || value || <span className="text-muted-foreground">{placeholder}</span>}
    </span>
  );
}

export function SelectContent({ className, children }) {
  const { open } = useContext(SelectContext);
  if (!open) return null;

  return (
    <div
      className={cn(
        'absolute left-0 top-full z-50 mt-1 max-h-60 w-full min-w-[8rem] overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className }) {
  const { value: selectedValue, onSelect, setDisplayLabel } = useContext(SelectContext);
  const isSelected = selectedValue === value;

  useEffect(() => {
    if (isSelected && children) {
      const label = typeof children === 'string' ? children : String(children);
      setDisplayLabel(label);
    }
  }, [isSelected, children, setDisplayLabel]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => {
        const label = typeof children === 'string' ? children : String(children);
        onSelect(value, label);
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-7 pr-2 text-xs outline-hidden hover:bg-accent hover:text-accent-foreground',
        isSelected && 'bg-accent/60 font-semibold',
        className,
      )}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-3.5 w-3.5 text-primary" />
        </span>
      )}
      <span className="truncate">{children}</span>
    </div>
  );
}

Select.propTypes = {
  value: PropTypes.string,
  defaultValue: PropTypes.string,
  onValueChange: PropTypes.func,
  children: PropTypes.node,
  disabled: PropTypes.bool,
};

SelectTrigger.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

SelectValue.propTypes = {
  placeholder: PropTypes.string,
};

SelectContent.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

SelectItem.propTypes = {
  value: PropTypes.string.isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default Select;
