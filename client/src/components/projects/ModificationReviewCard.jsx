import { useState } from 'react';
import { useResolveTitleModification } from '@/hooks/useProjects';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ShieldAlert, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function ModificationReviewCard({ project }) {
  const [reviewNote, setReviewNote] = useState('');

  const resolve = useResolveTitleModification({
    onSuccess: () => toast.success('Title modification resolved.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to resolve modification.'),
  });

  const modReq = project?.titleModificationRequest;
  if (!modReq || modReq.status !== 'pending' || !modReq.proposedTitle) return null;

  const handleResolve = (action) => {
    resolve.mutate({
      projectId: project._id,
      action,
      reviewNote: reviewNote.trim() || undefined,
    });
  };

  return (
    <Card className="rounded-xl border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 shadow-lg p-6">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Revised Title Pending Your Review
        </h4>
        <div className="grid gap-2 text-sm">
          <p>
            <span className="font-medium text-muted-foreground">Current Title:</span>{' '}
            {project.title}
          </p>
          <p>
            <span className="font-medium text-muted-foreground">Proposed Revised Title:</span>{' '}
            <span className="font-semibold text-card-foreground">{modReq.proposedTitle}</span>
          </p>
          {modReq.justification && (
            <p>
              <span className="font-medium text-muted-foreground">Justification:</span>{' '}
              {modReq.justification}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Textarea
            placeholder="Add a review note for the team (optional)…"
            className="bg-card border-border text-foreground resize-none rounded-lg focus:ring-primary"
            rows={2}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => handleResolve('approved')}
            disabled={resolve.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {resolve.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleResolve('denied')}
            disabled={resolve.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" /> Revise
          </Button>
        </div>
      </div>
    </Card>
  );
}
