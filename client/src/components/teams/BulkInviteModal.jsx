import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  Users,
  UserPlus,
  Mail,
  Search,
  X,
  Check,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Loader2,
  Sparkles,
  ClipboardList,
  Trash2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
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
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'paste'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pasteText, setPasteText] = useState('');
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
      setPasteText('');
      setActiveTab('search');
    }
  }, [open]);

  // Keyboard accessibility: ESC to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !bulkInviteMutation.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, bulkInviteMutation.isPending]);

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

  // Parse batch paste text
  const handleParsePaste = () => {
    if (!pasteText.trim()) return;

    // Split on commas, semicolons, whitespace, or newlines
    const rawTokens = pasteText
      .split(/[\s,;\n]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = [...new Set(rawTokens.filter((token) => emailRegex.test(token)))];

    if (validEmails.length === 0) {
      toast.error('No valid email addresses found. Please enter valid student email(s).');
      return;
    }

    const alreadyStagedEmails = new Set(stagedCandidates.map((c) => c.email.toLowerCase()));
    const newEmails = validEmails.filter((email) => !alreadyStagedEmails.has(email));

    if (newEmails.length === 0) {
      toast.info('All parsed emails are already staged.');
      return;
    }

    const availableSlots = remainingSlotsAfterStaged;
    if (availableSlots <= 0) {
      toast.error(`Team is at capacity. Only ${totalAvailableSlots} slot(s) allowed.`);
      return;
    }

    const toAdd = newEmails.slice(0, availableSlots).map((email) => ({
      _id: `manual-${email}`,
      fullName: email,
      email,
      warnings: [],
      isManual: true,
    }));

    setStagedCandidates((prev) => [...prev, ...toAdd]);
    setPasteText('');

    if (newEmails.length > availableSlots) {
      toast.warning(
        `Added ${availableSlots} email(s). Truncated ${newEmails.length - availableSlots} due to team capacity.`,
      );
    } else {
      toast.success(`Added ${newEmails.length} student email(s) to staging.`);
    }
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

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-invite-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !bulkInviteMutation.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <Card
        className="w-full max-w-2xl border-border/80 bg-card shadow-2xl overflow-hidden my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between border-b border-border/60 p-4 sm:p-5 pb-4 bg-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserPlus className="h-4 w-4" />
              </div>
              <h2
                id="bulk-invite-dialog-title"
                className="text-lg font-bold tracking-tight text-foreground"
              >
                Bulk Invite Teammates
              </h2>
              {teamName && (
                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                  {teamName}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add up to 3 student teammates to collaborate on your BukSU Capstone project.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={bulkInviteMutation.isPending}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
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
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                Max Staged ({stagedCandidates.length})
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                {remainingSlotsAfterStaged} Slot
                {remainingSlotsAfterStaged === 1 ? '' : 's'} Available
              </Badge>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {batchResults ? (
            /* Results View */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div
                className={cn(
                  'rounded-xl border p-4 text-xs',
                  batchResults.summary.succeeded > 0
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-destructive/30 bg-destructive/5',
                )}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      batchResults.summary.succeeded > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-destructive',
                    )}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Invitation Batch Dispatched
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {batchResults.summary.succeeded} of {batchResults.summary.total} Succeeded
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Invite codes have been generated and dispatched via in-app notifications. Share
                  these 6-digit codes with your peers for rapid group joining.
                </p>
              </div>

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
                            <p className="text-[10px] text-destructive font-medium mt-0.5">
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
              {/* Modality Tabs */}
              <div className="flex rounded-lg border border-border/60 bg-muted/30 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all',
                    activeTab === 'search'
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Search className="h-3.5 w-3.5" />
                  Search Classmates
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all',
                    activeTab === 'paste'
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Paste Multiple Emails
                </button>
              </div>

              {/* Mode A: Search Section Candidates */}
              {activeTab === 'search' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student by name or email (e.g. Leon, buksu.edu.ph)..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs h-9"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Candidate List Container */}
                  <div className="rounded-lg border border-border/60 bg-background max-h-56 overflow-y-auto divide-y divide-border/40">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching section candidates...
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
                                    className="text-[10px] text-destructive font-medium flex items-center gap-1 mt-0.5"
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
                                isStaged &&
                                  'bg-primary hover:bg-primary/90 text-primary-foreground',
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
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        {debouncedSearch
                          ? 'No matching students found in your section.'
                          : 'Type a name or email above to search classmates.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode B: Paste Multiple Emails */}
              {activeTab === 'paste' && (
                <div className="space-y-2">
                  <Label htmlFor="paste-emails" className="text-xs font-medium text-foreground">
                    Paste Student Emails
                  </Label>
                  <textarea
                    id="paste-emails"
                    rows={4}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="student1@buksu.edu.ph, student2@buksu.edu.ph&#10;student3@buksu.edu.ph"
                    className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">
                      Separate multiple emails with commas, spaces, or newlines.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="text-xs h-7 gap-1"
                      onClick={handleParsePaste}
                      disabled={!pasteText.trim() || remainingSlotsAfterStaged <= 0}
                    >
                      <Sparkles className="h-3 w-3" />
                      Add to Staging
                    </Button>
                  </div>
                </div>
              )}

              {/* Staged Candidates Tray */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-primary" />
                    Staged for Invitation ({stagedCandidates.length} of {totalAvailableSlots})
                  </span>
                  {stagedCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStagedCandidates([])}
                      className="text-[11px] text-destructive hover:underline"
                    >
                      Clear All
                    </button>
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
                        <button
                          type="button"
                          onClick={() => handleRemoveStaged(c.email)}
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          aria-label={`Remove ${c.fullName || c.email}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 p-4 text-center text-xs text-muted-foreground">
                    No teammates staged yet. Search and add students or paste emails above.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 sm:px-5 py-3">
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
                onClick={handleSendInvites}
                className="text-xs h-8 px-4 bg-primary hover:bg-primary/90 gap-1.5 font-medium"
              >
                {bulkInviteMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending Invitations...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Send {stagedCandidates.length} Invitation
                    {stagedCandidates.length === 1 ? '' : 's'}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

BulkInviteModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  teamId: PropTypes.string.isRequired,
  teamName: PropTypes.string,
  currentMembersCount: PropTypes.number,
  pendingInvites: PropTypes.array,
};
