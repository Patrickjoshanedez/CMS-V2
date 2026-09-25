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
 * Format a user option for select displays.
 */
export function formatUserOption(user) {
  if (!user) return '';
  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
  const email = user.email ? ` (${user.email})` : '';
  const displayRole = getDisplayRole(user.role);
  return `${fullName} [${displayRole}]${email}`;
}

import FacultySearchCombobox from './FacultySearchCombobox';
export { FacultySearchCombobox };

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
  const [adviserId, setAdviserId] = useState(getId(initialAdviserId));
  const [secretaryId, setSecretaryId] = useState(getId(initialSecretaryId));
  const [panelist1Id, setPanelist1Id] = useState(getId(initialPanelistIds[0]));
  const [panelist2Id, setPanelist2Id] = useState(getId(initialPanelistIds[1]));
  const [panelist3Id, setPanelist3Id] = useState(getId(initialPanelistIds[2]));

  const { data: teamData } = useTeamById(teamId, {
    enabled: Boolean(open && teamId),
  });

  const serializedPanelists = initialPanelistIds.join(',');

  useEffect(() => {
    if (!open) return;
    if (teamData) {
      const existingAdviser =
        getId(teamData.adviserId) || getId(teamData.assignment?.adviser) || getId(initialAdviserId);
      const existingSecretary =
        getId(teamData.secretaryId) ||
        getId(teamData.assignment?.secretary) ||
        getId(initialSecretaryId);
      const rawPanelists = teamData.panelistIds?.length
        ? teamData.panelistIds
        : teamData.assignment?.panelists || [];
      const existingPanelists = rawPanelists.map(getId);

      setAdviserId(existingAdviser);
      setSecretaryId(existingSecretary);
      setPanelist1Id(existingPanelists[0] || getId(initialPanelistIds[0]));
      setPanelist2Id(existingPanelists[1] || getId(initialPanelistIds[1]));
      setPanelist3Id(existingPanelists[2] || getId(initialPanelistIds[2]));
    } else {
      setAdviserId(getId(initialAdviserId));
      setSecretaryId(getId(initialSecretaryId));
      setPanelist1Id(getId(initialPanelistIds[0]));
      setPanelist2Id(getId(initialPanelistIds[1]));
      setPanelist3Id(getId(initialPanelistIds[2]));
    }
  }, [open, teamData, initialAdviserId, initialSecretaryId, serializedPanelists]);

  // Conflict maps: prevent selecting the same faculty member across roles on the same team
  const adviserConflictMap = useMemo(() => {
    const map = {};
    if (secretaryId) map[getId(secretaryId)] = 'Committee Secretary';
    if (panelist1Id) map[getId(panelist1Id)] = 'REC / Chair';
    if (panelist2Id) map[getId(panelist2Id)] = 'Panel Member 1';
    if (panelist3Id) map[getId(panelist3Id)] = 'Panel Member 2';
    return map;
  }, [secretaryId, panelist1Id, panelist2Id, panelist3Id]);

  const secretaryConflictMap = useMemo(() => {
    const map = {};
    if (adviserId) map[getId(adviserId)] = 'Capstone Adviser';
    if (panelist1Id) map[getId(panelist1Id)] = 'REC / Chair';
    if (panelist2Id) map[getId(panelist2Id)] = 'Panel Member 1';
    if (panelist3Id) map[getId(panelist3Id)] = 'Panel Member 2';
    return map;
  }, [adviserId, panelist1Id, panelist2Id, panelist3Id]);

  const panelist1ConflictMap = useMemo(() => {
    const map = {};
    if (adviserId) map[getId(adviserId)] = 'Capstone Adviser';
    if (secretaryId) map[getId(secretaryId)] = 'Committee Secretary';
    if (panelist2Id) map[getId(panelist2Id)] = 'Panel Member 1';
    if (panelist3Id) map[getId(panelist3Id)] = 'Panel Member 2';
    return map;
  }, [adviserId, secretaryId, panelist2Id, panelist3Id]);

  const panelist2ConflictMap = useMemo(() => {
    const map = {};
    if (adviserId) map[getId(adviserId)] = 'Capstone Adviser';
    if (secretaryId) map[getId(secretaryId)] = 'Committee Secretary';
    if (panelist1Id) map[getId(panelist1Id)] = 'REC / Chair';
    if (panelist3Id) map[getId(panelist3Id)] = 'Panel Member 2';
    return map;
  }, [adviserId, secretaryId, panelist1Id, panelist3Id]);

  const panelist3ConflictMap = useMemo(() => {
    const map = {};
    if (adviserId) map[getId(adviserId)] = 'Capstone Adviser';
    if (secretaryId) map[getId(secretaryId)] = 'Committee Secretary';
    if (panelist1Id) map[getId(panelist1Id)] = 'REC / Chair';
    if (panelist2Id) map[getId(panelist2Id)] = 'Panel Member 1';
    return map;
  }, [adviserId, secretaryId, panelist1Id, panelist2Id]);

  // Guarded selection handlers that strictly prevent duplicate faculty selection across roles
  const handleSelectAdviser = (val) => {
    const id = getId(val);
    if (!id) {
      setAdviserId('');
      return;
    }
    const conflict = adviserConflictMap[id];
    if (conflict) {
      toast.error(`This faculty member is already assigned as ${conflict} on this team.`);
      return;
    }
    setAdviserId(id);
  };

  const handleSelectSecretary = (val) => {
    const id = getId(val);
    if (!id) {
      setSecretaryId('');
      return;
    }
    const conflict = secretaryConflictMap[id];
    if (conflict) {
      toast.error(`This faculty member is already assigned as ${conflict} on this team.`);
      return;
    }
    setSecretaryId(id);
  };

  const handleSelectPanelist1 = (val) => {
    const id = getId(val);
    if (!id) {
      setPanelist1Id('');
      return;
    }
    const conflict = panelist1ConflictMap[id];
    if (conflict) {
      toast.error(`This faculty member is already assigned as ${conflict} on this team.`);
      return;
    }
    setPanelist1Id(id);
  };

  const handleSelectPanelist2 = (val) => {
    const id = getId(val);
    if (!id) {
      setPanelist2Id('');
      return;
    }
    const conflict = panelist2ConflictMap[id];
    if (conflict) {
      toast.error(`This faculty member is already assigned as ${conflict} on this team.`);
      return;
    }
    setPanelist2Id(id);
  };

  const handleSelectPanelist3 = (val) => {
    const id = getId(val);
    if (!id) {
      setPanelist3Id('');
      return;
    }
    const conflict = panelist3ConflictMap[id];
    if (conflict) {
      toast.error(`This faculty member is already assigned as ${conflict} on this team.`);
      return;
    }
    setPanelist3Id(id);
  };

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
      { role: 'Capstone Adviser', id: getId(adviserId) },
      { role: 'Committee Secretary', id: getId(secretaryId) },
      { role: 'Panelist 1 (Lead / Chair)', id: getId(panelist1Id) },
      { role: 'Panelist 2 (Member)', id: getId(panelist2Id) },
      { role: 'Panel Member 3', id: getId(panelist3Id) },
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
          <CardContent className="flex-1 overflow-y-auto space-y-3.5 p-5 pb-36">
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
                onChange={handleSelectAdviser}
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
                onChange={handleSelectSecretary}
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
                  <span className="text-[10px] font-medium text-muted-foreground">REC / Chair</span>
                  <FacultySearchCombobox
                    id="panelist-1-select"
                    value={panelist1Id}
                    onChange={handleSelectPanelist1}
                    facultyList={allFaculty}
                    conflictMap={panelist1ConflictMap}
                    placeholder="-- Select REC / Chair --"
                    isLoading={isFacultyLoading}
                    disabled={isFacultyLoading || assignCommitteeMutation.isPending}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Panel Member 1
                  </span>
                  <FacultySearchCombobox
                    id="panelist-2-select"
                    value={panelist2Id}
                    onChange={handleSelectPanelist2}
                    facultyList={allFaculty}
                    conflictMap={panelist2ConflictMap}
                    placeholder="-- Select Panel Member 1 --"
                    isLoading={isFacultyLoading}
                    disabled={isFacultyLoading || assignCommitteeMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Panel Member 2
                </span>
                <FacultySearchCombobox
                  id="panelist-3-select"
                  value={panelist3Id}
                  onChange={handleSelectPanelist3}
                  facultyList={allFaculty}
                  conflictMap={panelist3ConflictMap}
                  placeholder="-- Select Panel Member 2 --"
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
