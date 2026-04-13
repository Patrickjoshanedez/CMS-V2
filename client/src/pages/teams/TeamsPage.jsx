import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { TagInput } from '@/components/ui/TagInput';
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
} from 'lucide-react';
import { ROLES } from '@cms/shared';
import {
  useMyTeam,
  useTeams,
  useCreateTeam,
  useInviteMember,
  useInviteCandidates,
  useAcceptInvite,
  useAssignMemberRole,
  useUpdateGoogleDocLink,
  useLockTeam,
  useLeaveTeam,
} from '@/hooks/useTeams';
import { useAssignAdviser, useAssignPanelist, useRemovePanelist } from '@/hooks/useProjects';
import { useAcademicYears, useSections } from '@/hooks/useAcademics';
import { useUsers } from '@/hooks/useUsers';
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

/* ────────── Empty State (no team yet) ────────── */

function EmptyTeamState({ role, onCreateClick, onAcceptClick }) {
  const isStudent = role === ROLES.STUDENT;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
      <UsersRound className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-semibold">
        {isStudent ? 'You haven\u2019t joined a team yet' : 'No teams found'}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {isStudent
          ? 'Create a new team or ask a team leader to send you an invite.'
          : 'Teams will appear here once students form groups.'}
      </p>
      {isStudent && (
        <div className="mt-6 flex gap-3">
          <Button onClick={onCreateClick}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
          <Button variant="outline" onClick={onAcceptClick}>
            <Mail className="mr-2 h-4 w-4" />
            Accept Invite
          </Button>
        </div>
      )}
    </div>
  );
}

/* ────────── Create Team Form ────────── */

