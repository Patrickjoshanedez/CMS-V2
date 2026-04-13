import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from './Button';

/**
 * YearPicker — Interactive year selector for academic years.
 * Displays year only (e.g., 2024) and automatically generates the full academic year format (2024-2025).
 */
export function YearPicker({ value, onChange, years = [], disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(null);
  const [viewStartYear, setViewStartYear] = useState(null);

  // Extract start year from value (e.g., "2024-2025" → 2024)
  useEffect(() => {
    if (value) {
      const year = parseInt(value.split('-')[0], 10);
      setDisplayYear(year);
      setViewStartYear(year - 2);
    } else {
      const currentYear = new Date().getFullYear();
      setDisplayYear(null);
      setViewStartYear(currentYear - 2);
    }
  }, [value]);

  const handleYearClick = (year) => {
    const academicYear = `${year}-${year + 1}`;
    onChange(academicYear);
    setIsOpen(false);
  };

  const handlePrevious = () => {
    setViewStartYear((prev) => prev - 4);
  };

  const handleNext = () => {
    setViewStartYear((prev) => prev + 4);
  };

  const displayValue = value
    ? `${value.split('-')[0]}-${value.split('-')[1]}`
    : years.length > 0
      ? years[0]
      : `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // Create 4x2 grid of years
  const yearGrid = [];
  for (let i = 0; i < 8; i++) {
    yearGrid.push(viewStartYear + i);
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-left font-medium">{displayValue}</span>
        <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-md border border-input bg-background p-3 shadow-md">
          {/* Year Grid Navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevious}
              className="rounded p-1 hover:bg-accent"
              aria-label="Previous years"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-muted-foreground">
              {viewStartYear} – {viewStartYear + 7}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="rounded p-1 hover:bg-accent"
              aria-label="Next years"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Year Grid (4 columns x 2 rows) */}
          <div className="grid grid-cols-4 gap-2">
            {yearGrid.map((year) => {
              const isActive = displayYear === year;
              const isAvailable = years.length === 0 || years.some((y) => y.startsWith(String(year)));

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearClick(year)}
                  disabled={!isAvailable}
                  className={`rounded py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isAvailable
                        ? 'bg-accent hover:bg-accent/80'
                        : 'cursor-not-allowed opacity-40'
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>

          {/* Close Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
