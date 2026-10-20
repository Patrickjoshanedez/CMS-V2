import { Loader2 } from 'lucide-react';
import { ROLES } from '@cms/shared';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useMyTeam } from '@/hooks/useTeams';
import FacultyTeamsView from './components/FacultyTeamsView';
import StudentTeamView from './components/StudentTeamView';

/**
 * TeamsPage — institutional team management router page.
 *
 * - Students see their own team workspace (or create/join flow).
 * - Instructors, Advisers, and Panelists see the directory of teams with
 *   Phase 0 metrics, search/filtering, and committee appointment actions.
 */
export default function TeamsPage() {
  const authUser = useAuthStore((state) => state?.user);
  const user = authUser?.user || authUser;
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
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
