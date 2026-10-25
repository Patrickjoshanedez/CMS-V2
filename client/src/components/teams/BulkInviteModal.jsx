import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Users,
  UserPlus,
  Search,
  X,
  Check,
  Copy,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/Dialog';
import { useInviteCandidates, useBulkInviteMembers } from '@/hooks/useTeams';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MAX_TEAM_MEMBERS = 4;

export default function BulkInviteModal({
  open,
  onOpenChange,
  teamId,
  teamName,
  currentMembersCount = 1,
  pendingInvites = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stagedCandidates, setStagedCandidates] = useState([]);
  const [batchResults, setBatchResults] = useState(null); // { results, summary }

  // Search input debouncer
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Query candidate students from section
  const { data: candidates = [], isFetching: isSearching } = useInviteCandidates(
    teamId,
    debouncedSearch,
    { enabled: Boolean(open && teamId) },
  );

  // Remaining open slots
  const pendingCount = (pendingInvites || []).filter((inv) => inv?.status === 'pending').length;
  const currentTotal = currentMembersCount + pendingCount;
  const totalAvailableSlots = Math.max(0, MAX_TEAM_MEMBERS - currentTotal);
  const remainingSlotsAfterStaged = Math.max(0, totalAvailableSlots - stagedCandidates.length);

  // Bulk invite mutation
  const bulkInviteMutation = useBulkInviteMembers({
    onSuccess: (data) => {
      const summary = data?.data?.summary || {
        total: stagedCandidates.length,
        succeeded: stagedCandidates.length,
        failed: 0,
      };
      const results = data?.data?.results || [];
      setBatchResults({ results, summary });
      if (summary.failed === 0) {
        toast.success(
          `Sent ${summary.succeeded} invitation${summary.succeeded === 1 ? '' : 's'} successfully!`,
        );
      } else if (summary.succeeded > 0) {
        toast.warning(
          `Sent ${summary.succeeded} invite(s), but ${summary.failed} could not be sent.`,
        );
      } else {
        toast.error('Failed to send invitations. Please check student status.');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to dispatch bulk invitations.');
    },
  });

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setStagedCandidates([]);
      setBatchResults(null);
      setSearchQuery('');
    }
  }, [open]);

  // Stage a candidate from candidate search
  const handleToggleCandidate = (candidate) => {
    const isAlreadyStaged = stagedCandidates.some(
      (c) => c.email.toLowerCase() === candidate.email.toLowerCase(),
    );

    if (isAlreadyStaged) {
      setStagedCandidates((prev) =>
        prev.filter((c) => c.email.toLowerCase() !== candidate.email.toLowerCase()),
      );
      return;
    }

    if (remainingSlotsAfterStaged <= 0) {
      toast.error(
        `Team capacity reached. You can only invite up to ${totalAvailableSlots} teammate(s).`,
      );
      return;
    }

    setStagedCandidates((prev) => [
      ...prev,
      {
        _id: candidate._id,
        fullName: candidate.fullName,
        email: candidate.email,
        warnings: candidate.warnings || [],
      },
    ]);
  };

  // Remove a staged candidate
  const handleRemoveStaged = (emailToRemove) => {
    setStagedCandidates((prev) =>
      prev.filter((c) => c.email.toLowerCase() !== emailToRemove.toLowerCase()),
    );
  };

  // Execute bulk dispatch
  const handleSendInvites = () => {
    if (stagedCandidates.length === 0) return;
    const emails = stagedCandidates.map((c) => c.email);
    bulkInviteMutation.mutate({ teamId, emails });
  };

  // Copy all invite codes
  const handleCopyAllCodes = async () => {
    if (!batchResults?.results) return;
    const successfulCodes = batchResults.results
      .filter((r) => r.success && r.invite?.inviteCode)
      .map(
        (r) =>
          `${r.invitedUser?.fullName || r.email}: ${r.invite?.inviteCode} (Expires: ${new Date(r.invite?.expiresAt).toLocaleDateString()})`,
      )
      .join('\n');

    if (!successfulCodes) {
      toast.error('No invite codes available to copy.');
      return;
    }

    await navigator.clipboard.writeText(successfulCodes);
    toast.success('All invite codes copied to clipboard!');
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen || !bulkInviteMutation.isPending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showClose={false}
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-4rem)] sm:w-full"
        onEscapeKeyDown={(event) => {
          if (bulkInviteMutation.isPending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (bulkInviteMutation.isPending) event.preventDefault();
        }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between border-b border-border/60 p-4 sm:p-5 pb-4 bg-card">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserPlus className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Invite Teammates
              </DialogTitle>
              {teamName && (
                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                  {teamName}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs leading-relaxed">
              Add student teammates to collaborate on your BukSU Capstone project.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={bulkInviteMutation.isPending}
              className="ml-2 shrink-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        {/* Capacity Strip */}
        <div className="shrink-0 bg-muted/40 border-b border-border/60 px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">
              Team Slots: {currentTotal} of {MAX_TEAM_MEMBERS} Filled
            </span>
            <span className="text-muted-foreground hidden sm:inline">
              ({currentMembersCount} active{pendingCount > 0 ? `, ${pendingCount} pending` : ''})
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold">
            {totalAvailableSlots === 0 ? (
              <Badge variant="destructive" className="text-[10px] px-2 py-0">
                Team Full
              </Badge>
            ) : remainingSlotsAfterStaged === 0 ? (
              <Badge variant="warning" className="text-[10px] px-2 py-0">
                Max Staged ({stagedCandidates.length})
              </Badge>
            ) : (
              <Badge variant="success" className="text-[10px] px-2 py-0">
                {remainingSlotsAfterStaged} Slot
                {remainingSlotsAfterStaged === 1 ? '' : 's'} Available
              </Badge>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {batchResults ? (
            /* Results View */
            <div className="space-y-4 animate-in fade-in duration-200">
              <Alert
                variant={batchResults.summary.succeeded > 0 ? 'success' : 'destructive'}
                className="p-4 text-xs"
              >
                <div className="flex items-center justify-between font-semibold">
                  <AlertTitle className="mb-0 text-sm">Invitation Batch Dispatched</AlertTitle>
                  <Badge variant="secondary" className="text-xs">
                    {batchResults.summary.succeeded} of {batchResults.summary.total} Succeeded
                  </Badge>
                </div>
                <AlertDescription className="mt-1">
                  Invite codes have been generated and dispatched via in-app notifications. Share
                  these 6-digit codes with your peers for rapid group joining.
                </AlertDescription>
              </Alert>

              {/* Codes list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Generated Invite Codes
                  </h3>
                  {batchResults.summary.succeeded > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleCopyAllCodes}
                    >
                      <Copy className="h-3 w-3" />
                      Copy All Codes
                    </Button>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {batchResults.results.map((res, i) => {
                    const isSuccess = res.success;
                    const code = res.invite?.inviteCode;
                    const name = res.invitedUser?.fullName || res.email;

                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center justify-between rounded-lg border p-3',
                          isSuccess
                            ? 'border-border/80 bg-muted/20'
                            : 'border-destructive/30 bg-destructive/5',
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{res.email}</p>
                          {!isSuccess && (
                            <p className="text-[10px] text-destructive-text font-medium mt-0.5">
                              {res.error?.message || 'Invite failed'}
                            </p>
                          )}
                        </div>

                        {isSuccess && code && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-background border border-border/80 text-foreground tracking-widest">
                              {code}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Copy code"
                              onClick={async () => {
                                await navigator.clipboard.writeText(code);
                                toast.success(`Copied code ${code} for ${name}`);
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Invite Composer View */
            <div className="space-y-4">
              {/* Search Candidates */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email across sections (e.g. Leon)..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                  {isSearching && (
                    <Spinner className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                  )}
                </div>

                {/* Candidate List Container */}
                <Card className="max-h-56 divide-y divide-border/40 overflow-y-auto bg-background p-0 shadow-none">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                      <Spinner />
                      Searching candidates...
                    </div>
                  ) : candidates.length > 0 ? (
                    candidates.map((candidate) => {
                      const isStaged = stagedCandidates.some(
                        (c) => c.email.toLowerCase() === candidate.email.toLowerCase(),
                      );
                      const blockingWarnings = (candidate.warnings || []).filter(
                        (w) => w?.blocksInvite,
                      );
                      const isBlocked = blockingWarnings.length > 0;
                      const initials = (candidate.fullName || candidate.email || 'S')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <div
                          key={candidate._id}
                          className={cn(
                            'flex items-center justify-between p-2.5 transition-colors',
                            isStaged
                              ? 'bg-primary/5'
                              : isBlocked
                                ? 'bg-muted/10 opacity-75'
                                : 'hover:bg-muted/30',
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/80 bg-primary/10 text-primary font-semibold text-[11px]">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {candidate.fullName}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {candidate.email}
                              </p>
                              {blockingWarnings.map((w, idx) => (
                                <p
                                  key={idx}
                                  className="text-[10px] text-destructive-text font-medium flex items-center gap-1 mt-0.5"
                                >
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  {w.message}
                                </p>
                              ))}
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant={isStaged ? 'default' : 'outline'}
                            disabled={isBlocked || (!isStaged && remainingSlotsAfterStaged <= 0)}
                            className={cn(
                              'h-7 text-xs px-2.5 shrink-0 gap-1',
                              isStaged && 'bg-primary hover:bg-primary/90 text-primary-foreground',
                            )}
                            onClick={() => handleToggleCandidate(candidate)}
                          >
                            {isStaged ? (
                              <>
                                <Check className="h-3 w-3" />
                                Staged
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3 w-3" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      icon={Users}
                      compact
                      title={
                        debouncedSearch ? 'No matching students found' : 'No classmates available'
                      }
                      description={
                        debouncedSearch
                          ? 'Try a different name or email search.'
                          : 'No unassigned classmates were found in your section. Search above to look across sections.'
                      }
                      className="rounded-none border-0 bg-transparent shadow-none"
                    />
                  )}
                </Card>
              </div>

              {/* Staged Candidates Tray */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-primary" />
                    Staged for Invitation ({stagedCandidates.length} of {totalAvailableSlots})
                  </span>
                  {stagedCandidates.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setStagedCandidates([])}
                      className="h-8 text-[11px] text-destructive-text hover:text-destructive-text"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                {stagedCandidates.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stagedCandidates.map((c) => (
                      <div
                        key={c.email}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-foreground shadow-2xs animate-in zoom-in-95 duration-150"
                      >
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">
                          {c.fullName ? c.fullName[0].toUpperCase() : 'S'}
                        </div>
                        <span className="font-medium truncate max-w-[160px] sm:max-w-[200px]">
                          {c.fullName || c.email}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveStaged(c.email)}
                          className="size-7 min-h-7 min-w-7 rounded-full p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text"
                          aria-label={`Remove ${c.fullName || c.email}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={ClipboardList}
                    compact
                    title="No teammates staged yet"
                    description="Search and click Add on students above to invite them."
                    className="rounded-lg border-border/80 bg-muted/10"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 flex-row items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-5 sm:justify-between">
          {batchResults ? (
            <div className="flex w-full justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8 px-4"
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={bulkInviteMutation.isPending}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={bulkInviteMutation.isPending || stagedCandidates.length === 0}
                loading={bulkInviteMutation.isPending}
                loadingText="Sending Invitations..."
                onClick={handleSendInvites}
                className="text-xs h-8 px-4 gap-1.5 font-medium"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Send {stagedCandidates.length} Invitation
                {stagedCandidates.length === 1 ? '' : 's'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

BulkInviteModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  teamId: PropTypes.string.isRequired,
  teamName: PropTypes.string,
  currentMembersCount: PropTypes.number,
  pendingInvites: PropTypes.array,
};
