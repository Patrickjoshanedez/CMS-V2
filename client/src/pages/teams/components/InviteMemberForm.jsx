import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useInviteCandidates, useInviteMember } from '@/hooks/useTeams';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/Popover';
import { Spinner } from '@/components/ui/Spinner';
import { Copy, Send, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

export default function InviteMemberForm({ teamId }) {
  const [email, setEmail] = useState('');
  const [lastInviteCode, setLastInviteCode] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 220);

    return () => window.clearTimeout(timerId);
  }, [query]);

  const { data: candidates = [], isFetching: isFetchingCandidates } = useInviteCandidates(
    teamId,
    debouncedQuery,
  );

  const inviteMember = useInviteMember({
    onSuccess: (result) => {
      const invitedName = result?.data?.invitedUser?.fullName || result?.data?.invitedUser?.email;
      toast.success(
        result?.message ||
          (invitedName
            ? `You have successfully invited ${invitedName} to the team.`
            : 'Invitation sent successfully.'),
      );
      const generatedInviteCode = result?.data?.invite?.inviteCode;
      if (generatedInviteCode) {
        setLastInviteCode(generatedInviteCode);
      }
      setEmail('');
      setQuery('');
      setDebouncedQuery('');
      setShowSuggestions(false);
      setSelectedCandidate(null);
    },
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to send invite.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;

    const isSelectedMatch =
      selectedCandidate?.email?.toLowerCase?.() === normalizedEmail.toLowerCase();

    if (isSelectedMatch && selectedCandidate?.canInvite === false) {
      const blockingWarning = selectedCandidate.warnings?.find((warning) => warning.blocksInvite);
      toast.error(blockingWarning?.message || 'This student cannot be invited yet.');
      return;
    }

    inviteMember.mutate({ teamId, email: normalizedEmail });
  };

  return (
    <div className="space-y-3">
      {lastInviteCode && (
        <Alert variant="success" className="rounded-xl p-4">
          <AlertDescription>
            <div className="text-sm font-medium">
              Invite sent! Share this code with your teammate:
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1.5">
                {lastInviteCode.split('').map((char, i) => (
                  <div
                    key={i}
                    className="flex h-10 w-9 items-center justify-center rounded-md border-2 border-success/30 bg-background text-base font-bold tracking-widest text-foreground"
                  >
                    {char}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={async () => {
                  await navigator.clipboard.writeText(lastInviteCode);
                  toast.success('Invite code copied to clipboard.');
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex min-w-0 gap-2">
        <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
          <PopoverAnchor asChild>
            <div className="min-w-0 flex-1">
              <Input
                aria-label="Search student by name or email"
                placeholder="Type a name (e.g. Leon) or email"
                type="text"
                value={email}
                onChange={(e) => {
                  const value = e.target.value;
                  setEmail(value);
                  setQuery(value);
                  setShowSuggestions(true);
                  if (selectedCandidate?.email?.toLowerCase?.() !== value.trim().toLowerCase()) {
                    setSelectedCandidate(null);
                  }
                }}
                onFocus={() => {
                  if ((debouncedQuery || query).length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
                required
                disabled={inviteMember.isPending}
                autoComplete="off"
              />
            </div>
          </PopoverAnchor>

          {(debouncedQuery.length >= 2 || query.trim().length >= 2) && (
            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={4}
              onOpenAutoFocus={(event) => event.preventDefault()}
              className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
            >
              {isFetchingCandidates ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Spinner className="h-3.5 w-3.5" />
                  Searching students...
                </div>
              ) : candidates.length > 0 ? (
                <>
                  <ul className="max-h-72 overflow-auto py-1">
                    {candidates.map((candidate) => {
                      const blockingWarnings = (candidate.warnings || []).filter(
                        (w) => w?.blocksInvite,
                      );
                      const softWarnings = (candidate.warnings || []).filter(
                        (w) => w && !w.blocksInvite,
                      );
                      const isBlocked = blockingWarnings.length > 0;
                      const hasSoftWarning = softWarnings.length > 0;

                      return (
                        <li key={candidate._id}>
                          <Button
                            type="button"
                            variant="ghost"
                            className={[
                              'h-auto min-h-0 w-full flex-col items-stretch gap-0.5 whitespace-normal rounded-none px-3 py-2.5 text-left font-normal',
                              isBlocked ? 'bg-destructive/5 hover:bg-destructive/10' : '',
                              !isBlocked && hasSoftWarning
                                ? 'bg-warning/5 hover:bg-warning/10'
                                : '',
                            ].join(' ')}
                            onClick={() => {
                              setEmail(candidate.email);
                              setQuery(candidate.email);
                              setDebouncedQuery(candidate.email);
                              setShowSuggestions(false);
                              setSelectedCandidate(candidate);
                            }}
                          >
                            {/* Name + email row */}
                            <span className="flex items-start gap-2">
                              <span className="min-w-0 flex-1">
                                <span
                                  className={[
                                    'block truncate text-sm font-medium',
                                    isBlocked ? 'text-destructive/80' : '',
                                  ].join(' ')}
                                >
                                  {candidate.fullName}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {candidate.email}
                                </span>
                              </span>
                              {isBlocked && (
                                <span className="mt-0.5 shrink-0">
                                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                </span>
                              )}
                              {!isBlocked && hasSoftWarning && (
                                <span className="mt-0.5 shrink-0">
                                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                                </span>
                              )}
                            </span>

                            {/* Blocking reasons — always visible */}
                            {blockingWarnings.map((w, i) => (
                              <span
                                key={i}
                                className="flex items-start gap-1 pl-0 text-[11px] leading-snug text-destructive"
                              >
                                <X className="mt-px size-3 shrink-0" aria-hidden="true" />
                                <span>{w.message}</span>
                              </span>
                            ))}

                            {/* Soft warnings — always visible */}
                            {softWarnings.map((w, i) => (
                              <span
                                key={i}
                                className="flex items-start gap-1 pl-0 text-[11px] leading-snug text-warning-foreground"
                              >
                                <AlertTriangle
                                  className="mt-px size-3 shrink-0 text-warning"
                                  aria-hidden="true"
                                />
                                <span>{w.message}</span>
                              </span>
                            ))}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No matching students found.
                </div>
              )}
            </PopoverContent>
          )}
        </Popover>

        <Button
          type="submit"
          size="sm"
          aria-label="Invite teammate"
          disabled={inviteMember.isPending || !email.trim()}
          loading={inviteMember.isPending}
          loadingText="Inviting"
          className="shrink-0"
        >
          {!inviteMember.isPending && <Send className="h-4 w-4" />}
          <span>Invite</span>
        </Button>
      </form>
    </div>
  );
}

InviteMemberForm.propTypes = {
  teamId: PropTypes.string.isRequired,
};
