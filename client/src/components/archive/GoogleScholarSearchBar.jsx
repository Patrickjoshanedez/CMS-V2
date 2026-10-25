import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Search, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { cn } from '@/lib/utils';

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
 * GoogleScholarSearchBar
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

  const handleScopeChange = (value) => {
    onScopeChange(value);
    setShowSuggestions(false);
    setActiveIndex(-1);
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
      <Card
        className={cn(
          'p-2 transition-all sm:p-0',
          isFocused
            ? 'border-primary ring-1 ring-primary shadow-md'
            : 'border-border/80 hover:border-border',
        )}
      >
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 items-center gap-2 sm:flex sm:gap-0"
        >
          {/* Scope Selector Dropdown */}
          <div className="min-w-0 sm:order-1 sm:shrink-0 sm:border-r sm:border-border/70">
            <Select
              value={scope}
              onValueChange={handleScopeChange}
              onOpenChange={(open) => {
                if (open) {
                  setShowSuggestions(false);
                  setActiveIndex(-1);
                }
              }}
            >
              <SelectTrigger
                aria-label="Search scope"
                className="h-11 min-h-[44px] w-full border-0 bg-transparent px-3 text-xs font-medium shadow-none hover:bg-muted/40 focus-visible:ring-0 focus-visible:ring-offset-0 sm:w-auto sm:min-w-32"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="w-52">
                <SelectItem value="all">Full-Text</SelectItem>
                <SelectItem value="title">Title Only</SelectItem>
                <SelectItem value="metadata">Authors &amp; Meta</SelectItem>
                <SelectItem value="doi">DOI Match</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Main Search Input with Browser Normalization */}
          <div className="relative col-span-2 flex min-w-0 items-center sm:order-2 sm:flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
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
              className="h-11 min-h-[44px] min-w-0 appearance-none border-0 bg-transparent pl-10 pr-10 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-sm [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
            />

            {Boolean(query && query.length > 0) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="absolute right-1 size-[44px] min-h-[44px] min-w-[44px] text-muted-foreground sm:size-8 sm:min-h-8 sm:min-w-8"
                aria-label="Clear search query"
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>

          <Button
            type="submit"
            className="h-11 min-h-[44px] w-full text-xs tracking-wide sm:order-3 sm:mr-1.5 sm:h-9 sm:w-auto sm:shrink-0"
          >
            <Search className="size-3.5" aria-hidden="true" />
            Search
          </Button>
        </form>
      </Card>

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
          className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-border bg-popover p-0 shadow-lg animate-in fade-in-50 zoom-in-95"
        >
          <div className="p-1.5 space-y-0.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3 text-primary" aria-hidden="true" />
              Suggested Research Topics
            </div>
            {filteredSuggestions.map((item, idx) => {
              const isSelected = activeIndex === idx;
              return (
                <Button
                  key={item}
                  id={`archive-suggestion-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  variant="ghost"
                  size="sm"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  className={cn(
                    'h-9 min-h-[44px] w-full justify-start gap-2.5 rounded-md px-3 text-left text-xs',
                    isSelected && 'bg-primary/10 font-medium text-primary hover:bg-primary/10',
                  )}
                >
                  <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{item}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

GoogleScholarSearchBar.propTypes = {
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  scope: PropTypes.string.isRequired,
  onScopeChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onClear: PropTypes.func,
  totalResults: PropTypes.number,
};
