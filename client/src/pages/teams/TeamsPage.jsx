import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UsersRound, UserPlus, Mail, Crown } from 'lucide-react';
import { ROLES } from '@cms/shared';

/**
 * TeamsPage — team management page.
 *
 * - Students see their own team (or a prompt to create/join one).
 * - Instructors see all teams.
 * - Advisers see their assigned teams.
 * - Panelists see teams they are handling.
 */

function EmptyTeamState({ role }) {
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
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Accept Invite
          </Button>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{team.name || 'Untitled Team'}</CardTitle>
            <CardDescription>
              {team.members?.length || 0} member{team.members?.length !== 1 ? 's' : ''}
              {team.academicYear ? ` \u2022 ${team.academicYear}` : ''}
            </CardDescription>
          </div>
          <div className="rounded-md bg-muted p-2 text-primary">
            <UsersRound className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Crown className="h-3.5 w-3.5" />
          <span>Leader: {team.leaderName || 'Unknown'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeamsPage() {
  const { user, fetchUser } = useAuthStore();
  const [teams] = useState([]); // Placeholder — will integrate with team API

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const pageTitle =
    user.role === ROLES.STUDENT ? 'My Team' : user.role === ROLES.ADVISER ? 'My Teams' : 'Teams';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">{pageTitle}</h3>
            <p className="text-muted-foreground">
              {user.role === ROLES.STUDENT
                ? 'Manage your team and invite members.'
                : 'View and manage capstone teams.'}
            </p>
          </div>
        </div>

        {teams.length === 0 ? (
          <EmptyTeamState role={user.role} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <TeamCard key={team._id} team={team} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
