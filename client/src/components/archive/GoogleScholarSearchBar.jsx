import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Search, X, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const SUGGESTIONS = [
  'Deep Learning Agricultural Yield Prediction',
  'BukSU Campus Geospatial Information System',
  'Automated Capstone Plagiarism Detection',
  'Blockchain Student Credential Verification',
  'Telemedicine Rural Clinic Triage System',
  'IoT Soil Nutrient and Moisture Monitoring',
  'Multi-Tenant E-Governance Citizen Portal',
];

/**
 * ArchiveSearchBar / GoogleScholarSearchBar
 *
 * Minimalist, high-density academic search bar featuring:
 * - Normalized browser input eliminating native double "X" clear buttons.
 * - Accessible Combobox contract (role="combobox", aria-expanded, aria-activedescendant).
 * - Single state-managed clear button with automatic input refocusing.
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape).
 * - Outside pointerdown dismissal for suggestions dropdown.
 */
export default function GoogleScholarSearchBar({
  query,
  onQueryChange,
  scope,
  onScopeChange,
  onSearch,
  onClear,
  totalResults: _totalResults = 0,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filteredSuggestions = SUGGESTIONS.filter(
    (item) => !query || item.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 5);

  // Outside pointerdown listener to dismiss suggestions cleanly
  useEffect(() => {
    const handlePointerDownOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, []);

  const handleSelectSuggestion = useCallback(
    (text) => {
      onQueryChange(text);
      setShowSuggestions(false);
      setActiveIndex(-1);
      onSearch(text);
      inputRef.current?.focus();
    },
    [onQueryChange, onSearch],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && filteredSuggestions[activeIndex]) {
      handleSelectSuggestion(filteredSuggestions[activeIndex]);
      return;
    }
    setShowSuggestions(false);
    setActiveIndex(-1);
    onSearch(query);
  };

  const handleClear = () => {
    onQueryChange('');
    if (onClear) {
      onClear();
    } else {
      onSearch('');
    }
    setShowSuggestions(false);
    setActiveIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }

    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? filteredSuggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(filteredSuggestions[activeIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className={`grid grid-cols-2 items-center gap-2 rounded-lg border bg-card p-2 shadow-xs transition-all sm:flex sm:gap-0 sm:p-0 ${
          isFocused
            ? 'border-primary ring-1 ring-primary shadow-md'
            : 'border-border/80 hover:border-border'
        }`}
      >
        {/* Main Search Input with Browser Normalization */}
        <div className="relative col-span-2 flex min-w-0 items-center sm:order-2 sm:flex-1">
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            id="archive-search-input"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={Boolean(showSuggestions && filteredSuggestions.length > 0)}
            aria-controls="archive-search-suggestions"
            aria-activedescendant={
              activeIndex >= 0 ? `archive-suggestion-${activeIndex}` : undefined
            }
            aria-label="Search BukSU research archive"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setShowSuggestions(true);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={
              scope === 'doi'
                ? 'Enter DOI (e.g. 10.1234/buksu.2025.042)...'
                : scope === 'title'
                  ? 'Search article title...'
                  : 'Search title, author, abstract, or DOI...'
            }
            className="w-full min-w-0 h-11 pl-10 pr-9 bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
          />

          {/* Single Unified Clear Action Button */}
          {Boolean(query && query.length > 0) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              aria-label="Clear search query"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Scope Selector Dropdown */}
        <div className="relative min-w-0 rounded-md border border-border sm:order-1 sm:shrink-0 sm:rounded-none sm:border-0 sm:border-r">
          <select
            value={scope}
            onChange={(e) => onScopeChange(e.target.value)}
            className="h-11 w-full pl-3 pr-8 text-xs font-medium bg-transparent text-foreground rounded-l-lg appearance-none cursor-pointer focus:outline-hidden hover:bg-muted/40 transition-colors sm:w-auto"
            aria-label="Search scope"
          >
            <option value="all" className="bg-card text-foreground">
              Full-Text
            </option>
            <option value="title" className="bg-card text-foreground">
              Title Only
            </option>
            <option value="metadata" className="bg-card text-foreground">
              Authors & Meta
            </option>
            <option value="doi" className="bg-card text-foreground">
              DOI Match
            </option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Single Subtle Submit Trigger */}
        <Button
          type="submit"
          className="h-11 w-full px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium text-xs tracking-wide transition-colors sm:order-3 sm:mr-1.5 sm:h-9 sm:w-auto sm:shrink-0"
        >
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Search
        </Button>
      </form>

      {/* Screen Reader Live Region for Dynamic Suggestion and Result Announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {showSuggestions && filteredSuggestions.length > 0
          ? `${filteredSuggestions.length} research topics suggested. Use up and down arrows to navigate, Enter to select, and Escape to dismiss.`
          : query && showSuggestions
            ? 'No matching suggestion topics.'
            : ''}
      </div>

      {/* Query Suggestions Dropdown (Combobox Listbox) */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          id="archive-search-suggestions"
          role="listbox"
          aria-label="Suggested research topics"
          className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95"
        >
          <div className="p-1.5 space-y-0.5">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Suggested Research Topics
            </div>
            {filteredSuggestions.map((item, idx) => {
              const isSelected = activeIndex === idx;
              return (
                <button
                  key={item}
                  id={`archive-suggestion-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-xs text-foreground transition-colors ${
                    isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/80'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{item}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { GoogleScholarSearchBar as ArchiveSearchBar };

GoogleScholarSearchBar.propTypes = {
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  scope: PropTypes.string.isRequired,
  onScopeChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onClear: PropTypes.func,
  totalResults: PropTypes.number,
};
