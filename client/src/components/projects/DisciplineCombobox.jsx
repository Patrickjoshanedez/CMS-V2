import React, { useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, Check, Search, X, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IT_DISCIPLINES, getDisciplineByNameOrId } from '@cms/shared';

/**
 * DisciplineCombobox — High-performance, accessible searchable combobox for IT Fields of Discipline.
 * Displays all institutional BSIT fields of discipline with real-time keyword filtering,
 * domain category badges, scope descriptions, and a scrollable viewport to eliminate visual cutoffs.
 */
export function DisciplineCombobox({
  id,
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Select IT Field of Discipline...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Match active selection across discipline name or id
  const selectedDiscipline = useMemo(() => {
    if (!value) return null;
    return getDisciplineByNameOrId(value) || IT_DISCIPLINES.find((d) => d.name === value);
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

  // Real-time filtering across discipline name, domain, and description
  const filteredDisciplines = useMemo(() => {
    if (!searchTerm.trim()) return IT_DISCIPLINES;
    const q = searchTerm.toLowerCase().trim();
    return IT_DISCIPLINES.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchDomain = item.domain.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchId = item.id.toLowerCase().includes(q);
      return matchName || matchDomain || matchDesc || matchId;
    });
  }, [searchTerm]);

  const handleSelect = (discipline) => {
    onChange?.(discipline.name, discipline);
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
          {selectedDiscipline ? (
            <>
              <span className="shrink-0 rounded bg-primary/10 text-primary font-medium px-1.5 py-0.5 text-[10px] border border-primary/20">
                {selectedDiscipline.domain}
              </span>
              <span className="truncate font-medium text-foreground">
                {selectedDiscipline.name}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 opacity-50" />
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
          aria-label="IT Fields of Discipline"
          className={cn(
            'absolute left-0 top-full z-50 mt-1 w-full min-w-[20rem] rounded-lg border border-border bg-popover text-popover-foreground shadow-xl',
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
                placeholder="Search disciplines (e.g. AI, cyber, web, cloud)..."
                className="h-8 w-full rounded-md bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground border border-input focus:outline-hidden focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setSearchTerm('');
                  } else if (e.key === 'Enter' && filteredDisciplines.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredDisciplines[0]);
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

          {/* Disciplines Scrollable List */}
          <div className="max-h-64 overflow-y-auto p-1 space-y-1 scrollbar-thin">
            {filteredDisciplines.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No matching IT disciplines found for &ldquo;{searchTerm}&rdquo;.
              </div>
            ) : (
              filteredDisciplines.map((item) => {
                const isSelected = selectedDiscipline?.id === item.id;

                return (
                  <div
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'group relative flex flex-col w-full cursor-pointer select-none rounded-md px-2.5 py-2 text-xs outline-hidden transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isSelected ? 'bg-accent/70 text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={cn(
                            'shrink-0 rounded font-medium px-1.5 py-0.5 text-[9.5px] border transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/80 text-foreground border-border/80 group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary',
                          )}
                        >
                          {item.domain}
                        </span>
                        <span
                          className={cn(
                            'truncate font-medium group-hover:text-foreground',
                            isSelected && 'font-semibold text-foreground',
                          )}
                        >
                          {item.name}
                        </span>
                      </div>

                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                    </div>

                    {item.description && (
                      <p className="mt-1 text-[10.5px] text-muted-foreground group-hover:text-foreground/80 line-clamp-1 pl-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Informational Footer */}
          <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-1.5 text-[10.5px] text-muted-foreground">
            <span>
              Showing {filteredDisciplines.length} of {IT_DISCIPLINES.length} IT Disciplines
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground/80">
              BukSU BSIT Curriculum
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

DisciplineCombobox.propTypes = {
  id: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  placeholder: PropTypes.string,
};

export default DisciplineCombobox;
