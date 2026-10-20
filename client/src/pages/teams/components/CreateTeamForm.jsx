import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useCreateTeamInviteCandidates,
  useInviteMember,
  useBulkInviteMembers,
  useCreateTeam,
} from '@/hooks/useTeams';

export default function CreateTeamForm({ onCancel }) {
  const [name, setName] = useState('');
  const [inviteQuery, setInviteQuery] = useState('');
  const [debouncedInviteQuery, setDebouncedInviteQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [stagedCandidates, setStagedCandidates] = useState([]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedInviteQuery(inviteQuery.trim());
    }, 220);

    return () => window.clearTimeout(timerId);
  }, [inviteQuery]);

  const { data: candidates = [], isFetching: isFetchingCandidates } =
    useCreateTeamInviteCandidates(debouncedInviteQuery);

  const inviteMember = useInviteMember({
    onSuccess: (result) => {
      const invitedName = result?.data?.invitedUser?.fullName || result?.data?.invitedUser?.email;
      toast.success(
        invitedName
          ? `Team created and invite sent to ${invitedName}.`
          : 'Team created and invitation sent.',
      );
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message ||
          'Team was created, but sending invitation failed. You can invite from My Team.',
      );
    },
  });

  const bulkInviteMembers = useBulkInviteMembers({
    onSuccess: (result) => {
      const summary = result?.data?.summary;
      if (summary) {
        toast.success(`Team created and ${summary.succeeded} invite(s) sent.`);
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message ||
          'Team was created, but sending invitation(s) failed. You can invite from My Team.',
      );
    },
  });

  const createTeam = useCreateTeam({
    onSuccess: (result) => {
      const teamId = result?.data?.team?._id;
      const candidateEmails = stagedCandidates
        .filter((c) => c?.canInvite !== false && c?.email)
        .map((c) => c.email);

      // Legacy fallback if single candidate was typed directly:
      if (
        candidateEmails.length === 0 &&
        selectedCandidate?.canInvite !== false &&
        selectedCandidate?.email &&
        selectedCandidate.email.toLowerCase() === inviteQuery.trim().toLowerCase()
      ) {
        candidateEmails.push(selectedCandidate.email);
      }

      if (teamId && candidateEmails.length > 0) {
        if (candidateEmails.length === 1) {
          inviteMember.mutate({ teamId, email: candidateEmails[0] });
        } else {
          bulkInviteMembers.mutate({ teamId, emails: candidateEmails });
        }
      } else {
        toast.success('Team created successfully!');
      }

      setName('');
      setInviteQuery('');
      setDebouncedInviteQuery('');
      setShowSuggestions(false);
      setSelectedCandidate(null);
      setStagedCandidates([]);
    },
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to create team.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createTeam.mutate({ name: name.trim() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create a New Team</CardTitle>
        <CardDescription>
          You will be the team leader. Invite members now or after creating.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {createTeam.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {createTeam.error?.response?.data?.error?.message || 'Failed to create team.'}
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              placeholder="Leave blank to use your last name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={createTeam.isPending}
            />
            <p className="text-xs text-muted-foreground">
              If left blank, your team name will default to your last name.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="createTeamInvite">
                Invite Teammates {stagedCandidates.length > 0 && `(${stagedCandidates.length}/3)`}
              </Label>
              <span className="text-[11px] text-muted-foreground">Max 3 teammates</span>
            </div>

            {/* Staged candidates pill tray */}
            {stagedCandidates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {stagedCandidates.map((c) => (
                  <span
                    key={c.email}
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-foreground font-medium shadow-2xs"
                  >
                    <span className="truncate max-w-[150px]">{c.fullName || c.email}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setStagedCandidates((prev) =>
                          prev.filter((item) => item.email.toLowerCase() !== c.email.toLowerCase()),
                        )
                      }
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remove ${c.fullName || c.email}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Input
                id="createTeamInvite"
                placeholder={
                  stagedCandidates.length >= 3
                    ? 'Maximum of 3 teammates staged'
                    : 'Search student by name or email...'
                }
                type="text"
                value={inviteQuery}
                disabled={createTeam.isPending || stagedCandidates.length >= 3}
                onChange={(event) => {
                  const value = event.target.value;
                  setInviteQuery(value);
                  setShowSuggestions(true);
                  if (selectedCandidate?.email?.toLowerCase?.() !== value.trim().toLowerCase()) {
                    setSelectedCandidate(null);
                  }
                }}
                onFocus={() => {
                  if ((debouncedInviteQuery || inviteQuery).length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 120);
                }}
                autoComplete="off"
              />

              {showSuggestions &&
                (debouncedInviteQuery.length >= 2 || inviteQuery.trim().length >= 2) && (
                  <div className="absolute left-0 right-0 top-11 z-20 rounded-md border bg-popover shadow-md">
                    {isFetchingCandidates ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Searching students...
                      </div>
                    ) : candidates.length > 0 ? (
                      <ul className="max-h-56 overflow-auto py-1">
                        {candidates.map((candidate) => {
                          const isAlreadyStaged = stagedCandidates.some(
                            (c) => c.email.toLowerCase() === candidate.email.toLowerCase(),
                          );

                          return (
                            <li key={candidate._id}>
                              <button
                                type="button"
                                className={cn(
                                  'flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent',
                                  isAlreadyStaged && 'bg-primary/5',
                                )}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  setInviteQuery(candidate.email);
                                  setDebouncedInviteQuery(candidate.email);
                                  setShowSuggestions(false);
                                  setSelectedCandidate(candidate);
                                  if (!isAlreadyStaged) {
                                    if (stagedCandidates.length >= 3) {
                                      toast.warning('Maximum of 3 teammates can be invited.');
                                      return;
                                    }
                                    setStagedCandidates((prev) => [...prev, candidate]);
                                  }
                                }}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium">
                                    {candidate.fullName}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {candidate.email}
                                  </span>
                                  {candidate.canInvite === false && (
                                    <span className="mt-0.5 block text-[11px] font-medium text-destructive">
                                      Cannot invite yet
                                    </span>
                                  )}
                                </span>
                                {isAlreadyStaged && (
                                  <Badge variant="secondary" className="text-[10px] shrink-0">
                                    Staged
                                  </Badge>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No matching students found.
                      </div>
                    )}
                  </div>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
              Select up to 3 classmates from your section. Invitations will be sent automatically
              once your team is created.
            </p>
            {selectedCandidate?.canInvite === false && (
              <p className="text-xs text-destructive">
                Selected student cannot be invited yet. Team creation will continue without an
                invite.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={createTeam.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Team
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

CreateTeamForm.propTypes = {
  onCancel: PropTypes.func.isRequired,
};
