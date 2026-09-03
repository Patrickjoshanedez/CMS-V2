import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TagInput } from '@/components/ui/TagInput';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import LoadingScreen from '@/components/ui/LoadingScreen';
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
  Lock,
  Unlock,
  GitBranch,
  FileText,
  AlertCircle,
  ShieldAlert,
  Pencil,
  Plus,
  Presentation,
  Palette,
  Database,
  Layers,
  ShieldCheck,
  Info,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { ROLES } from '@cms/shared';
import { useSettingsStore } from '@/stores/settingsStore';
import AssignCommitteeDialog from '@/components/teams/AssignCommitteeDialog';
import { ManuscriptTemplateWidget } from '@/components/teams/ManuscriptTemplateWidget';
import { InstructorTemplateConfigModal } from '@/components/teams/InstructorTemplateConfigModal';
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
            <Label htmlFor="createTeamInvite">Invite a Teammate</Label>
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

/* ────────── 5 Standard Capstone Roles ────────── */

const STANDARD_CAPSTONE_ROLES = [
  {
    name: 'Project Lead & Systems Analyst',
    consolidates: 'Pitcher + Researcher',
    focus:
      'System requirements, defense presentations/pitching, sprint management, and panel coordination.',
    icon: Presentation,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
  },
  {
    name: 'Frontend & UI/UX Developer',
    consolidates: 'Frontend Developer + UI/UX',
    focus:
      'User flow design, responsive layouts, accessibility, and client-side UI integration (shadcn/Tailwind).',
    icon: Palette,
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
    badgeClass:
      'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60',
  },
  {
    name: 'Backend & Database Developer',
    consolidates: 'Backend Developer + Programmer',
    focus: 'Schema design, API routing, server-side business logic, and database migrations.',
    icon: Database,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  {
    name: 'Full-Stack Developer',
    consolidates: 'All-Around + Programmer',
    focus:
      'End-to-end feature integration, Git workflow/PR reviews, deployment, and cross-layer support.',
    icon: Layers,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  },
  {
    name: 'QA & Technical Documentor',
    consolidates: 'QA/Tester + Documentor',
    focus:
      'Unit/integration testing, bug verification, and authoring Chapters 1–5 of the capstone manuscript.',
    icon: ShieldCheck,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
  },
];

const STANDARD_CAPSTONE_ROLE_NAMES = STANDARD_CAPSTONE_ROLES.map((r) => r.name);

function getRoleMetadata(roleName) {
  if (!roleName) return null;
  const match = STANDARD_CAPSTONE_ROLES.find((r) => r.name === roleName);
  if (match) return match;
  if (roleName === 'Pitcher' || roleName === 'Researcher') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Project Lead & Systems Analyst',
      icon: Presentation,
      color: 'text-indigo-600 dark:text-indigo-400',
      badgeClass:
        'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300',
    };
  }
  if (roleName === 'Frontend Developer' || roleName === 'UI/UX') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Frontend & UI/UX Developer',
      icon: Palette,
      color: 'text-pink-600 dark:text-pink-400',
      badgeClass: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300',
    };
  }
  if (roleName === 'Backend Developer' || roleName === 'Programmer') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Backend & Database Developer',
      icon: Database,
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeClass:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    };
  }
  if (roleName === 'All-Around' || roleName === 'All-around') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into Full-Stack Developer',
      icon: Layers,
      color: 'text-amber-600 dark:text-amber-400',
      badgeClass:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    };
  }
  if (roleName === 'QA/Tester' || roleName === 'Documentor') {
    return {
      name: roleName,
      consolidates: 'Legacy Role',
      focus: 'Migrated into QA & Technical Documentor',
      icon: ShieldCheck,
      color: 'text-sky-600 dark:text-sky-400',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300',
    };
  }
  return {
    name: roleName,
    consolidates: 'Custom',
    focus: 'Assigned capstone role',
    icon: ShieldAlert,
    color: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  };
}

