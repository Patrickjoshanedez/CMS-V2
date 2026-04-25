import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TagInput } from '@/components/ui/TagInput';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import {
  UsersRound,
  UserPlus,
  Mail,
  Crown,
  Loader2,
  AlertTriangle,
  Search,
  Send,
  Link as LinkIcon,
  ExternalLink,
  X,
  LogOut,
  Copy,
  Clock,
  Hash,
  Ticket,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { ROLES } from '@cms/shared';
import {
  useMyTeam,
  useTeams,
  useCreateTeam,
  useInviteMember,
  useCreateTeamInviteCandidates,
  useInviteCandidates,
  useAcceptInvite,
  useAssignMemberRole,
  useUpdateGoogleDocLink,
  useUpdateGithubLink,
  useLockTeam,
  useLeaveTeam,
  teamKeys,
} from '@/hooks/useTeams';
import { useUsers } from '@/hooks/useUsers';
import { useAssignAdviser, useAssignPanelist, useRemovePanelist } from '@/hooks/useProjects';
import { useAcademicYears, useSections } from '@/hooks/useAcademics';
import { toast } from 'sonner';

const TEAM_TEMPLATE_URL =
  'https://docs.google.com/document/d/1n49COZvzKnqDaxv8hT0EFLHsINpv4RkF/edit';

/**
 * TeamsPage — team management page.
 *
 * - Students see their own team (or a prompt to create/join one).
 * - Instructors see all teams.
 * - Advisers see their assigned teams.
 * - Panelists see teams they are handling.
 */

/* ────────── Helper: format a populated user's full name ────────── */

function formatName(userObj) {
  if (!userObj) return 'Unknown';
  const parts = [userObj.firstName, userObj.middleName, userObj.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : userObj.email || 'Unknown';
}

function formatCommitteeOption(userObj) {
  if (!userObj) return '';
  return `${formatName(userObj)} • ${userObj.email || 'No email provided'}`;
}

/* ────────── Empty State (no team yet) ────────── */

function EmptyTeamState({ role, onCreateClick, onAcceptClick }) {
  const isStudent = role === ROLES.STUDENT;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-gradient-to-b from-muted/30 to-muted/60 py-20 text-center">
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/5">
          <UsersRound className="h-10 w-10 text-primary" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      </div>
      <h3 className="text-xl font-bold">{isStudent ? 'No team yet' : 'No teams found'}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        {isStudent
          ? 'Start by creating your own team or enter a 6-digit invite code shared by a team leader to join an existing group.'
          : 'Teams will appear here once students form groups.'}
      </p>
      {isStudent && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={onCreateClick} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create a Team
          </Button>
          <Button size="lg" variant="outline" onClick={onAcceptClick} className="gap-2">
            <Ticket className="h-4 w-4" />I Have an Invite Code
          </Button>
        </div>
      )}
    </div>
  );
}

/* ────────── Create Team Form ────────── */

