import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { ROLES } from '@cms/shared';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useMyTeam } from '@/hooks/useTeams';
import EmptyTeamState from './EmptyTeamState';
import CreateTeamForm from './CreateTeamForm';
import AcceptInviteForm from './AcceptInviteForm';
import StudentTeamDetail from './StudentTeamDetail';

/**
 * StudentTeamView - Dedicated student workspace for team creation, invite handling, and roster management.
 */
export default function StudentTeamView({ user }) {
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