/* ────────── Student Team Detail View ────────── */

function StudentTeamDetail({ team, userId }) {
  const [now] = useState(() => Date.now());
  const [showRolesGuide, setShowRolesGuide] = useState(false);
  const isLeader = team.leaderId?._id === userId || team.leaderId === userId;
  const assignment = team.assignment || {};
  const panelists = assignment.panelists || [];
  const capstonePhase = Number(assignment.capstonePhase) || 1;
  const isTitleApproved = assignment.titleStatus === 'approved';
  // Source code is accessible only when reaching Development Stage (Capstone 2/3 or title approved, or if already linked)
  const isDevelopmentStage = Boolean(team.githubUrl) || capstonePhase >= 2 || isTitleApproved;

  const [googleDocUrlInput, setGoogleDocUrlInput] = useState(team.googleDocUrl || '');
  const [githubUrlInput, setGithubUrlInput] = useState(team.githubUrl || '');
  const [isEditingGoogleDoc, setIsEditingGoogleDoc] = useState(false);
  const [isEditingGithub, setIsEditingGithub] = useState(false);

  const memberRoleAssignments = team.memberRoles || [];
  const memberRoleMap = new Map(
    memberRoleAssignments.map((item) => [item?.userId?._id || item?.userId, item?.role || '']),
  );

  const TEAM_MEMBER_ROLE_OPTIONS = STANDARD_CAPSTONE_ROLE_NAMES;

  const assignMemberRole = useAssignMemberRole({
    onSuccess: () => toast.success('Team role updated.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to update team role.'),
  });

  const updateGoogleDocLink = useUpdateGoogleDocLink({
    onSuccess: () => {
      toast.success('Team Google Docs link updated.');
      setIsEditingGoogleDoc(false);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to update team Google Docs link.'),
  });

  const updateGithubLink = useUpdateGithubLink({
    onSuccess: () => {
      toast.success('Team GitHub link updated.');
      setIsEditingGithub(false);
    },
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

  const dynamicTemplateUrl = useSettingsStore(
    (state) =>
      state.getTemplateUrl('proposal_template') || state.getTemplateUrl('team_template') || '',
  );

  const members = team.members || [];
  const memberCount = members.length;
  const isMinMembersMet = memberCount >= 1;
  const allRolesAssigned =
    memberCount > 0 &&
    members.every((m) => {
      const id = m._id || m;
      return Boolean(memberRoleMap.get(id));
    });
  const firstInviteCode = team.pendingInvites?.[0]?.inviteCode;
  const groupCode = firstInviteCode || (team._id ? team._id.slice(-6).toUpperCase() : '');

  return (
    <div className="space-y-6">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {team.name || 'Team Workspace'}
            </h1>
            {team.isLocked ? (
              <Badge
                variant="outline"
                className="border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 gap-1.5"
              >
                <Lock className="h-3 w-3 inline-block" />
                Team Finalized
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1.5"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Formation Open
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Academic Year {team.academicYear || '2025–2026'}
            {groupCode && (
              <>
                {' · '}
                <span>Group code: </span>
                <span className="font-mono font-medium text-foreground">#{groupCode}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!team.isLocked && (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs sm:text-sm"
                onClick={() => {
                  if (window.confirm('Are you sure you want to leave this team?')) {
                    leaveTeam.mutate({ teamId: team._id });
                  }
                }}
                disabled={leaveTeam.isPending || lockTeam.isPending}
              >
                {leaveTeam.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                )}
                Leave Team
              </Button>
              {isLeader && (
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5 text-xs sm:text-sm"
                  onClick={() => {
                    if (memberCount < 1) {
                      toast.error('Teams must have at least 1 member before finalization.');
                      return;
                    }
                    if (
                      window.confirm(
                        'Finalize and lock team roster? This prepares your team for proposal submission.',
                      )
                    ) {
                      lockTeam.mutate({ teamId: team._id });
                    }
                  }}
                  disabled={lockTeam.isPending || leaveTeam.isPending}
                >
                  {lockTeam.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Finalize & Lock Team
                </Button>
              )}
            </>
          )}
          {team.isLocked && (
            <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Ready for Proposal Submission
            </Badge>
          )}
        </div>
      </div>

      {/* Main Grid: 2 Cols Main, 1 Col Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (Span 2): Members & Workspace Links */}
        <div className="space-y-6 lg:col-span-2">
          {/* Members Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Team Roster</CardTitle>
                <CardDescription>{memberCount} of 4 slots filled</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 px-2.5 font-medium border-border/80 hover:bg-muted/80"
                  onClick={() => setShowRolesGuide((prev) => !prev)}
                >
                  <Info className="h-3.5 w-3.5 text-primary" />
                  <span>{showRolesGuide ? 'Hide Guide' : 'Roles Guide'}</span>
                  <ChevronDown
                    className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
                      showRolesGuide ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
                <Badge variant="secondary" className="font-normal">
                  Min: 1 | Max: 4
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Expandable 5 Standard Roles Guide */}
              {showRolesGuide && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3.5 animate-in fade-in duration-200">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      The 5 Standard Capstone Roles
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      BukSU standardized roles mapping student competencies to defense evaluation
                      criteria.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {STANDARD_CAPSTONE_ROLES.map((role) => {
                      const IconComponent = role.icon;
                      return (
                        <div
                          key={role.name}
                          className="flex flex-col justify-between rounded-lg border bg-background/90 p-3 shadow-2xs transition-colors hover:border-primary/40"
                        >
                          <div>
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${role.bg} ${role.color}`}
                              >
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-semibold text-foreground truncate">
                                  {role.name}
                                </h5>
                                <span className="inline-block text-[10px] font-medium text-muted-foreground">
                                  Consolidates:{' '}
                                  <span className="text-foreground/90 font-semibold">
                                    {role.consolidates}
                                  </span>
                                </span>
                              </div>
                            </div>
                            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                              <strong className="text-foreground/90">Focus:</strong> {role.focus}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Member Items */}
              {members.map((member) => {
                const memberId = member._id || member;
                const isThisLeader = (team.leaderId?._id || team.leaderId) === memberId;
                const selectedRole = memberRoleMap.get(memberId) || '';
                const roleMeta = getRoleMetadata(selectedRole);
                const fullName = formatName(member);
                const initials =
                  (member.firstName?.[0] || '') + (member.lastName?.[0] || '') ||
                  member.email?.[0]?.toUpperCase() ||
                  '?';

                return (
                  <div
                    key={memberId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/50 p-3.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-primary/10 text-primary font-medium text-sm">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-none truncate text-foreground">
                            {fullName}
                          </p>
                          {isThisLeader && (
                            <Badge
                              variant="secondary"
                              className="text-[11px] py-0 px-1.5 gap-1 font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0"
                            >
                              <Crown className="h-3 w-3 text-amber-500" /> Leader
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 self-start sm:self-center">
                      {roleMeta ? (
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-2xs ${roleMeta.badgeClass}`}
                          title={`${roleMeta.name}\nConsolidates: ${roleMeta.consolidates}\nFocus: ${roleMeta.focus}`}
                        >
                          <roleMeta.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-semibold">{roleMeta.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground px-1">
                          No role assigned
                        </span>
                      )}

                      {isLeader && !team.isLocked && (
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                          value={selectedRole}
                          disabled={assignMemberRole.isPending}
                          onChange={(event) => {
                            assignMemberRole.mutate({
                              teamId: team._id,
                              memberId,
                              role: event.target.value,
                            });
                          }}
                        >
                          <option value="">
                            {selectedRole ? 'Change role...' : 'Assign role...'}
                          </option>
                          {TEAM_MEMBER_ROLE_OPTIONS.map((roleOption) => (
                            <option key={roleOption} value={roleOption}>
                              {roleOption}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Quick Invite Box inside Card */}
              {isLeader && !team.isLocked && memberCount < 4 && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Invite Teammate</p>
                  <InviteMemberForm teamId={team._id} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Resources / Deliverables */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Repository & Working Documents
              </CardTitle>
              <CardDescription>
                Collaborative links accessible by committee reviewers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* GitHub Card (Source Control — Gated to Development Stage) */}
                <div
                  className={`flex flex-col justify-between rounded-lg border p-4 transition-colors ${
                    isDevelopmentStage
                      ? 'border-border/60 hover:border-primary/40 bg-card/60'
                      : 'border-dashed border-border/70 bg-muted/20 opacity-90'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                          <GitBranch className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium leading-none">Source Control</h4>
                          <p className="text-xs text-muted-foreground mt-1">GitHub</p>
                        </div>
                      </div>
                      {team.githubUrl ? (
                        <Badge
                          variant="secondary"
                          className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]"
                        >
                          Connected
                        </Badge>
                      ) : isDevelopmentStage ? (
                        <Badge variant="outline" className="text-[10px]">
                          Not Linked
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 text-muted-foreground border-border/80"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          Development Stage
                        </Badge>
                      )}
                    </div>

                    {team.githubUrl && !isEditingGithub && (
                      <p className="mt-3 truncate text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                        {team.githubUrl}
                      </p>
                    )}

                    {!isDevelopmentStage && !team.githubUrl && (
                      <div className="mt-3 rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground text-[11px] flex items-center gap-1.5">
                          <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                          Locked in Proposal Stage
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed">
                          Source code repository submission unlocks during the System Development
                          stage.
                        </p>
                      </div>
                    )}

                    {isEditingGithub && isLeader && !team.isLocked && isDevelopmentStage && (
                      <div className="mt-3 space-y-2">
                        <Input
                          type="url"
                          placeholder="https://github.com/org/repo"
                          value={githubUrlInput}
                          onChange={(e) => setGithubUrlInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                          disabled={updateGithubLink.isPending}
                        />
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              updateGithubLink.mutate({
                                teamId: team._id,
                                githubUrl: githubUrlInput.trim(),
                              });
                            }}
                            disabled={updateGithubLink.isPending}
                          >
                            {updateGithubLink.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => setIsEditingGithub(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditingGithub && (
                    <div className="mt-4 flex items-center gap-2">
                      {team.githubUrl ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="w-full text-xs gap-1.5"
                          >
                            <a href={team.githubUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Launch Repository
                            </a>
                          </Button>
                          {isLeader && !team.isLocked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs shrink-0"
                              onClick={() => setIsEditingGithub(true)}
                              title="Edit repository link"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </>
                      ) : isDevelopmentStage && isLeader && !team.isLocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1.5"
                          onClick={() => setIsEditingGithub(true)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Connect Repository
                        </Button>
                      ) : !isDevelopmentStage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="w-full text-xs gap-1.5 cursor-not-allowed opacity-60"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Available in Development Stage
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No link attached</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Google Docs Card */}
                <div className="flex flex-col justify-between rounded-lg border border-border/60 p-4 transition-colors hover:border-primary/40 bg-card/60">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium leading-none">Manuscript Document</h4>
                          <p className="text-xs text-muted-foreground mt-1">Google Docs</p>
                        </div>
                      </div>
                      <Badge
                        variant={team.googleDocUrl ? 'secondary' : 'outline'}
                        className={
                          team.googleDocUrl
                            ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]'
                            : 'text-[10px]'
                        }
                      >
                        {team.googleDocUrl ? 'Connected' : 'Not Linked'}
                      </Badge>
                    </div>

                    {team.googleDocUrl && !isEditingGoogleDoc && (
                      <p className="mt-3 truncate text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                        {team.googleDocUrl}
                      </p>
                    )}

                    {isEditingGoogleDoc && isLeader && !team.isLocked && (
                      <div className="mt-3 space-y-2">
                        <Input
                          type="url"
                          placeholder="https://docs.google.com/document/d/..."
                          value={googleDocUrlInput}
                          onChange={(e) => setGoogleDocUrlInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                          disabled={updateGoogleDocLink.isPending}
                        />
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              updateGoogleDocLink.mutate({
                                teamId: team._id,
                                googleDocUrl: googleDocUrlInput.trim(),
                              });
                            }}
                            disabled={updateGoogleDocLink.isPending}
                          >
                            {updateGoogleDocLink.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => setIsEditingGoogleDoc(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditingGoogleDoc && (
                    <div className="mt-4 flex items-center gap-2">
                      {team.googleDocUrl ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="w-full text-xs gap-1.5"
                          >
                            <a href={team.googleDocUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open Document
                            </a>
                          </Button>
                          {isLeader && !team.isLocked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs shrink-0"
                              onClick={() => setIsEditingGoogleDoc(true)}
                              title="Edit document link"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </>
                      ) : isLeader && !team.isLocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1.5"
                          onClick={() => setIsEditingGoogleDoc(true)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Attach Document
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No link attached</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Institutional Manuscript Template (Title Defense Gated) */}
              <ManuscriptTemplateWidget teamId={team._id} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Span 1): Committee & Verification Status */}
        <div className="space-y-6">
          {/* Capstone Committee Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Capstone Committee</CardTitle>
              <CardDescription>Assigned evaluators for this team</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/50 text-xs">
              {/* Instructor */}
              <div className="py-3 first:pt-0">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Instructor
                </span>
                {assignment.instructor ? (
                  <div className="mt-1">
                    <p className="font-medium text-foreground text-sm">
                      {formatName(assignment.instructor)}
                    </p>
                    <p className="text-muted-foreground text-xs">{assignment.instructor.email}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground italic text-xs">
                    No instructor assigned yet
                  </p>
                )}
              </div>

              {/* Adviser */}
              <div className="py-3">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Adviser
                </span>
                {assignment.adviser ? (
                  <div className="mt-1">
                    <p className="font-medium text-foreground text-sm">
                      {formatName(assignment.adviser)}
                    </p>
                    <p className="text-muted-foreground text-xs">{assignment.adviser.email}</p>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-1.5 text-muted-foreground italic text-xs">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Pending assignment</span>
                  </div>
                )}
              </div>

              {/* Committee Secretary */}
              <div className="py-3">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Committee Secretary
                </span>
                {assignment.secretary ? (
                  <div className="mt-1">
                    <p className="font-medium text-foreground text-sm">
                      {formatName(assignment.secretary)}
                    </p>
                    <p className="text-muted-foreground text-xs">{assignment.secretary.email}</p>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-1.5 text-muted-foreground italic text-xs">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Pending assignment</span>
                  </div>
                )}
              </div>

              {/* Panelists */}
              <div className="py-3 last:pb-0">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Panelists
                </span>
                {panelists.length > 0 ? (
                  <div className="mt-1 space-y-1.5">
                    {panelists.map((panelist) => (
                      <div key={panelist._id} className="text-xs">
                        <p className="font-medium text-foreground text-sm">
                          {formatName(panelist)}
                        </p>
                        <p className="text-muted-foreground">{panelist.email}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-1.5 text-muted-foreground italic text-xs">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>No panelists assigned yet</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Invite Codes (if leader and pending invites exist) */}
          {isLeader && team.pendingInvites?.length > 0 && (
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Active Invite Codes</CardTitle>
                <CardDescription>Share these 6-digit codes with invitees</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {team.pendingInvites.map((invite) => {
                  const expiresAt = new Date(invite.expiresAt);
                  const hoursLeft = Math.max(0, Math.round((expiresAt - now) / (1000 * 60 * 60)));

                  return (
                    <div
                      key={invite._id}
                      className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-sm bg-background px-2 py-1 rounded border border-border/80 text-foreground tracking-wider shrink-0">
                          {invite.inviteCode}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs text-foreground font-medium">
                            {invite.email}
                          </p>
                          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {hoursLeft > 0 ? `${hoursLeft}h left` : 'Expiring soon'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={async () => {
                          await navigator.clipboard.writeText(invite.inviteCode);
                          toast.success(`Copied invite code ${invite.inviteCode}`);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Quick Checklist / Policy Notice */}
          <Card className="bg-muted/40 border-dashed border-border shadow-none">
            <CardContent className="pt-5 space-y-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Team Lock Requirements
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  {isMinMembersMet ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-amber-500 inline-block shrink-0 ml-1 mr-1" />
                  )}
                  <span className={isMinMembersMet ? 'text-foreground' : ''}>
                    Minimum of 1 active member ({memberCount}/1)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {allRolesAssigned ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-amber-500 inline-block shrink-0 ml-1 mr-1" />
                  )}
                  <span className={allRolesAssigned ? 'text-foreground' : ''}>
                    All members select a project role
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {assignment.adviser ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 inline-block shrink-0 ml-1 mr-1" />
                  )}
                  <span>Adviser confirmation pending final submission</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
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
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
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
        </div>
        {canAssignCommittee && (
          <Button
            type="button"
            size="sm"
            className="text-xs bg-primary hover:bg-primary/90 gap-1.5 font-medium shrink-0"
            onClick={() => setIsCommitteeModalOpen(true)}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Assign Committee
          </Button>
        )}
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
                Committee Secretary
              </p>
              <p className="mt-1 text-sm font-medium">
                {assignment.secretary ? formatName(assignment.secretary) : 'Not assigned yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {assignment.secretary?.email || 'No committee secretary assigned yet'}
              </p>
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

      {isCommitteeModalOpen && (
        <AssignCommitteeDialog
          open={isCommitteeModalOpen}
          onOpenChange={setIsCommitteeModalOpen}
          teamId={team._id}
          teamName={team.name}
          initialAdviserId={assignment.adviser?._id}
          initialSecretaryId={assignment.secretary?._id}
          initialPanelistIds={panelists.map((p) => p._id)}
        />
      )}
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

  const { data, isLoading: isLoadingTeams, isError, error } = useTeams(filters);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({
      search: search.trim() || undefined,
      academicYear: academicYear || undefined,
      sectionId: sectionId || undefined,
      page: 1,
    });
  };

  if (isLoadingTeams) {
    return <PageSkeleton />;
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
      {canAssignCommittee && (
        <div className="flex justify-end">
          <InstructorTemplateConfigModal academicYear={academicYear || '2025-2026'} />
        </div>
      )}

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

  const { data: team, isLoading: isLoadingTeam, isError, error } = useMyTeam(user?._id);

  if (isLoadingTeam) {
    return <PageSkeleton />;
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
  const isStudent = user?.role === ROLES.STUDENT;
  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const pageTitle = isStudent ? 'My Team' : user?.role === ROLES.ADVISER ? 'My Teams' : 'Teams';
  const { data: myTeamData } = useMyTeam({ enabled: Boolean(isStudent) });
  const hasStudentTeam = Boolean(isStudent && myTeamData);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Render page title banner only when not in active student team workspace (Entity-Driven H1 pattern) */}
        {!hasStudentTeam && (
          <div>
            <h3 className="text-2xl font-bold tracking-tight">{pageTitle}</h3>
            <p className="text-muted-foreground">
              {isStudent
                ? 'Manage your team and invite members.'
                : 'View and manage capstone teams.'}
            </p>
          </div>
        )}

        {isStudent ? (
          <StudentTeamView user={user} />
        ) : (
          <FacultyTeamsView canAssignCommittee={isInstructor} />
        )}
      </div>
    </DashboardLayout>
  );
}
