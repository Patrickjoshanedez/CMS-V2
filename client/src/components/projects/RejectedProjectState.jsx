import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { XCircle, Plus } from 'lucide-react';

/**
 * RejectedProjectState — shown when the team's project has been rejected.
 * Displays rejection info and a prominent "Create Another Project" action.
 */
export default function RejectedProjectState({ project }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Your project <span className="font-semibold">&ldquo;{project.title}&rdquo;</span> has been
          rejected.
          {project.rejectionReason && (
            <span className="mt-1 block text-sm">
              <span className="font-medium">Reason:</span> {project.rejectionReason}
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="flex flex-col items-center py-10 text-center">
          <XCircle className="mb-4 h-12 w-12 text-destructive/60" />
          <h3 className="text-lg font-semibold">Project Rejected</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Your previous project was not approved. You can create a new project with a different
            topic and start the process again.
          </p>
          <Button className="mt-6" onClick={() => navigate('/project/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Another Project
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
