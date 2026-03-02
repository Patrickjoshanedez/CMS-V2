import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import {
  UsersRound,
  UserPlus,
  Mail,
  Crown,
  Loader2,
  Lock,
  AlertTriangle,
  Search,
  Send,
} from 'lucide-react';
import { ROLES } from '@cms/shared';
import {
  useMyTeam,
  useTeams,
  useCreateTeam,
  useInviteMember,
  useAcceptInvite,
  useLockTeam,
} from '@/hooks/useTeams';
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
    createTeam.mutate({ name: name.trim(), academicYear: academicYear.trim() });
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
            <Label htmlFor="teamName">Team Name *</Label>
            <Input
              id="teamName"
              placeholder="e.g. Group Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              maxLength={100}
              disabled={createTeam.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="academicYear">Academic Year *</Label>
            <Input
              id="academicYear"
              placeholder="e.g. 2025-2026"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              required
              pattern="\d{4}-\d{4}"
              title="Format: YYYY-YYYY (e.g. 2025-2026)"
              disabled={createTeam.isPending}
            />
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

function AcceptInviteForm({ onCancel }) {
  const [token, setToken] = useState('');

  const acceptInvite = useAcceptInvite({
    onSuccess: () => {
      toast.success('Invite accepted! You are now part of the team.');
      setToken('');
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to accept invite.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    acceptInvite.mutate(token.trim());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Accept a Team Invite</CardTitle>
        <CardDescription>Paste the invite token you received via email.</CardDescription>
      </CardHeader>
      <CardContent>
        {acceptInvite.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {acceptInvite.error?.response?.data?.error?.message || 'Invalid or expired token.'}
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteToken">Invite Token *</Label>
            <Input
              id="inviteToken"
              placeholder="Paste your invite token here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              disabled={acceptInvite.isPending}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={acceptInvite.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={acceptInvite.isPending || !token.trim()}>
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

  const inviteMember = useInviteMember({
    onSuccess: () => {
      toast.success('Invitation sent!');
      setEmail('');
    },
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to send invite.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    inviteMember.mutate({ teamId, email: email.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Enter student email to invite"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={inviteMember.isPending}
        className="flex-1"
      />
      <Button type="submit" size="sm" disabled={inviteMember.isPending || !email.trim()}>
        {inviteMember.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        <span className="ml-2 hidden sm:inline">Invite</span>
      </Button>
    </form>
  );
}

/* ────────── Student Team Detail View ────────── */

function StudentTeamDetail({ team, userId }) {
  const isLeader = team.leaderId?._id === userId || team.leaderId === userId;

  const lockTeam = useLockTeam({
    onSuccess: () => toast.success('Team locked successfully.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to lock team.'),
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
                {team.isLocked && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="rounded-md bg-muted p-2 text-primary">
              <UsersRound className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Members List */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Members</p>
            <div className="space-y-2">
              {team.members?.map((member) => {
                const memberId = member._id || member;
                const isThisLeader = (team.leaderId?._id || team.leaderId) === memberId;

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
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invite Form (leader only, team not locked) */}
          {isLeader && !team.isLocked && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Invite a Member</p>
              <InviteMemberForm teamId={team._id} />
            </div>
          )}

          {/* Lock Button (leader only, team not locked) */}
          {isLeader && !team.isLocked && (
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => lockTeam.mutate(team._id)}
                disabled={lockTeam.isPending}
              >
                {lockTeam.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Lock Team
              </Button>
            </div>
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
              {team.isLocked && (
                <Badge variant="secondary" className="ml-1 gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  Locked
                </Badge>
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

/* ────────── Faculty Team List View ────────── */

function FacultyTeamsView() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});

  const { data, isLoading, isError, error } = useTeams(filters);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: search.trim() || undefined, page: 1 }));
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
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {/* Team grid */}
      {teams.length === 0 ? (
        <EmptyTeamState role={ROLES.INSTRUCTOR} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team._id} team={team} />
          ))}
        </div>
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

function StudentTeamView({ userId }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAcceptForm, setShowAcceptForm] = useState(false);

  const { data: team, isLoading, isError, error } = useMyTeam();

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
      return <CreateTeamForm onCancel={() => setShowCreateForm(false)} />;
    }
    if (showAcceptForm) {
      return <AcceptInviteForm onCancel={() => setShowAcceptForm(false)} />;
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
  return <StudentTeamDetail team={team} userId={userId} />;
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

        {isStudent ? <StudentTeamView userId={user._id} /> : <FacultyTeamsView />}
      </div>
    </DashboardLayout>
  );
}
