import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { FileText, AlertTriangle, Users, Plus, FileEdit, RotateCcw } from 'lucide-react';
import { projectService } from '@/services/authService';

/**
 * EmptyProjectState — shown when the student has no approved project yet.
 * Guides the user to resume an existing draft, lock their team, or create a proposal.
 */
export default function EmptyProjectState({ team }) {
  const navigate = useNavigate();
  const hasLockedTeam = Boolean(team?.members?.length > 0 && team?.isLocked);

  const [hasDraft, setHasDraft] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw =
        window.localStorage.getItem('cms.create_project_draft') ||
        window.localStorage.getItem('cms.create_project_draft.backup');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return (
        Array.isArray(parsed?.titleProposals) &&
        parsed.titleProposals.some(
          (p) =>
            p?.title?.trim() ||
            p?.pitchDeck?.problemStatement?.trim() ||
            p?.pitchDeck?.proposedSolution?.trim(),
        )
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let isMounted = true;
    projectService
      .getCreateProjectDraft()
      .then((res) => {
        const draft = res?.data?.data?.draft || res?.data?.draft;
        if (!isMounted) return;
        if (
          draft &&
          Array.isArray(draft.titleProposals) &&
          draft.titleProposals.some(
            (p) =>
              p?.title?.trim() ||
              p?.pitchDeck?.problemStatement?.trim() ||
              p?.pitchDeck?.proposedSolution?.trim(),
          )
        ) {
          setHasDraft(true);
        }
      })
      .catch(() => {
        // Fallback to localStorage state
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartFresh = async () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('cms.create_project_draft');
        window.localStorage.removeItem('cms.create_project_draft.backup');
      }
      await projectService.clearCreateProjectDraft();
    } catch {
      // ignore
    }
    navigate('/project/create');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
        {hasDraft ? (
          <FileEdit className="mb-4 h-12 w-12 text-blue-600 dark:text-blue-400" />
        ) : (
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        )}

        <h3 className="text-lg font-semibold text-foreground">
          {hasDraft ? 'Resume Capstone Proposal' : 'Proceed to Create Capstone Proposal'}
        </h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {hasDraft
            ? 'You have an active proposal draft saved. Resume where you left off to complete and submit your title proposals for committee review.'
            : 'Draft and submit your capstone title proposals to begin your defense progression.'}
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
        ) : hasDraft ? (
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
            <Button onClick={() => navigate('/project/create')}>
              <FileEdit className="mr-2 h-4 w-4" />
              Resume Proposal Draft
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartFresh}
              className="text-muted-foreground"
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Start Fresh Proposal
            </Button>
          </div>
        ) : (
          <Button className="mt-6" onClick={() => navigate('/project/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Capstone Proposal
          </Button>
        )}
      </div>
    </div>
  );
}
