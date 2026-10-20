import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useInviteCandidates, useInviteMember } from '@/hooks/useTeams';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckCircle2, Copy, Loader2, Send, AlertTriangle } from 'lucide-react';
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
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Invite sent! Share this code with your teammate:
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {lastInviteCode.split('').map((char, i) => (
                <div
                  key={i}
                  className="flex h-10 w-9 items-center justify-center rounded-md border-2 border-green-500/30 bg-background text-base font-bold tracking-widest"
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
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative flex gap-2">
        <Input
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
          onBlur={() => {
            window.setTimeout(() => setShowSuggestions(false), 120);
          }}
          required
          disabled={inviteMember.isPending}
          className="flex-1"
          autoComplete="off"
        />

        {showSuggestions && (debouncedQuery.length >= 2 || query.trim().length >= 2) && (
          <div className="absolute left-0 right-20 top-11 z-20 rounded-md border bg-popover shadow-md">
            {isFetchingCandidates ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                        <button
                          type="button"
                          className={[
                            'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors',
                            isBlocked
                              ? 'bg-destructive/5 hover:bg-destructive/10'
                              : hasSoftWarning
                                ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                : 'hover:bg-accent',
                          ].join(' ')}
                          onMouseDown={(event) => {
                            event.preventDefault();
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
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              </span>
                            )}
                          </span>

                          {/* Blocking reasons — always visible */}
                          {blockingWarnings.map((w, i) => (
                            <span
                              key={i}
                              className="flex items-start gap-1 pl-0 text-[11px] leading-snug text-destructive"
                            >
                              <span className="mt-px shrink-0">✕</span>
                              <span>{w.message}</span>
                            </span>
                          ))}

                          {/* Soft warnings — always visible */}
                          {softWarnings.map((w, i) => (
                            <span
                              key={i}
                              className="flex items-start gap-1 pl-0 text-[11px] leading-snug text-amber-600 dark:text-amber-400"
                            >
                              <span className="mt-px shrink-0">⚠</span>
                              <span>{w.message}</span>
                            </span>
                          ))}
                        </button>
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
          </div>
        )}

        <Button type="submit" size="sm" disabled={inviteMember.isPending || !email.trim()}>
          {inviteMember.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Invite</span>
        </Button>
      </form>
    </div>
  );
}

InviteMemberForm.propTypes = {
  teamId: PropTypes.string.isRequired,
};