function CreateTeamForm({ onCancel }) {
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const { data: years = [], isLoading: yearsLoading } = useAcademicYears();

  const createTeam = useCreateTeam({
    onSuccess: () => {
      toast.success('Team created successfully!');
      setName('');
      setAcademicYear('');
    },
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to create team.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createTeam.mutate({ name: name.trim(), academicYear });
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
            <Label htmlFor="academicYear">Academic Year *</Label>
            <select
              id="academicYear"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              required
              disabled={createTeam.isPending || yearsLoading}
            >
              <option value="">
                {yearsLoading
                  ? 'Loading...'
                  : years.length === 0
                    ? 'No academic years available'
                    : 'Select academic year'}
              </option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
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
            <Button type="submit" disabled={createTeam.isPending || !academicYear}>
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
  const [inviteCode, setInviteCode] = useState(initialToken);
  const { fetchUser } = useAuthStore();

  const acceptInvite = useAcceptInvite({
    onSuccess: async () => {
      await fetchUser();
      toast.success('Invite accepted! You are now part of the team.');
      setInviteCode('');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalized = inviteCode.trim();
    const payload = normalized.length === 6 ? normalized.toUpperCase() : normalized;
    acceptInvite.mutate(payload);
  };

  const isCodeLike = inviteCode.trim().length === 6;
  const isTokenLike = inviteCode.trim().length > 6;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Accept a Team Invite</CardTitle>
        <CardDescription>
          Enter the 6-character invite code shared by the team leader.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {acceptInvite.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {acceptInvite.error?.response?.data?.error?.message ||
                'Invalid or expired invite code.'}
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isTokenLike && (
            <div className="space-y-2">
              <Label htmlFor="inviteToken">Invite Code *</Label>
              <Input
                id="inviteToken"
                placeholder="e.g. A7K9P2"
                value={inviteCode}
                onChange={(e) => {
                  const normalized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setInviteCode(normalized.slice(0, 6));
                }}
                minLength={6}
                maxLength={6}
                required
                disabled={acceptInvite.isPending}
                className="uppercase tracking-widest"
              />
            </div>
          )}

          {isTokenLike && (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-sm font-medium">Invite link detected</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{inviteCode}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
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
              disabled={acceptInvite.isPending || (!isCodeLike && !isTokenLike)}
            >
              {acceptInvite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept Invite
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
  const [activeWarning, setActiveWarning] = useState(null);

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
      setActiveWarning(null);
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
    <div className="space-y-2">
      {lastInviteCode && (
        <div className="flex items-center justify-between rounded-md border border-success/30 bg-success/10 px-3 py-2">
          <p className="text-xs text-success">
            Team invite code:{' '}
            <span className="font-semibold tracking-widest">{lastInviteCode}</span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(lastInviteCode);
              toast.success('Invite code copied.');
            }}
          >
            Copy
          </Button>
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
            setActiveWarning(null);
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
                <ul className="max-h-56 overflow-auto py-1">
                  {candidates.map((candidate) => {
                    const warningMessages = (candidate.warnings || [])
                      .map((warning) => warning?.message)
                      .filter(Boolean);
                    const blockingWarning = (candidate.warnings || []).find(
                      (warning) => warning?.blocksInvite,
                    );
                    const warningTooltipText =
                      blockingWarning?.message ||
                      warningMessages.join('\n') ||
                      (candidate.canInvite === false
                        ? 'This student cannot be invited yet.'
                        : 'Invite warning');

                    return (
                      <li key={candidate._id}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setEmail(candidate.email);
                            setQuery(candidate.email);
                            setDebouncedQuery(candidate.email);
                            setShowSuggestions(false);
                            setSelectedCandidate(candidate);
                            setActiveWarning(null);
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

                          {candidate.warnings?.length > 0 && (
                            <span
                              className="mt-0.5 inline-flex shrink-0 items-center text-warning"
                              title={warningTooltipText}
                              aria-label={warningTooltipText}
                              role="button"
                              tabIndex={0}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setActiveWarning((prev) =>
                                  prev?.candidateId === candidate._id
                                    ? null
                                    : {
                                        candidateId: candidate._id,
                                        fullName: candidate.fullName,
                                        messages:
                                          warningMessages.length > 0
                                            ? warningMessages
                                            : [warningTooltipText],
                                      },
                                );
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setActiveWarning((prev) =>
                                    prev?.candidateId === candidate._id
                                      ? null
                                      : {
                                          candidateId: candidate._id,
                                          fullName: candidate.fullName,
                                          messages:
                                            warningMessages.length > 0
                                              ? warningMessages
                                              : [warningTooltipText],
                                        },
                                  );
                                }
                              }}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {activeWarning && (
                  <div className="z-[100] border-t bg-background/95 p-3 shadow-sm backdrop-blur">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold text-foreground">
                        Why {activeWarning.fullName} cannot be invited
                      </p>
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setActiveWarning(null);
                        }}
                        className="inline-flex items-center rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Close warning details"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {activeWarning.messages.map((message, index) => (
                        <p
                          key={`${activeWarning.candidateId}-active-warning-${index}`}
                          className="text-xs text-foreground"
                        >
                          {message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
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
  const isLeader = team.leaderId?._id === userId || team.leaderId === userId;
  const assignment = team.assignment || {};
  const panelists = assignment.panelists || [];
  const [googleDocUrlInput, setGoogleDocUrlInput] = useState(team.googleDocUrl || '');
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

  const lockTeam = useLockTeam({
    onSuccess: () => toast.success('Team finalized successfully.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to finalize team.'),
  });

  const leaveTeam = useLeaveTeam({
    onSuccess: () => toast.success('You left the team successfully.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to leave team.'),
  });

  useEffect(() => {
    setGoogleDocUrlInput(team.googleDocUrl || '');
  }, [team.googleDocUrl]);

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
            <p className="mb-2 text-sm font-medium text-muted-foreground">Team Document</p>
            {isLeader ? (
              <div className="space-y-2">
                <div className="flex gap-2">
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
                    Attach Link
                  </Button>
                </div>

                {team.googleDocUrl ? (
                  <Button type="button" variant="secondary" asChild>
                    <a href={team.googleDocUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Team Google Doc
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No team Google Docs link attached yet.
                  </p>
                )}
              </div>
            ) : team.googleDocUrl ? (
              <Button type="button" variant="secondary" asChild>
                <a href={team.googleDocUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Team Google Doc
                </a>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                No team Google Docs link attached yet.
              </p>
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

          {/* Invite Form (leader only) */}
          {isLeader && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Invite a Member</p>
              <InviteMemberForm teamId={team._id} />
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

function FacultyTeamDetail({ team, canAssignCommittee = false }) {
  const leader = team.leaderId;
  const members = team.members || [];
  const assignment = team.assignment || {};
  const panelists = assignment.panelists || [];
  const [adviserSelection, setAdviserSelection] = useState([]);
  const [panelistSelection, setPanelistSelection] = useState([]);

  const { data: adviserData = {} } = useUsers(
    { role: ROLES.ADVISER, limit: 100 },
    {
      enabled: canAssignCommittee,
    },
  );
  const { data: panelistData = {} } = useUsers(
    { role: ROLES.PANELIST, limit: 100 },
    {
      enabled: canAssignCommittee,
    },
  );

  const assignAdviser = useAssignAdviser({
    onSuccess: () => {
      toast.success('Adviser assigned.');
      setAdviserSelection([]);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to assign adviser.'),
  });

  const addPanelist = useAssignPanelist({
    onSuccess: () => {
      toast.success('Panelist added.');
      setPanelistSelection([]);
    },
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to add panelist.'),
  });

  const removePanelist = useRemovePanelist({
    onSuccess: () => toast.success('Panelist removed.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to remove panelist.'),
  });

  const getUserLabel = (user) => `${formatName(user)}${user.email ? ` (${user.email})` : ''}`;
  const advisers = adviserData.users || [];
  const panelistCandidates = panelistData.users || [];
  const adviserSuggestions = advisers.map(getUserLabel);
  const panelistSuggestions = panelistCandidates
    .filter(
      (candidate) => !panelists.some((panelist) => (panelist._id || panelist) === candidate._id),
    )
    .map(getUserLabel);
  const panelistSelectionLabel = panelistSelection[0] || '';
  const adviserSelectionLabel = adviserSelection[0] || '';

  const handleAssignAdviser = () => {
    const selectedAdviser = advisers.find((user) => getUserLabel(user) === adviserSelectionLabel);
    if (!selectedAdviser) return;
    assignAdviser.mutate({
      projectId: assignment.projectId || team.projectId || team._id,
      adviserId: selectedAdviser._id,
    });
  };

  const handleAddPanelist = () => {
    const selectedPanelist = panelistCandidates.find(
      (user) => getUserLabel(user) === panelistSelectionLabel,
    );
    if (!selectedPanelist) return;
    addPanelist.mutate({
      projectId: assignment.projectId || team.projectId || team._id,
      panelistId: selectedPanelist._id,
    });
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

            {canAssignCommittee && (
              <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Assign Adviser
                  </Label>
                  <TagInput
                    value={adviserSelection}
                    onChange={setAdviserSelection}
                    suggestions={adviserSuggestions}
                    placeholder="Type to search advisers"
                    maxTags={1}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    disabled={!adviserSelectionLabel || assignAdviser.isPending}
                    onClick={handleAssignAdviser}
                  >
                    {assignAdviser.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save Adviser
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Add Panelist
                  </Label>
                  <TagInput
                    value={panelistSelection}
                    onChange={setPanelistSelection}
                    suggestions={panelistSuggestions}
                    placeholder="Type to search panelists"
                    maxTags={1}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    disabled={!panelistSelectionLabel || addPanelist.isPending}
                    onClick={handleAddPanelist}
                  >
                    {addPanelist.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Add Panelist
                  </Button>
                </div>

                {panelists.length > 0 && (
                  <div className="space-y-2">
                    {panelists.map((panelist) => {
                      const panelistId = panelist._id || panelist;
                      return (
                        <div
                          key={panelistId}
                          className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                        >
                          <span>{formatName(panelist)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={removePanelist.isPending}
                            onClick={() =>
                              removePanelist.mutate({
                                projectId: assignment.projectId || team.projectId || team._id,
                                panelistId,
                              })
                            }
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
