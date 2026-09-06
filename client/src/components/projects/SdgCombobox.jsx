import React, { useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, Check, Search, X, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SDG_GOALS } from '@cms/shared';

/**
 * SdgCombobox — High-performance, accessible searchable combobox for UN SDGs.
 * Displays all 17 UN Sustainable Development Goals with real-time keyword filtering,
 * distinct goal badges, and a custom scrollable viewport to eliminate visual cutoffs.
 */
export function SdgCombobox({
  id,
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Select Target SDG...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Match active selection across formatted tag strings (e.g. "SDG 4: Quality Education")
  const selectedGoal = useMemo(() => {
    if (!value) return null;
    return SDG_GOALS.find((goal) => {
      const formatted = `SDG ${goal.id}: ${goal.name}`;
      return formatted === value || String(goal.id) === String(value);
    });
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Real-time filtering across goal number and title
  const filteredGoals = useMemo(() => {
    if (!searchTerm.trim()) return SDG_GOALS;
    const q = searchTerm.toLowerCase().trim();
    return SDG_GOALS.filter((goal) => {
      const matchId = String(goal.id) === q || `sdg ${goal.id}`.includes(q);
      const matchName = goal.name.toLowerCase().includes(q);
      return matchId || matchName;
    });
  }, [searchTerm]);

  const handleSelect = (goal) => {
    const formatted = `SDG ${goal.id}: ${goal.name}`;
    onChange?.(formatted, goal);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', isOpen ? 'z-40' : 'z-auto', className)}
    >
      {/* Combobox Trigger Button */}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
          } else if (e.key === 'ArrowDown' && !isOpen) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-1.5 text-xs text-foreground shadow-xs transition-colors',
          'hover:bg-muted/40 focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          isOpen && 'ring-1 ring-ring border-primary/50',
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedGoal ? (
            <>
              <span className="shrink-0 rounded bg-primary/10 text-primary font-mono font-bold px-1.5 py-0.5 text-[10px] border border-primary/20">
                SDG {selectedGoal.id}
              </span>
              <span className="truncate font-medium text-foreground">{selectedGoal.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 opacity-50" />
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 opacity-50 ml-2 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180 opacity-100 text-primary',
          )}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="UN Sustainable Development Goals"
          className={cn(
            'absolute left-0 top-full z-50 mt-1 w-full min-w-[18rem] rounded-lg border border-border bg-popover text-popover-foreground shadow-xl',
            'animate-in fade-in-80 zoom-in-95 duration-150',
          )}
        >
          {/* Quick Search Header */}
          <div className="p-2 border-b border-border/50 bg-muted/20">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search 17 UN SDGs (e.g. 4, climate, health)..."
                className="h-8 w-full rounded-md bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground border border-input focus:outline-hidden focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setSearchTerm('');
                  } else if (e.key === 'Enter' && filteredGoals.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredGoals[0]);
                  }
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Goals Scrollable List */}
          <div className="max-h-64 overflow-y-auto p-1 space-y-0.5 scrollbar-thin">
            {filteredGoals.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No matching UN SDG goals found for &ldquo;{searchTerm}&rdquo;.
              </div>
            ) : (
              filteredGoals.map((goal) => {
                const formatted = `SDG ${goal.id}: ${goal.name}`;
                const isSelected = selectedGoal?.id === goal.id;

                return (
                  <div
                    key={goal.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(goal)}
                    className={cn(
                      'group relative flex w-full cursor-pointer select-none items-center justify-between rounded-md px-2.5 py-2 text-xs outline-hidden transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isSelected
                        ? 'bg-accent/70 font-semibold text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className={cn(
                          'shrink-0 rounded font-mono font-bold px-1.5 py-0.5 text-[10px] border transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/80 text-foreground border-border/80 group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary',
                        )}
                      >
                        SDG {goal.id}
                      </span>
                      <span className="truncate group-hover:text-foreground">{goal.name}</span>
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Informational Footer */}
          <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-1.5 text-[10.5px] text-muted-foreground">
            <span>
              Showing {filteredGoals.length} of {SDG_GOALS.length} UN Goals
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground/80">
              UN 2030 Agenda
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

SdgCombobox.propTypes = {
  id: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  placeholder: PropTypes.string,
};

export default SdgCombobox;
