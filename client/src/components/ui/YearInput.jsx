import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * YearInput — Simple year input field for creating academic years.
 * Converts single year input (2024) to required format (2024-2025).
 */
export function YearInput({ value, onChange, placeholder = '2025', required = false }) {
  const [isFocused, setIsFocused] = useState(false);

  // Extract year from value if in YYYY-YYYY format
  const displayValue = value && value.includes('-') ? value.split('-')[0] : value;

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Only allow digits
    if (!/^\d*$/.test(inputValue)) return;
    
    // Convert to YYYY-YYYY format once user has entered 4 digits
    if (inputValue.length === 4) {
      const year = parseInt(inputValue, 10);
      onChange(`${year}-${year + 1}`);
    } else {
      onChange(inputValue);
    }
  };

  const incrementYear = () => {
    if (displayValue && /^\d{4}$/.test(displayValue)) {
      const year = parseInt(displayValue, 10);
      onChange(`${year + 1}-${year + 2}`);
    }
  };

  const decrementYear = () => {
    if (displayValue && /^\d{4}$/.test(displayValue)) {
      const year = parseInt(displayValue, 10);
      if (year > 2000) {
        onChange(`${year - 1}-${year}`);
      }
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-md border border-input bg-background">
      <button
        type="button"
        onClick={decrementYear}
        disabled={!displayValue || !/^\d{4}$/.test(displayValue)}
        className="p-1 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        title="Decrease year"
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength="4"
        required={required}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 border-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
      />

      <button
        type="button"
        onClick={incrementYear}
        disabled={!displayValue || !/^\d{4}$/.test(displayValue)}
        className="p-1 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        title="Increase year"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
    </div>
  );
}
