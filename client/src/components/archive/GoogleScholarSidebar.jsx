import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const CURRENT_YEAR = new Date().getFullYear();

export const PROGRAM_OPTIONS = [
  { id: 'all', label: 'All Programs' },
  { id: 'BSIT', label: 'BS Information Technology' },
  { id: 'BSCS', label: 'BS Computer Science' },
  { id: 'BSIS', label: 'BS Information Systems' },
];

export default function GoogleScholarSidebar({
  dateFilter = 'any',
  onDateFilterChange,
  customMinYear = '',
  customMaxYear = '',
  onApplyCustomRange,
  program = 'all',
  onProgramChange,
  courses = [],
  programs: customPrograms,
  sortBy = 'relevance',
  onSortByChange,
  includeCitations = true,
  onToggleCitations,
  includeFilings = true,
  onToggleFilings,
  onResetFilters,
  isOpenMobile = false,
  onCloseMobile,
}) {
  const [localMinYear, setLocalMinYear] = useState(customMinYear || '');
  const [localMaxYear, setLocalMaxYear] = useState(customMaxYear || '');

  const resolvedProgramOptions = useMemo(() => {
    if (Array.isArray(customPrograms) && customPrograms.length > 0) {
      return customPrograms;
    }
    if (Array.isArray(courses) && courses.length > 0) {
      const activeCourses = courses.filter((c) => c && c.isActive !== false);
      return [
        { id: 'all', label: 'All Programs' },
        ...activeCourses.map((c) => ({
          id: c.code || c._id,
          label: c.name || c.code,
          code: c.code,
          _id: c._id,
        })),
      ];
    }
    return PROGRAM_OPTIONS;
  }, [courses, customPrograms]);

  const datePresets = [
    { id: 'any', label: 'Any time' },
    { id: String(CURRENT_YEAR), label: `Since ${CURRENT_YEAR}` },
    { id: String(CURRENT_YEAR - 1), label: `Since ${CURRENT_YEAR - 1}` },
    { id: String(CURRENT_YEAR - 2), label: `Since ${CURRENT_YEAR - 2}` },
    { id: 'custom', label: 'Custom range...' },
  ];

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    onApplyCustomRange(localMinYear, localMaxYear);
  };

  const sidebarContent = (
    <div className="space-y-6 text-sm">
      {/* Active Filter Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filter Results
        </span>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-xs"
          title="Reset all filters"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Date Filtering */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-foreground tracking-tight">Publication Date</h3>
        <ul className="space-y-1">
          {datePresets.map((preset) => {
            const isSelected = dateFilter === preset.id;
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => onDateFilterChange(preset.id)}
                  className={`w-full text-left px-2 py-1 rounded-md text-xs transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'font-bold text-[#1a0dab] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span>{preset.label}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a0dab] dark:bg-blue-400" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Custom Date Range Inputs */}
        {dateFilter === 'custom' && (
          <form onSubmit={handleCustomSubmit} className="pt-2 space-y-2 animate-in fade-in-50">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="From"
                value={localMinYear}
                onChange={(e) => setLocalMinYear(e.target.value)}
                min="1990"
                max="2100"
                className="w-1/2 h-8 px-2 text-xs rounded border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <input
                type="number"
                placeholder="To"
                value={localMaxYear}
                onChange={(e) => setLocalMaxYear(e.target.value)}
                min="1990"
                max="2100"
                className="w-1/2 h-8 px-2 text-xs rounded border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="w-full h-7 text-xs">
              Apply Range
            </Button>
          </form>
        )}
      </div>

      {/* Academic Program Facet */}
      {onProgramChange && (
        <div className="space-y-2.5 pt-2 border-t border-border">
          <h3 className="text-xs font-semibold text-foreground tracking-tight">Academic Program</h3>
          <ul className="space-y-1">
            {resolvedProgramOptions.map((opt) => {
              const isSelected =
                program === opt.id ||
                (opt.code && program === opt.code) ||
                (opt._id && String(program) === String(opt._id));
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => onProgramChange(opt.id)}
                    className={`w-full text-left px-2 py-1 rounded-md text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'font-bold text-[#1a0dab] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                        : 'text-foreground/80 hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1a0dab] dark:bg-blue-400" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Sorting Options */}
      <div className="space-y-2.5 pt-2 border-t border-border">
        <h3 className="text-xs font-semibold text-foreground tracking-tight">Sort By</h3>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onSortByChange('relevance')}
              className={`w-full text-left px-2 py-1 rounded-md text-xs transition-colors flex items-center justify-between ${
                sortBy === 'relevance'
                  ? 'font-bold text-[#1a0dab] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>Sort by relevance</span>
              {sortBy === 'relevance' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a0dab] dark:bg-blue-400" />
              )}
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => onSortByChange('date')}
              className={`w-full text-left px-2 py-1 rounded-md text-xs transition-colors flex items-center justify-between ${
                sortBy === 'date'
                  ? 'font-bold text-[#1a0dab] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>Sort by date</span>
              {sortBy === 'date' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a0dab] dark:bg-blue-400" />
              )}
            </button>
          </li>
        </ul>
      </div>

      {/* Coverage & Filings Options */}
      <div className="space-y-2.5 pt-2 border-t border-border">
        <h3 className="text-xs font-semibold text-foreground tracking-tight">Search Coverage</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground/90 select-none hover:text-foreground">
            <input
              type="checkbox"
              checked={includeCitations}
              onChange={(e) => onToggleCitations?.(e.target.checked)}
              className="rounded border-border text-[#1a0dab] focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span>Include citations</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground/90 select-none hover:text-foreground">
            <input
              type="checkbox"
              checked={includeFilings}
              onChange={(e) => onToggleFilings?.(e.target.checked)}
              className="rounded border-border text-[#1a0dab] focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span>Include capstone filings</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed 240px Sidebar */}
      <aside
        className="hidden md:block w-60 shrink-0 border-r border-border pr-6 select-none"
        aria-label="Search filters sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-out Drawer (<768px Viewport) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden bg-background/80 backdrop-blur-xs flex">
          <div className="relative w-72 max-w-[85vw] h-full bg-card border-r border-border p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-left-50 duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
              <span className="font-semibold text-sm text-foreground">Filter Archive</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
}

GoogleScholarSidebar.propTypes = {
  dateFilter: PropTypes.string.isRequired,
  onDateFilterChange: PropTypes.func.isRequired,
  customMinYear: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  customMaxYear: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onApplyCustomRange: PropTypes.func.isRequired,
  program: PropTypes.string,
  onProgramChange: PropTypes.func,
  courses: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      code: PropTypes.string,
      name: PropTypes.string,
      isActive: PropTypes.bool,
    }),
  ),
  programs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ),
  sortBy: PropTypes.string.isRequired,
  onSortByChange: PropTypes.func.isRequired,
  includeCitations: PropTypes.bool,
  onToggleCitations: PropTypes.func,
  includeFilings: PropTypes.bool,
  onToggleFilings: PropTypes.func,
  onResetFilters: PropTypes.func.isRequired,
  isOpenMobile: PropTypes.bool,
  onCloseMobile: PropTypes.func,
};
