import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { FileText, AlertTriangle, Users, Plus } from 'lucide-react';

/**
 * EmptyProjectState — shown when the student has no project yet.
 * Guides the user to lock their team first or create a project.
 */
export default function EmptyProjectState({ team }) {
  const navigate = useNavigate();
  const hasLockedTeam = Boolean(team?.members?.length > 0 && team?.isLocked);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No project yet</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Create a new project to start your capstone journey.
        </p>

        {!hasLockedTeam ? (
          <div className="mt-6 space-y-4 max-w-md">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Finalize and lock your team first before creating a project.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/dashboard')}>
              <Users className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <Button className="mt-6" onClick={() => navigate('/project/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        )}
      </div>
    </div>
  );
}
