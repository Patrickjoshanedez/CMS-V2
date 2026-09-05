import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { UserCheck, X, Loader2, Search, ChevronDown, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { useUsers } from '@/hooks/useUsers';
import { useAssignCommittee, useTeamById } from '@/hooks/useTeams';
import { ROLES } from '@cms/shared';
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
 * Format a user option for select displays.
 */
export function formatUserOption(user) {
  if (!user) return '';
  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
  const email = user.email ? ` (${user.email})` : '';
  const displayRole = getDisplayRole(user.role);
  return `${fullName} [${displayRole}]${email}`;
}

/**
 * FacultySearchCombobox — Accessible, searchable dropdown combobox for assigning faculty members.
 * Supports real-time text search by full name, email, or institutional role.
 */
export function FacultySearchCombobox({
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
    () => facultyList.find((f) => String(f._id) === String(value)),
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
      className={cn('relative w-full', isOpen ? 'z-30' : 'z-auto', className)}
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
          'w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs flex items-center justify-between transition-colors focus:outline-none focus:ring-1 focus:ring-primary select-none text-left',
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
              const isSelected = String(fac._id) === String(value);
              const conflictRole = conflictMap?.[fac._id];
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
                  onClick={() => {
                    if (isConflicted) {
                      toast.error(
                        `${fullName} is already assigned as ${conflictRole} on this team.`,
                      );
                      return;
                    }
                    onChange(fac._id);
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

const DEFAULT_PANELIST_IDS = Object.freeze([]);

export function AssignCommitteeDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  initialAdviserId = '',
  initialSecretaryId = '',
  initialPanelistIds = DEFAULT_PANELIST_IDS,
  onSuccess,
}) {
  const [adviserId, setAdviserId] = useState(initialAdviserId || '');
  const [secretaryId, setSecretaryId] = useState(initialSecretaryId || '');
  const [panelist1Id, setPanelist1Id] = useState(initialPanelistIds[0] || '');
  const [panelist2Id, setPanelist2Id] = useState(initialPanelistIds[1] || '');
  const [panelist3Id, setPanelist3Id] = useState(initialPanelistIds[2] || '');

  const { data: teamData } = useTeamById(teamId, {
    enabled: Boolean(open && teamId),
  });

  const serializedPanelists = initialPanelistIds.join(',');

  useEffect(() => {
    if (!open) return;
    if (teamData) {
      const existingAdviser =
        teamData.adviserId?._id ||
        teamData.adviserId ||
        teamData.assignment?.adviser?._id ||
        teamData.assignment?.adviser ||
        '';
      const existingSecretary =
        teamData.secretaryId?._id ||
        teamData.secretaryId ||
        teamData.assignment?.secretary?._id ||
        teamData.assignment?.secretary ||
        '';
      const existingPanelists = (
        teamData.panelistIds?.length ? teamData.panelistIds : teamData.assignment?.panelists || []
      ).map((p) => p?._id || p);

      setAdviserId(String(existingAdviser || initialAdviserId || ''));
      setSecretaryId(String(existingSecretary || initialSecretaryId || ''));
      setPanelist1Id(String(existingPanelists[0] || initialPanelistIds[0] || ''));
      setPanelist2Id(String(existingPanelists[1] || initialPanelistIds[1] || ''));
      setPanelist3Id(String(existingPanelists[2] || initialPanelistIds[2] || ''));
    } else {
      setAdviserId(initialAdviserId || '');
      setSecretaryId(initialSecretaryId || '');
      setPanelist1Id(initialPanelistIds[0] || '');
      setPanelist2Id(initialPanelistIds[1] || '');
      setPanelist3Id(initialPanelistIds[2] || '');
    }
  }, [open, teamData, initialAdviserId, initialSecretaryId, serializedPanelists]);

  // Conflict maps: prevent selecting the same faculty member across roles on the same team
  const adviserConflictMap = useMemo(() => {
    const map = {};
    if (secretaryId) map[secretaryId] = 'Committee Secretary';
    if (panelist1Id) map[panelist1Id] = 'Panelist 1 (Lead / Chair)';
    if (panelist2Id) map[panelist2Id] = 'Panelist 2 (Member)';
    if (panelist3Id) map[panelist3Id] = 'Panel Member 3';
    return map;
  }, [secretaryId, panelist1Id, panelist2Id, panelist3Id]);

  const secretaryConflictMap = useMemo(() => {
    const map = {};
    if (adviserId) map[adviserId] = 'Capstone Adviser';
    if (panelist1Id) map[panelist1Id] = 'Panelist 1 (Lead / Chair)';
    if (panelist2Id) map[panelist2Id] = 'Panelist 2 (Member)';
    if (panelist3Id) map[panelist3Id] = 'Panel Member 3';
    return map;
  }, [adviserId, panelist1Id, panelist2Id, panelist3Id]);

  const panelist1ConflictMap = useMemo(() => {
    const map = {};
    if (adviserId) map[adviserId] = 'Capstone Adviser';
    if (secretaryId) map[secretaryId] = 'Committee Secretary';
    if (panelist2Id) map[panelist2Id] = 'Panelist 2 (Member)';
    if (panelist3Id) map[panelist3Id] = 'Panel Member 3';
    return map;
  }, [adviserId, secretaryId, panelist2Id, panelist3Id]);

  const panelist2ConflictMap = useMemo(() => {
    const map = {};
    if (adviserId) map[adviserId] = 'Capstone Adviser';
    if (secretaryId) map[secretaryId] = 'Committee Secretary';
    if (panelist1Id) map[panelist1Id] = 'Panelist 1 (Lead / Chair)';
    if (panelist3Id) map[panelist3Id] = 'Panel Member 3';
    return map;
  }, [adviserId, secretaryId, panelist1Id, panelist3Id]);

  const panelist3ConflictMap = useMemo(() => {
    const map = {};
    if (adviserId) map[adviserId] = 'Capstone Adviser';
    if (secretaryId) map[secretaryId] = 'Committee Secretary';
    if (panelist1Id) map[panelist1Id] = 'Panelist 1 (Lead / Chair)';
    if (panelist2Id) map[panelist2Id] = 'Panelist 2 (Member)';
    return map;
  }, [adviserId, secretaryId, panelist1Id, panelist2Id]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Fetch candidate faculty users (faculty, adviser, panelist accounts — strictly excluding instructors)
  const { data: facultyData, isLoading: isFacultyLoading } = useUsers(
    {
      role: 'faculty',
      isActive: true,
      page: 1,
      limit: 200,
    },
    { enabled: open },
  );

  const allFaculty = useMemo(() => {
    const list = facultyData?.users || [];
    return list
      .filter((u) => {
        const rawRole = String(u.role || '').toLowerCase();
        // Strictly exclude instructors and students
        if (rawRole === 'instructor' || rawRole === ROLES.INSTRUCTOR) return false;
        if (rawRole === 'student' || rawRole === ROLES.STUDENT) return false;
        return (
          rawRole === 'faculty' ||
          rawRole === ROLES.FACULTY ||
          rawRole === 'adviser' ||
          rawRole === ROLES.ADVISER ||
          rawRole === 'panelist' ||
          rawRole === ROLES.PANELIST
        );
      })
      .sort((a, b) => {
        const nameA = [a.firstName, a.lastName].filter(Boolean).join(' ').toLowerCase();
        const nameB = [b.firstName, b.lastName].filter(Boolean).join(' ').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [facultyData]);

  const assignCommitteeMutation = useAssignCommittee({
    onSuccess: (data) => {
      toast.success(data?.message || 'Faculty committee assigned and team notified.');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to assign committee.');
    },
  });

  // Handle ESC key press to close modal (only if no combobox dropdown is open)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !assignCommitteeMutation.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, assignCommitteeMutation.isPending, onOpenChange]);

  const filledSlotsCount = [
    Boolean(adviserId),
    Boolean(secretaryId),
    Boolean(panelist1Id),
    Boolean(panelist2Id),
    Boolean(panelist3Id),
  ].filter(Boolean).length;

  const isComplete = filledSlotsCount === 5;

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!teamId) {
      toast.error('Team ID is required.');
      return;
    }

    // Validate mutual exclusion between roles on this team
    const assignments = [
      { role: 'Capstone Adviser', id: adviserId },
      { role: 'Committee Secretary', id: secretaryId },
      { role: 'Panelist 1 (Lead / Chair)', id: panelist1Id },
      { role: 'Panelist 2 (Member)', id: panelist2Id },
      { role: 'Panel Member 3', id: panelist3Id },
    ].filter((item) => Boolean(item.id));

    const seenIds = new Map();
    for (const { role, id } of assignments) {
      if (seenIds.has(id)) {
        const existingRole = seenIds.get(id);
        toast.error(
          `A faculty member cannot serve as both ${existingRole} and ${role} on the same team.`,
        );
        return;
      }
      seenIds.set(id, role);
    }

    const panelistIds = [panelist1Id, panelist2Id, panelist3Id].filter(Boolean);

    assignCommitteeMutation.mutate({
      teamId,
      adviserId: adviserId || null,
      secretaryId: secretaryId || null,
      panelistIds,
    });
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex min-h-full items-center justify-center overflow-y-auto bg-black/75 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="committee-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !assignCommitteeMutation.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <Card
        className="w-full max-w-lg border-border/80 bg-card shadow-2xl overflow-hidden my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[inherit] overflow-hidden">
          {/* Header - Fixed and permanently visible at top */}
          <div className="shrink-0 flex items-start justify-between border-b border-border/60 p-5 pb-4 bg-card">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 id="committee-dialog-title" className="text-base font-semibold text-foreground">
                  Assign Faculty Committee
                </h3>
                {teamName && (
                  <Badge variant="secondary" className="text-[11px] font-medium">
                    {teamName}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Appoint verified department faculty to oversee defense milestones and evaluate
                grading rubrics.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={assignCommitteeMutation.isPending}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body Content - Scrollable when vertical viewport is constrained */}
          <CardContent className="flex-1 overflow-y-auto space-y-3.5 p-5 pb-6">
            {/* Committee Assignment Progress Meter */}
            <div
              className={cn(
                'rounded-lg border p-3 text-xs transition-colors',
                isComplete
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
              )}
            >
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" />
                  Committee Slots: {filledSlotsCount} of 5 Filled
                </span>
                <span className="text-[11px] font-semibold">
                  {isComplete ? 'Complete' : 'In Progress'}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                <div
                  className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-0.5',
                    adviserId
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  <span className="truncate">Adviser: {adviserId ? '✓' : '—'}</span>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-0.5',
                    secretaryId
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  <span className="truncate">Secretary: {secretaryId ? '✓' : '—'}</span>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-0.5',
                    [panelist1Id, panelist2Id, panelist3Id].filter(Boolean).length === 3
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  <span className="truncate">
                    Panelists: {[panelist1Id, panelist2Id, panelist3Id].filter(Boolean).length}/3
                  </span>
                </div>
              </div>
              {!isComplete && (
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Scroll down to assign Secretary and all 3 Defense Panelists for full defense
                  authorization.
                </p>
              )}
            </div>

            {/* Adviser Assignment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="adviser-select" className="text-xs font-semibold">
                  Capstone Adviser
                </Label>
                <span className="text-[10px] text-muted-foreground">Technical mentor</span>
              </div>
              <FacultySearchCombobox
                id="adviser-select"
                value={adviserId}
                onChange={setAdviserId}
                facultyList={allFaculty}
                conflictMap={adviserConflictMap}
                placeholder="-- Select faculty adviser --"
                isLoading={isFacultyLoading}
                disabled={isFacultyLoading || assignCommitteeMutation.isPending}
              />
              <p className="text-[11px] text-muted-foreground">
                Will guide technical development and approve manuscript drafts.
              </p>
            </div>

            {/* Committee Secretary Assignment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="secretary-select" className="text-xs font-semibold">
                  Committee Secretary
                </Label>
                <span className="text-[10px] text-muted-foreground">Compliance & minutes</span>
              </div>
              <FacultySearchCombobox
                id="secretary-select"
                value={secretaryId}
                onChange={setSecretaryId}
                facultyList={allFaculty}
                conflictMap={secretaryConflictMap}
                placeholder="-- Assign committee secretary --"
                isLoading={isFacultyLoading}
                disabled={isFacultyLoading || assignCommitteeMutation.isPending}
              />
              <p className="text-[11px] text-muted-foreground">
                Responsible for minutes, defense scoring sheets, and compliance verification.
              </p>
            </div>

            {/* Defense Panelists Assignment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Defense Panelists</Label>
                <span className="text-[10px] text-muted-foreground">1 to 3 panelists</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Panelist 1 (Lead / Chair)
                  </span>
                  <FacultySearchCombobox
                    id="panelist-1-select"
                    value={panelist1Id}
                    onChange={setPanelist1Id}
                    facultyList={allFaculty}
                    conflictMap={panelist1ConflictMap}
                    placeholder="-- Panelist 1 (Lead / Chair) --"
                    isLoading={isFacultyLoading}
                    disabled={isFacultyLoading || assignCommitteeMutation.isPending}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Panelist 2 (Member)
                  </span>
                  <FacultySearchCombobox
                    id="panelist-2-select"
                    value={panelist2Id}
                    onChange={setPanelist2Id}
                    facultyList={allFaculty}
                    conflictMap={panelist2ConflictMap}
                    placeholder="-- Panelist 2 (Member) --"
                    isLoading={isFacultyLoading}
                    disabled={isFacultyLoading || assignCommitteeMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Panel Member 3
                </span>
                <FacultySearchCombobox
                  id="panelist-3-select"
                  value={panelist3Id}
                  onChange={setPanelist3Id}
                  facultyList={allFaculty}
                  conflictMap={panelist3ConflictMap}
                  placeholder="-- Panel Member 3 --"
                  isLoading={isFacultyLoading}
                  disabled={isFacultyLoading || assignCommitteeMutation.isPending}
                />
              </div>

              <p className="text-[11px] text-muted-foreground pt-0.5">
                Evaluates proposal, midterm progress, and final oral defense presentations.
              </p>
            </div>
          </CardContent>

          {/* Footer - Fixed and permanently visible at bottom */}
          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-5 py-3.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={assignCommitteeMutation.isPending}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={assignCommitteeMutation.isPending}
              className="text-xs h-8 bg-primary hover:bg-primary/90 gap-1.5 font-medium"
            >
              {assignCommitteeMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Appointments...
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  Confirm & Notify Team
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

AssignCommitteeDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  teamId: PropTypes.string,
  teamName: PropTypes.string,
  initialAdviserId: PropTypes.string,
  initialSecretaryId: PropTypes.string,
  initialPanelistIds: PropTypes.arrayOf(PropTypes.string),
  onSuccess: PropTypes.func,
};

export default AssignCommitteeDialog;
