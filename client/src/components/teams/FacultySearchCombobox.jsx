import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Maps system roles to institutional display nomenclature:
 * - 'instructor' -> 'Instructor'
 * - Any other faculty role (adviser, panelist, chair, secretary, faculty, etc.) -> 'Faculty'
 */
export function getDisplayRole(role) {
  if (!role) return 'Faculty';
  const normalized = String(role).toLowerCase().trim();
  if (normalized === 'instructor') return 'Instructor';
  return 'Faculty';
}

/**
 * Safely extracts a string ID from a string, ObjectId, or populated user object.
 */
export function getId(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val._id) return String(val._id);
  if (val.id) return String(val.id);
  return String(val);
}

/**
 * FacultySearchCombobox — Accessible, searchable dropdown combobox for assigning faculty members.
 * Supports real-time text search by full name, email, or institutional role.
 */
export default function FacultySearchCombobox({
  id,
  value,
  onChange,
  facultyList = [],
  conflictMap = {},
  placeholder = '-- Select faculty member --',
  isLoading = false,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedFaculty = useMemo(
    () => facultyList.find((f) => getId(f._id) === getId(value)),
    [facultyList, value],
  );

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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredFaculty = useMemo(() => {
    if (!searchTerm.trim()) return facultyList;
    const q = searchTerm.toLowerCase().trim();
    return facultyList.filter((fac) => {
      const name = [fac.firstName, fac.middleName, fac.lastName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const email = (fac.email || '').toLowerCase();
      const rawRole = (fac.role || '').toLowerCase();
      const displayRole = getDisplayRole(fac.role).toLowerCase();
      return (
        name.includes(q) || email.includes(q) || rawRole.includes(q) || displayRole.includes(q)
      );
    });
  }, [facultyList, searchTerm]);

  const placeholderText = useMemo(() => {
    if (isLoading) return '-- Loading faculty members... --';
    if (facultyList.length === 0) return '-- No eligible faculty found --';
    return placeholder;
  }, [isLoading, facultyList.length, placeholder]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', isOpen ? 'z-40' : 'z-auto', className)}
    >
      {/* Combobox Trigger */}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && isOpen) {
            e.stopPropagation();
            setIsOpen(false);
            setSearchTerm('');
          }
        }}
        className={cn(
          'w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs flex items-center justify-between transition-colors focus:outline-none focus:ring-1 focus:ring-primary select-none text-left cursor-pointer',
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-1 ring-primary border-primary',
        )}
      >
        <div className="flex items-center gap-1.5 truncate min-w-0 flex-1 mr-2">
          {selectedFaculty ? (
            <>
              <span className="truncate font-medium text-foreground">
                {[selectedFaculty.firstName, selectedFaculty.middleName, selectedFaculty.lastName]
                  .filter(Boolean)
                  .join(' ')}
              </span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded font-normal shrink-0',
                  getDisplayRole(selectedFaculty.role) === 'Instructor'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                )}
              >
                [{getDisplayRole(selectedFaculty.role)}]
              </span>
              {selectedFaculty.email && (
                <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                  ({selectedFaculty.email})
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground truncate">{placeholderText}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedFaculty && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchTerm('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onChange('');
                  setSearchTerm('');
                }
              }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border border-border bg-popover text-popover-foreground shadow-xl animate-in fade-in-80 zoom-in-95 duration-100 overflow-hidden"
          role="listbox"
          aria-labelledby={id}
        >
          {/* Search Input Box */}
          <div className="p-1.5 border-b border-border/60 bg-muted/30">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setIsOpen(false);
                    setSearchTerm('');
                  }
                }}
                placeholder="Search faculty by name or email..."
                className="w-full h-8 pl-8 pr-7 text-xs rounded bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 p-0.5 text-muted-foreground hover:text-foreground rounded"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto p-1 space-y-0.5">
            {/* Unassign / None Option */}
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={cn(
                'w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors flex items-center justify-between cursor-pointer',
                !value
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <span>-- None (Unassigned) --</span>
              {!value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>

            {filteredFaculty.map((fac) => {
              const facId = getId(fac._id);
              const isSelected = facId === getId(value);
              const conflictRole = conflictMap?.[facId] || conflictMap?.[String(fac._id)];
              const isConflicted = Boolean(conflictRole);
              const displayRole = getDisplayRole(fac.role);
              const fullName = [fac.firstName, fac.middleName, fac.lastName]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={fac._id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isConflicted}
                  disabled={isConflicted}
                  title={
                    isConflicted
                      ? `${fullName} is already assigned as ${conflictRole} on this team.`
                      : undefined
                  }
                  onClick={() => {
                    if (isConflicted) {
                      toast.error(
                        `${fullName} is already assigned as ${conflictRole} on this team.`,
                      );
                      return;
                    }
                    onChange(facId);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors flex items-center justify-between group cursor-pointer',
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : isConflicted
                        ? 'opacity-50 cursor-not-allowed bg-muted/20 text-muted-foreground'
                        : 'text-foreground hover:bg-muted/80',
                  )}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate font-medium">{fullName}</span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded font-normal shrink-0',
                          displayRole === 'Instructor'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                        )}
                      >
                        [{displayRole}]
                      </span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      {fac.email && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {fac.email}
                        </span>
                      )}
                      {isConflicted && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium italic truncate">
                          · Already {conflictRole}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary ml-2" />}
                </button>
              );
            })}

            {filteredFaculty.length === 0 && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {searchTerm ? `No faculty found matching "${searchTerm}"` : 'No faculty available'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

FacultySearchCombobox.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  facultyList: PropTypes.arrayOf(PropTypes.object),
  conflictMap: PropTypes.objectOf(PropTypes.string),
  placeholder: PropTypes.string,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
