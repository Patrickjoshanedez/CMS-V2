import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { UserCheck, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { useUsers } from '@/hooks/useUsers';
import { useAssignCommittee } from '@/hooks/useTeams';
import { ROLES } from '@cms/shared';
import { toast } from 'sonner';

/**
 * Format a user option for select displays.
 */
function formatUserOption(user) {
  if (!user) return '';
  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
  const email = user.email ? ` (${user.email})` : '';
  const role = user.role ? ` [${user.role}]` : '';
  return `${fullName}${role}${email}`;
}

export function AssignCommitteeDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  initialAdviserId = '',
  initialSecretaryId = '',
  initialPanelistIds = [],
  onSuccess,
}) {
  const [adviserId, setAdviserId] = useState(initialAdviserId || '');
  const [secretaryId, setSecretaryId] = useState(initialSecretaryId || '');
  const [panelist1Id, setPanelist1Id] = useState(initialPanelistIds[0] || '');
  const [panelist2Id, setPanelist2Id] = useState(initialPanelistIds[1] || '');
  const [panelist3Id, setPanelist3Id] = useState(initialPanelistIds[2] || '');

  useEffect(() => {
    if (open) {
      setAdviserId(initialAdviserId || '');
      setSecretaryId(initialSecretaryId || '');
      setPanelist1Id(initialPanelistIds[0] || '');
      setPanelist2Id(initialPanelistIds[1] || '');
      setPanelist3Id(initialPanelistIds[2] || '');
    }
  }, [open, initialAdviserId, initialSecretaryId, initialPanelistIds]);

  // Fetch candidate faculty users
  const { data: facultyData, isLoading: isFacultyLoading } = useUsers(
    { isActive: true, page: 1, limit: 200 },
    { enabled: open },
  );

  const allFaculty = useMemo(() => {
    const list = facultyData?.users || [];
    return list.filter(
      (u) =>
        u.role === ROLES.INSTRUCTOR ||
        u.role === ROLES.ADVISER ||
        u.role === ROLES.PANELIST ||
        u.role === 'faculty' ||
        u.role === ROLES.ADMIN,
    );
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

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!teamId) {
      toast.error('Team ID is required.');
      return;
    }

    const panelistIds = [panelist1Id, panelist2Id, panelist3Id].filter(Boolean);

    assignCommitteeMutation.mutate({
      teamId,
      adviserId: adviserId || null,
      secretaryId: secretaryId || null,
      panelistIds,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="committee-dialog-title"
    >
      <Card className="w-full max-w-lg border-border/80 bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/60 p-5 pb-4">
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
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <CardContent className="space-y-4 p-5">
            {/* Adviser Assignment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="adviser-select" className="text-xs font-semibold">
                  Capstone Adviser
                </Label>
                <span className="text-[10px] text-muted-foreground">Technical mentor</span>
              </div>
              <select
                id="adviser-select"
                value={adviserId}
                onChange={(e) => setAdviserId(e.target.value)}
                disabled={isFacultyLoading || assignCommitteeMutation.isPending}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Select faculty adviser --</option>
                {allFaculty.map((fac) => (
                  <option key={fac._id} value={fac._id}>
                    {formatUserOption(fac)}
                  </option>
                ))}
              </select>
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
              <select
                id="secretary-select"
                value={secretaryId}
                onChange={(e) => setSecretaryId(e.target.value)}
                disabled={isFacultyLoading || assignCommitteeMutation.isPending}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Assign committee secretary --</option>
                {allFaculty.map((fac) => (
                  <option key={fac._id} value={fac._id}>
                    {formatUserOption(fac)}
                  </option>
                ))}
              </select>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Panelist 1 (Lead / Chair)
                  </span>
                  <select
                    value={panelist1Id}
                    onChange={(e) => setPanelist1Id(e.target.value)}
                    disabled={isFacultyLoading || assignCommitteeMutation.isPending}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Panelist 1 --</option>
                    {allFaculty.map((fac) => (
                      <option key={fac._id} value={fac._id}>
                        {formatUserOption(fac)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Panelist 2 (Member)
                  </span>
                  <select
                    value={panelist2Id}
                    onChange={(e) => setPanelist2Id(e.target.value)}
                    disabled={isFacultyLoading || assignCommitteeMutation.isPending}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Panelist 2 --</option>
                    {allFaculty.map((fac) => (
                      <option key={fac._id} value={fac._id}>
                        {formatUserOption(fac)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Panelist 3 (Optional Member)
                </span>
                <select
                  value={panelist3Id}
                  onChange={(e) => setPanelist3Id(e.target.value)}
                  disabled={isFacultyLoading || assignCommitteeMutation.isPending}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary mt-0.5"
                >
                  <option value="">-- None (Optional) --</option>
                  {allFaculty.map((fac) => (
                    <option key={fac._id} value={fac._id}>
                      {formatUserOption(fac)}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-muted-foreground pt-0.5">
                Evaluates proposal, midterm progress, and final oral defense presentations.
              </p>
            </div>
          </CardContent>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-5 py-3.5">
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