function CreateTeamForm({ onCancel }) {
  const [name, setName] = useState('');
  const [inviteQuery, setInviteQuery] = useState('');
  const [debouncedInviteQuery, setDebouncedInviteQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

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

  const createTeam = useCreateTeam({
    onSuccess: (result) => {
      const teamId = result?.data?.team?._id;
      const shouldInvite = Boolean(
        teamId &&
        selectedCandidate?.canInvite !== false &&
        selectedCandidate?.email &&
        selectedCandidate.email.toLowerCase() === inviteQuery.trim().toLowerCase(),
      );

      if (shouldInvite) {
        inviteMember.mutate({ teamId, email: selectedCandidate.email });
      } else {
        toast.success('Team created successfully!');
      }

      setName('');
      setInviteQuery('');
      setDebouncedInviteQuery('');
      setShowSuggestions(false);
      setSelectedCandidate(null);
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
          You will be the team leader. Invite members after creating.
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
            <Label htmlFor="teamName">Team Name (Optional)</Label>
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
            <Label htmlFor="createTeamInvite">Team Invitation (Optional)</Label>
            <div className="relative">
              <Input
                id="createTeamInvite"
                placeholder="Type a name (e.g. Leon) or email"
                type="text"
                value={inviteQuery}
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
                disabled={createTeam.isPending}
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
                        {candidates.map((candidate) => (
                          <li key={candidate._id}>
                            <button
                              type="button"
                              className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setInviteQuery(candidate.email);
                                setDebouncedInviteQuery(candidate.email);
                                setShowSuggestions(false);
                                setSelectedCandidate(candidate);
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
                            </button>
                          </li>
                        ))}
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
              Academic year is auto-assigned from your section. Select one student and the system
              will send an invite after team creation.
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

/* ────────── Accept Invite Form ────────── */

function AcceptInviteForm({ onCancel, initialToken = '' }) {
  const CODE_LENGTH = 6;
  const isInitialTokenLong = initialToken.length > CODE_LENGTH;
  const initialDigits = isInitialTokenLong
    ? Array(CODE_LENGTH).fill('')
    : initialToken
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, CODE_LENGTH)
        .split('');

  const [digits, setDigits] = useState(() => {
    const arr = [...initialDigits];
    while (arr.length < CODE_LENGTH) arr.push('');
    return arr;
  });
  const [longToken, setLongToken] = useState(isInitialTokenLong ? initialToken : '');
  const { fetchUser } = useAuthStore();

  const acceptInvite = useAcceptInvite({
    onSuccess: async () => {
      await fetchUser();
      toast.success('Invite accepted! You are now part of the team.');
      setDigits(Array(CODE_LENGTH).fill(''));
      setLongToken('');
      onCancel?.();
    },
    onError: (err) => {
      const errorCode = err?.response?.data?.error?.code;
      if (errorCode === 'PROFILE_INCOMPLETE') {
        toast.error('Please complete your profile (section and adviser) before joining a team.');
        return;
      }
      toast.error(err?.response?.data?.error?.message || 'Failed to accept invite.');
    },
  });

  const codeString = digits.join('');
  const isCodeComplete = codeString.length === CODE_LENGTH;
  const isTokenLike = longToken.length > CODE_LENGTH;

  const handleDigitChange = (index, value) => {
    const char = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    // Auto-advance
    if (char && index < CODE_LENGTH - 1) {
      const nextInput = document.getElementById(`invite-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`invite-digit-${index - 1}`);
      prevInput?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (pasted.length > CODE_LENGTH) {
      setLongToken(e.clipboardData.getData('text').trim());
      return;
    }
    const chars = pasted.slice(0, CODE_LENGTH).split('');
    setDigits(() => {
      const next = [...chars];
      while (next.length < CODE_LENGTH) next.push('');
      return next;
    });
    // Focus last filled or first empty
    const focusIdx = Math.min(chars.length, CODE_LENGTH - 1);
    setTimeout(() => document.getElementById(`invite-digit-${focusIdx}`)?.focus(), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = isTokenLike ? longToken.trim() : codeString;
    acceptInvite.mutate(payload);
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Ticket className="h-7 w-7" />
        </div>
        <CardTitle className="text-xl">Join a Team</CardTitle>
        <CardDescription className="text-sm">
          Enter the 6-character invite code shared by your team leader.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {acceptInvite.error && (
          <Alert variant="destructive" className="mb-5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {acceptInvite.error?.response?.data?.error?.message ||
                'Invalid or expired invite code.'}
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isTokenLike && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    id={`invite-digit-${i}`}
                    type="text"
                    inputMode="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={acceptInvite.isPending}
                    className="h-14 w-12 rounded-lg border-2 bg-muted/30 text-center text-xl font-bold uppercase tracking-widest transition-colors focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    autoComplete="off"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Letters and numbers only &mdash; paste support included
              </p>
            </div>
          )}

          {isTokenLike && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">Invite link detected</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{longToken}</p>
            </div>
          )}
          <div className="flex justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={acceptInvite.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={acceptInvite.isPending || (!isCodeComplete && !isTokenLike)}
              className="min-w-[140px]"
            >
              {acceptInvite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Team
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ────────── Invite Member Form (leader only) ────────── */

function InviteMemberForm({ teamId }) {
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

/* ────────── Student Team Detail View ────────── */

function StudentTeamDetail({ team, userId }) {
  const [now] = useState(() => Date.now());
  const isLeader = team.leaderId?._id === userId || team.leaderId === userId;
  const assignment = team.assignment || {};
  const panelists = assignment.panelists || [];
  const [googleDocUrlInput, setGoogleDocUrlInput] = useState(team.googleDocUrl || '');
  const [githubUrlInput, setGithubUrlInput] = useState(team.githubUrl || '');
  const memberRoleAssignments = team.memberRoles || [];
  const memberRoleMap = new Map(
    memberRoleAssignments.map((item) => [item?.userId?._id || item?.userId, item?.role || '']),
  );

  const TEAM_MEMBER_ROLE_OPTIONS = [
    'Programmer',
    'Documentor',
    'Pitcher',
    'UI/UX',
    'QA/Tester',
    'Researcher',
    'Backend Developer',
    'Frontend Developer',
  ];

  const assignMemberRole = useAssignMemberRole({
    onSuccess: () => toast.success('Team role updated.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to update team role.'),
  });

  const updateGoogleDocLink = useUpdateGoogleDocLink({
    onSuccess: () => toast.success('Team Google Docs link updated.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to update team Google Docs link.'),
  });

  const updateGithubLink = useUpdateGithubLink({
    onSuccess: () => toast.success('Team GitHub link updated.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to update team GitHub link.'),
  });

  const lockTeam = useLockTeam({
    onSuccess: () => toast.success('Team finalized successfully.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to finalize team.'),
  });

  const leaveTeam = useLeaveTeam({
    onSuccess: () => toast.success('You left the team successfully.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to leave team.'),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{team.name}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span>
                  {team.members?.length || 0} member
                  {team.members?.length !== 1 ? 's' : ''}
                </span>
                <span className="text-muted-foreground">&bull;</span>
                <span>{team.academicYear}</span>
              </CardDescription>
            </div>
            <div className="rounded-md bg-muted p-2 text-primary">
              <UsersRound className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!team.isLocked && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Finalize and lock your team before creating a proposal.
              </AlertDescription>
            </Alert>
          )}

          {/* Members List */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Team Resources</p>
            {isLeader ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    type="url"
                    placeholder="https://docs.google.com/document/d/..."
                    value={googleDocUrlInput}
                    onChange={(event) => setGoogleDocUrlInput(event.target.value)}
                    disabled={updateGoogleDocLink.isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      updateGoogleDocLink.mutate({
                        teamId: team._id,
                        googleDocUrl: googleDocUrlInput.trim(),
                      })
                    }
                    disabled={updateGoogleDocLink.isPending}
                  >
                    {updateGoogleDocLink.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LinkIcon className="mr-2 h-4 w-4" />
                    )}
                    Attach Google Docs
                  </Button>
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    type="url"
                    placeholder="https://github.com/org/repository"
                    value={githubUrlInput}
                    onChange={(event) => setGithubUrlInput(event.target.value)}
                    disabled={updateGithubLink.isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      updateGithubLink.mutate({
                        teamId: team._id,
                        githubUrl: githubUrlInput.trim(),
                      })
                    }
                    disabled={updateGithubLink.isPending}
                  >
                    {updateGithubLink.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LinkIcon className="mr-2 h-4 w-4" />
                    )}
                    Attach GitHub
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" asChild>
                    <a href={TEAM_TEMPLATE_URL} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Generate Template
                    </a>
                  </Button>

                  {team.googleDocUrl ? (
                    <Button type="button" variant="secondary" asChild>
                      <a href={team.googleDocUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Team Google Doc
                      </a>
                    </Button>
                  ) : null}

                  {team.githubUrl ? (
                    <Button type="button" variant="secondary" asChild>
                      <a href={team.githubUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Team GitHub
                      </a>
                    </Button>
                  ) : null}

                  {!team.googleDocUrl && !team.githubUrl ? (
                    <p className="text-xs text-muted-foreground">
                      No team resource links attached yet.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" asChild>
                  <a href={TEAM_TEMPLATE_URL} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Generate Template
                  </a>
                </Button>

                {team.googleDocUrl ? (
                  <Button type="button" variant="secondary" asChild>
                    <a href={team.googleDocUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Team Google Doc
                    </a>
                  </Button>
                ) : null}

                {team.githubUrl ? (
                  <Button type="button" variant="secondary" asChild>
                    <a href={team.githubUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Team GitHub
                    </a>
                  </Button>
                ) : null}

                {!team.googleDocUrl && !team.githubUrl ? (
                  <p className="text-xs text-muted-foreground">
                    No team resource links attached yet.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* Members List */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Members</p>
            <div className="space-y-2">
              {team.members?.map((member) => {
                const memberId = member._id || member;
                const isThisLeader = (team.leaderId?._id || team.leaderId) === memberId;
                const selectedRole = memberRoleMap.get(memberId) || '';

                return (
                  <div key={memberId} className="flex items-center gap-3 rounded-md border p-3">
                    {/* Avatar placeholder */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {member.firstName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{formatName(member)}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    {isThisLeader && (
                      <Badge variant="outline" className="gap-1 shrink-0">
                        <Crown className="h-3 w-3" />
                        Leader
                      </Badge>
                    )}

                    <div className="ml-auto min-w-[170px]">
                      <Label className="mb-1 block text-xs text-muted-foreground">Team Role</Label>
                      <select
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                        value={selectedRole}
                        disabled={!isLeader || assignMemberRole.isPending}
                        onChange={(event) => {
                          assignMemberRole.mutate({
                            teamId: team._id,
                            memberId,
                            role: event.target.value,
                          });
                        }}
                      >
                        <option value="">No role</option>
                        {TEAM_MEMBER_ROLE_OPTIONS.map((roleOption) => (
                          <option key={roleOption} value={roleOption}>
                            {roleOption}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Current Capstone Committee
            </p>
            <div className="space-y-2">
              <div className="rounded-md border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Instructor
                </p>
                <p className="mt-1 text-sm font-medium">
                  {assignment.instructor ? formatName(assignment.instructor) : 'Not assigned yet'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {assignment.instructor?.email || 'No instructor assigned to your profile yet'}
                </p>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Adviser
                </p>
                <p className="mt-1 text-sm font-medium">
                  {assignment.adviser ? formatName(assignment.adviser) : 'Not assigned yet'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {assignment.adviser?.email || 'No adviser assigned yet'}
                </p>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Panelists
                </p>
                {panelists.length > 0 ? (
                  <div className="mt-1 space-y-1">
                    {panelists.map((panelist) => (
                      <div key={panelist._id} className="text-sm">
                        <p className="font-medium">{formatName(panelist)}</p>
                        <p className="text-xs text-muted-foreground">{panelist.email}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No panelists assigned yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Invite Form + Pending Invites (leader only) */}
          {isLeader && !team.isLocked && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Invite a Member</p>
                <InviteMemberForm teamId={team._id} />
              </div>

              {/* Persistent pending invite codes */}
              {team.pendingInvites?.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Active Invite Codes
                  </p>
                  <div className="space-y-2">
                    {team.pendingInvites.map((invite) => {
                      const expiresAt = new Date(invite.expiresAt);
                      const hoursLeft = Math.max(
                        0,
                        Math.round((expiresAt - now) / (1000 * 60 * 60)),
                      );

                      return (
                        <div
                          key={invite._id}
                          className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {invite.inviteCode.split('').map((char, i) => (
                                <div
                                  key={i}
                                  className="flex h-8 w-7 items-center justify-center rounded border bg-background text-sm font-bold"
                                >
                                  {char}
                                </div>
                              ))}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-muted-foreground">
                                {invite.email}
                              </p>
                              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {hoursLeft > 0 ? `Expires in ${hoursLeft}h` : 'Expiring soon'}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={async () => {
                              await navigator.clipboard.writeText(invite.inviteCode);
                              toast.success('Code copied!');
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!team.isLocked && (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (window.confirm('Are you sure you want to leave this team?')) {
                    leaveTeam.mutate({ teamId: team._id });
                  }
                }}
                disabled={leaveTeam.isPending || lockTeam.isPending}
              >
                {leaveTeam.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Leave Team
              </Button>

              {isLeader && (
                <Button
                  type="button"
                  onClick={() => lockTeam.mutate({ teamId: team._id })}
                  disabled={lockTeam.isPending || leaveTeam.isPending}
                >
                  {lockTeam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Finalize Team
                </Button>
              )}
            </div>
          )}

          {team.isLocked && (
            <Alert>
              <AlertDescription>
                This team is finalized and locked. Proposal submission is now available.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ────────── Faculty Team Card ────────── */

function TeamCard({ team }) {
  const leaderName = team.leaderId ? formatName(team.leaderId) : 'Unknown';

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{team.name || 'Untitled Team'}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-1.5">
              <span>
                {team.members?.length || 0} member{team.members?.length !== 1 ? 's' : ''}
              </span>
              {team.academicYear && (
                <>
                  <span>&bull;</span>
                  <span>{team.academicYear}</span>
                </>
              )}
            </CardDescription>
          </div>
          <div className="rounded-md bg-muted p-2 text-primary">
            <UsersRound className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Crown className="h-3.5 w-3.5" />
          <span>Leader: {leaderName}</span>
        </div>
        {/* Member avatars row */}
        {team.members?.length > 0 && (
          <div className="flex -space-x-2">
            {team.members.slice(0, 4).map((member) => {
              const memberId = member._id || member;
              return (
                <div
                  key={memberId}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-xs font-semibold text-primary"
                  title={formatName(member)}
                >
                  {member.firstName?.[0]?.toUpperCase() || '?'}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FacultyTeamDetail({ team, canAssignCommittee }) {
  const queryClient = useQueryClient();
  const leader = team.leaderId;
  const members = team.members || [];
  const assignment = team.assignment || {};
  const panelists = useMemo(() => assignment.panelists || [], [assignment.panelists]);
  const projectId = assignment.projectId || null;

  const { data: adviserData, isLoading: isAdvisersLoading } = useUsers(
    { role: ROLES.ADVISER, isActive: true, page: 1, limit: 200 },
    { enabled: canAssignCommittee },
  );

  const { data: panelistData, isLoading: isPanelistsLoading } = useUsers(
    { role: ROLES.PANELIST, isActive: true, page: 1, limit: 200 },
    { enabled: canAssignCommittee },
  );

  const adviserOptions = useMemo(() => adviserData?.users || [], [adviserData?.users]);
  const panelistOptions = useMemo(() => panelistData?.users || [], [panelistData?.users]);

  const adviserSuggestions = useMemo(
    () => adviserOptions.map(formatCommitteeOption),
    [adviserOptions],
  );

  const panelistSuggestions = useMemo(
    () =>
      panelistOptions
        .filter(
          (panelist) => !panelists.some((currentPanelist) => currentPanelist?._id === panelist._id),
        )
        .map(formatCommitteeOption),
    [panelistOptions, panelists],
  );

  const assignAdviser = useAssignAdviser({
    onSuccess: () => {
      toast.success('Adviser assigned successfully.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error?.message || 'Failed to assign adviser.');
    },
  });

  const assignPanelist = useAssignPanelist({
    onSuccess: () => {
      toast.success('Panelist assigned successfully.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error?.message || 'Failed to assign panelist.');
    },
  });

  const removePanelist = useRemovePanelist({
    onSuccess: () => {
      toast.success('Panelist removed successfully.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error?.message || 'Failed to remove panelist.');
    },
  });

  const handleAdviserSelect = (selectedTags) => {
    const selectedLabel = selectedTags.at(-1);
    if (!selectedLabel || !projectId) {
      return;
    }

    const selectedAdviser = adviserOptions.find(
      (adviser) => formatCommitteeOption(adviser) === selectedLabel,
    );
    if (!selectedAdviser) {
      toast.error('Select a valid adviser from the suggestions.');
      return;
    }

    if (assignment.adviser?._id === selectedAdviser._id) {
      toast.error('This adviser is already assigned.');
      return;
    }

    assignAdviser.mutate({ projectId, adviserId: selectedAdviser._id });
  };

  const handlePanelistSelect = (selectedTags) => {
    const selectedLabel = selectedTags.at(-1);
    if (!selectedLabel || !projectId) {
      return;
    }

    const selectedPanelist = panelistOptions.find(
      (panelist) => formatCommitteeOption(panelist) === selectedLabel,
    );
    if (!selectedPanelist) {
      toast.error('Select a valid panelist from the suggestions.');
      return;
    }

    if (panelists.some((panelist) => panelist?._id === selectedPanelist._id)) {
      toast.error('This panelist is already assigned to the team.');
      return;
    }

    assignPanelist.mutate({ projectId, panelistId: selectedPanelist._id });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{team.name || 'Untitled Team'}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
          {team.academicYear && (
            <>
              <span>&bull;</span>
              <span>{team.academicYear}</span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Team Leader
          </p>
          <p className="mt-1 text-sm font-medium">{formatName(leader)}</p>
          <p className="text-xs text-muted-foreground">{leader?.email || 'No email provided'}</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Current Capstone Committee
          </p>
          <div className="space-y-2">
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Instructor
              </p>
              <p className="mt-1 text-sm font-medium">
                {assignment.instructor ? formatName(assignment.instructor) : 'Not assigned yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {assignment.instructor?.email || 'No instructor assigned yet'}
              </p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Adviser
              </p>
              <p className="mt-1 text-sm font-medium">
                {assignment.adviser ? formatName(assignment.adviser) : 'Not assigned yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {assignment.adviser?.email || 'No adviser assigned yet'}
              </p>

              {canAssignCommittee && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Search and assign adviser
                  </p>
                  <TagInput
                    value={[]}
                    onChange={handleAdviserSelect}
                    suggestions={adviserSuggestions}
                    placeholder={
                      isAdvisersLoading ? 'Loading advisers...' : 'Type to search advisers'
                    }
                    maxTags={1}
                    disabled={!projectId || isAdvisersLoading || assignAdviser.isPending}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Panelists
              </p>
              {panelists.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {panelists.map((panelist) => (
                    <div
                      key={panelist._id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{formatName(panelist)}</p>
                        <p className="text-xs text-muted-foreground">{panelist.email}</p>
                      </div>
                      {canAssignCommittee && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!projectId || removePanelist.isPending}
                          onClick={() =>
                            removePanelist.mutate({ projectId, panelistId: panelist._id })
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No panelists assigned yet</p>
              )}

              {canAssignCommittee && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Search and add panelist
                  </p>
                  <TagInput
                    value={[]}
                    onChange={handlePanelistSelect}
                    suggestions={panelistSuggestions}
                    placeholder={
                      isPanelistsLoading ? 'Loading panelists...' : 'Type to search panelists'
                    }
                    maxTags={3}
                    disabled={
                      !projectId ||
                      isPanelistsLoading ||
                      assignPanelist.isPending ||
                      panelists.length >= 3
                    }
                    className="w-full"
                  />
                  {panelists.length >= 3 && (
                    <p className="text-xs text-muted-foreground">
                      This project already has the maximum number of panelists.
                    </p>
                  )}
                </div>
              )}

              {canAssignCommittee && !projectId && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Create and approve the team project first before assigning adviser and panelists.
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Members
          </p>
          <div className="space-y-2">
            {members.map((member) => {
              const memberId = member._id || member;
              const isThisLeader = (leader?._id || leader) === memberId;

              return (
                <div key={memberId} className="flex items-center gap-3 rounded-md border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {member.firstName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{formatName(member)}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  {isThisLeader && (
                    <Badge variant="outline" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Leader
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────── Faculty Team List View ────────── */

function FacultyTeamsView({ canAssignCommittee }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [academicYear, setAcademicYear] = useState('');
  const [sectionId, setSectionId] = useState('');

  const { data: years = [] } = useAcademicYears();
  const { data: sections = [] } = useSections(
    { academicYear: academicYear || undefined },
    { enabled: Boolean(academicYear) },
  );

  const { data, isLoading, isError, error } = useTeams(filters);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({
      search: search.trim() || undefined,
      academicYear: academicYear || undefined,
      sectionId: sectionId || undefined,
      page: 1,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error?.response?.data?.error?.message || 'Failed to load teams.'}
        </AlertDescription>
      </Alert>
    );
  }

  const teams = data?.teams || [];
  const selectedTeam = teams.find((team) => team._id === selectedTeamId) || null;
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="grid gap-2 md:grid-cols-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={academicYear}
          onChange={(e) => {
            setAcademicYear(e.target.value);
            setSectionId('');
          }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All academic years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          disabled={!academicYear}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All sections</option>
          {sections.map((section) => (
            <option key={section._id} value={section._id}>
              {section.courseId?.code} - {section.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="space-y-2">
        <Label htmlFor="teamQuickSelect">Quick Team Select</Label>
        <select
          id="teamQuickSelect"
          value={selectedTeamId || ''}
          onChange={(e) => setSelectedTeamId(e.target.value || null)}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Select a team to view details</option>
          {teams.map((team) => (
            <option key={team._id} value={team._id}>
              {team.name || 'Untitled Team'}
              {team.academicYear ? ` • ${team.academicYear}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Team grid */}
      {teams.length === 0 ? (
        <EmptyTeamState role={ROLES.INSTRUCTOR} />
      ) : (
        <>
          {selectedTeam && (
            <FacultyTeamDetail team={selectedTeam} canAssignCommittee={canAssignCommittee} />
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const isSelected = selectedTeamId === team._id;

              return (
                <button
                  key={team._id}
                  type="button"
                  onClick={() => setSelectedTeamId(team._id)}
                  className={`text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected ? 'rounded-lg ring-2 ring-primary' : 'rounded-lg'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`View details for ${team.name || 'team'}`}
                >
                  <TeamCard team={team} />
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: pagination.page - 1 }))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setFilters((prev) => ({ ...prev, page: pagination.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/* ────────── Student View ────────── */

function StudentTeamView({ user }) {
  const navigate = useNavigate();
  const { token, action } = useParams();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAcceptForm, setShowAcceptForm] = useState(Boolean(token));
  const routeInviteToken = action === 'accept' ? token || '' : '';

  const isProfileComplete = Boolean(user.sectionId && user.instructorId);

  const { data: team, isLoading, isError, error } = useMyTeam(user?._id);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 404 means no team — show empty state
  if (isError && error?.response?.status !== 404) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error?.response?.data?.error?.message || 'Failed to load your team.'}
        </AlertDescription>
      </Alert>
    );
  }

  // No team — show creation / accept invite flow
  if (!team) {
    if (showCreateForm) {
      if (!isProfileComplete) {
        return (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-6">
            <p className="font-semibold text-warning">Complete your profile first</p>
            <p className="mt-1 text-sm text-warning/80">
              You need to set your section and instructor before creating a team.
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => navigate('/profile')}>
                Go to Profile
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        );
      }
      return <CreateTeamForm onCancel={() => setShowCreateForm(false)} />;
    }
    if (showAcceptForm) {
      return (
        <AcceptInviteForm
          initialToken={routeInviteToken}
          onCancel={() => setShowAcceptForm(false)}
        />
      );
    }
    return (
      <EmptyTeamState
        role={ROLES.STUDENT}
        onCreateClick={() => setShowCreateForm(true)}
        onAcceptClick={() => setShowAcceptForm(true)}
      />
    );
  }

  // Has team — show detail
  return <StudentTeamDetail team={team} userId={user._id} />;
}

/* ────────── Main Page ────────── */

export default function TeamsPage() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const isStudent = user.role === ROLES.STUDENT;
  const isInstructor = user.role === ROLES.INSTRUCTOR;
  const pageTitle = isStudent ? 'My Team' : user.role === ROLES.ADVISER ? 'My Teams' : 'Teams';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">{pageTitle}</h3>
          <p className="text-muted-foreground">
            {isStudent ? 'Manage your team and invite members.' : 'View and manage capstone teams.'}
          </p>
        </div>

        {isStudent ? (
          <StudentTeamView user={user} />
        ) : (
          <FacultyTeamsView canAssignCommittee={isInstructor} />
        )}
      </div>
    </DashboardLayout>
  );
}
