import { ROLES } from '@cms/shared';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { PageHeader } from '@/components/common';
import { InstructorTemplateConfigModal } from '@/components/teams/InstructorTemplateConfigModal';
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

  if (!user) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={isStudent ? 'Student Workspace' : 'Team Directory'}
          title={pageTitle}
          description={
            isStudent
              ? 'Manage your group roster, standardized capstone roles, and working links.'
              : 'Monitor proponent groupings, verify locked rosters, and coordinate committees.'
          }
          actions={
            !isStudent && isInstructor ? (
              <InstructorTemplateConfigModal academicYear="2025-2026" />
            ) : null
          }
        />

        {isStudent ? (
          <StudentTeamView user={user} />
        ) : (
          <FacultyTeamsView canAssignCommittee={isInstructor} />
        )}
      </div>
    </DashboardLayout>
  );
}
