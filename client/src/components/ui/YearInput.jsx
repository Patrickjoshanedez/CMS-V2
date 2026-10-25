import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

/**
 * YearInput — Simple year input field for creating academic years.
 * Converts single year input (2024) to required format (2024-2025).
 */
export function YearInput({ id, value, onChange, placeholder = '2025', required = false }) {
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
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={decrementYear}
        disabled={!displayValue || !/^\d{4}$/.test(displayValue)}
        className="shrink-0"
        title="Decrease year"
        aria-label="Decrease year"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      <Input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength="4"
        required={required}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label="Academic year"
        className={`min-w-0 flex-1 text-center tabular-nums ${isFocused ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''}`}
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={incrementYear}
        disabled={!displayValue || !/^\d{4}$/.test(displayValue)}
        className="shrink-0"
        title="Increase year"
        aria-label="Increase year"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
    </div>
  );
}
