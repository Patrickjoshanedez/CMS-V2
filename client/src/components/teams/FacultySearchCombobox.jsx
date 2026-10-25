import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';

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
 * Extract 2-letter initials for avatar badge
 */
export function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * FacultySearchCombobox — Accessible, searchable dropdown combobox for assigning faculty members.
 * Supports real-time text search by full name, email, or institutional role with candidate cards.
 */
export default function FacultySearchCombobox({
  id,
  value,
  onChange,
  facultyList = [],
  conflictMap = {},
  workloadMap = {},
  placeholder = '-- Select faculty member --',
  emptyLabel = '-- None (Unassigned) --',
  isLoading = false,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);

  const selectedFaculty = useMemo(
    () => facultyList.find((f) => getId(f._id) === getId(value)),
    [facultyList, value],
  );

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

  const handleOpenChange = (nextOpen) => {
    setIsOpen(nextOpen);
    if (!nextOpen) setSearchTerm('');
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      {/* Combobox Trigger */}
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          disabled={disabled || isLoading}
          className={cn('h-9 w-full justify-between px-3 text-xs font-normal', className)}
        >
          <div className="flex items-center gap-2 truncate min-w-0 flex-1 mr-2">
            {selectedFaculty ? (
              <>
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/80 bg-primary/10 text-primary font-bold text-[9px]">
                  {getInitials(
                    [selectedFaculty.firstName, selectedFaculty.lastName]
                      .filter(Boolean)
                      .join(' ') || selectedFaculty.email,
                  )}
                </div>
                <span className="truncate font-semibold text-foreground">
                  {[selectedFaculty.firstName, selectedFaculty.middleName, selectedFaculty.lastName]
                    .filter(Boolean)
                    .join(' ')}
                </span>
                <Badge
                  variant={
                    getDisplayRole(selectedFaculty.role) === 'Instructor' ? 'warning' : 'info'
                  }
                  className="shrink-0 px-1.5 py-0 text-[10px] font-normal"
                >
                  [{getDisplayRole(selectedFaculty.role)}]
                </Badge>
                {selectedFaculty.email && (
                  <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                    ({selectedFaculty.email})
                  </span>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 truncate text-muted-foreground">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{placeholderText}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0',
                isOpen && 'rotate-180',
              )}
            />
          </div>
        </Button>
      </PopoverTrigger>

      {/* Dropdown Floating Panel */}
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchInputRef.current?.focus();
        }}
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg p-0 shadow-xl"
      >
        <div id={`${id}-listbox`} role="listbox" aria-labelledby={id}>
          {/* Search Input Box */}
          <div className="p-2 border-b border-border/60 bg-muted/20">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
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
                aria-label="Search faculty by name or email"
                className="h-8 pl-8 pr-7 text-xs"
              />
              {searchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1 size-7 min-h-7 min-w-7 p-0 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1 divide-y divide-border/40">
            {/* Unassign / None Option */}
            {emptyLabel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                role="option"
                aria-selected={!value}
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={cn(
                  'h-auto min-h-11 w-full min-w-0 justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors',
                  !value
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <span>{emptyLabel}</span>
                {!value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </Button>
            )}

            {filteredFaculty.map((fac) => {
              const facId = getId(fac._id);
              const isSelected = facId === getId(value);
              const conflictRole = conflictMap?.[facId] || conflictMap?.[String(fac._id)];
              const isConflicted = Boolean(conflictRole);
              const displayRole = getDisplayRole(fac.role);
              const fullName = [fac.firstName, fac.middleName, fac.lastName]
                .filter(Boolean)
                .join(' ');
              const initials = getInitials(fullName || fac.email);
              const workload = workloadMap?.[facId] ?? workloadMap?.[String(fac._id)];

              return (
                <Button
                  key={fac._id}
                  type="button"
                  variant="ghost"
                  size="sm"
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
                    'h-auto min-h-11 w-full min-w-0 justify-between rounded-md p-2 pt-1.5 text-left text-xs transition-colors group',
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : isConflicted
                        ? 'opacity-50 cursor-not-allowed bg-muted/20 text-muted-foreground'
                        : 'text-foreground hover:bg-muted/80',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/80 bg-primary/10 text-primary font-semibold text-[11px]">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate font-semibold text-foreground">{fullName}</span>
                        <Badge
                          variant={displayRole === 'Instructor' ? 'warning' : 'info'}
                          className="shrink-0 px-1.5 py-0 text-[10px] font-normal"
                        >
                          [{displayRole}]
                        </Badge>
                        {typeof workload === 'number' && (
                          <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                            {workload} team{workload === 1 ? '' : 's'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 truncate mt-0.5">
                        {fac.email && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {fac.email}
                          </span>
                        )}
                        {isConflicted && (
                          <span className="text-[10px] text-warning-foreground font-medium italic truncate">
                            · Already {conflictRole}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary ml-2" />}
                </Button>
              );
            })}

            {filteredFaculty.length === 0 && (
              <div className="py-5 text-center text-xs text-muted-foreground">
                {searchTerm ? `No faculty found matching "${searchTerm}"` : 'No faculty available'}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

FacultySearchCombobox.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  facultyList: PropTypes.arrayOf(PropTypes.object),
  conflictMap: PropTypes.objectOf(PropTypes.string),
  workloadMap: PropTypes.objectOf(PropTypes.number),
  placeholder: PropTypes.string,
  emptyLabel: PropTypes.string,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
