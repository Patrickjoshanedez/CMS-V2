import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Users, UsersRound, Bell, FileText, GraduationCap, ClipboardList } from 'lucide-react';
import { ROLES } from '@cms/shared';

/**
 * DashboardPage — role-based dashboard shell.
 * Shows different summary cards depending on the user's role.
 */

function StudentDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Welcome back, {user.name}!</h3>
        <p className="text-muted-foreground">Here&apos;s an overview of your capstone progress.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          icon={UsersRound}
          title="My Team"
          description={user.teamId ? 'View your current team' : 'You haven\'t joined a team yet'}
          accent="text-blue-500"
        />
        <DashboardCard
          icon={FileText}
          title="Submissions"
          description="No submissions yet"
          accent="text-green-500"
        />
        <DashboardCard
          icon={Bell}
          title="Notifications"
          description="Check recent updates"
          accent="text-orange-500"
        />
      </div>
    </div>
  );
}

function InstructorDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Instructor Dashboard</h3>
        <p className="text-muted-foreground">Manage students, teams, and the capstone process.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          icon={Users}
          title="Users"
          description="Manage student accounts"
          accent="text-blue-500"
        />
        <DashboardCard
          icon={UsersRound}
          title="Teams"
          description="View all teams"
          accent="text-purple-500"
        />
        <DashboardCard
          icon={ClipboardList}
          title="Submissions"
          description="Review pending work"
          accent="text-green-500"
        />
        <DashboardCard
          icon={GraduationCap}
          title="Archive"
          description="Past capstone papers"
          accent="text-orange-500"
        />
      </div>
    </div>
  );
}

function AdviserDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Adviser Dashboard</h3>
        <p className="text-muted-foreground">Guide your assigned teams through the capstone process.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          icon={UsersRound}
          title="My Teams"
          description="View assigned teams"
          accent="text-blue-500"
        />
        <DashboardCard
          icon={FileText}
          title="Chapters to Review"
          description="No pending reviews"
          accent="text-green-500"
        />
        <DashboardCard
          icon={Bell}
          title="Notifications"
          description="Check updates"
          accent="text-orange-500"
        />
      </div>
    </div>
  );
}

function PanelistDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Panelist Dashboard</h3>
        <p className="text-muted-foreground">Review proposals and evaluate defenses.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          icon={FileText}
          title="Proposals"
          description="No proposals to review"
          accent="text-blue-500"
        />
        <DashboardCard
          icon={ClipboardList}
          title="Defenses"
          description="No upcoming defenses"
          accent="text-purple-500"
        />
        <DashboardCard
          icon={Bell}
          title="Notifications"
          description="Check updates"
          accent="text-orange-500"
        />
      </div>
    </div>
  );
}

function DashboardCard({ icon: Icon, title, description, accent = 'text-primary' }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <div className={`rounded-md bg-muted p-2 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, fetchUser } = useAuthStore();

  // Restore session on mount if user isn't loaded yet
  useEffect(() => {
    if (!user) {
      fetchUser();
    }
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

  const renderDashboard = () => {
    switch (user.role) {
      case ROLES.INSTRUCTOR:
        return <InstructorDashboard user={user} />;
      case ROLES.ADVISER:
        return <AdviserDashboard user={user} />;
      case ROLES.PANELIST:
        return <PanelistDashboard user={user} />;
      case ROLES.STUDENT:
      default:
        return <StudentDashboard user={user} />;
    }
  };

  return <DashboardLayout>{renderDashboard()}</DashboardLayout>;
}
