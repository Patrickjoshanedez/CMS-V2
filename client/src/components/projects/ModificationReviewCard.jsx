import { useState } from 'react';
import PropTypes from 'prop-types';
import { useResolveTitleModification } from '@/hooks/useProjects';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

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
    <Card className="border-warning/30 bg-warning/10 p-6 shadow-xs">
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-warning-foreground">
          <ShieldAlert className="h-4 w-4" /> Revised Title Pending Your Review
        </h4>
        <div className="grid gap-2 text-sm text-card-foreground">
          <p className="text-card-foreground">
            <span className="font-medium text-muted-foreground">Current Title:</span>{' '}
            {project.title}
          </p>
          <p className="text-card-foreground">
            <span className="font-medium text-muted-foreground">Proposed Revised Title:</span>{' '}
            <span className="font-semibold text-card-foreground">{modReq.proposedTitle}</span>
          </p>
          {modReq.justification && (
            <p className="text-card-foreground">
              <span className="font-medium text-muted-foreground">Justification:</span>{' '}
              {modReq.justification}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Textarea
            aria-label="Review note for title modification"
            placeholder="Add a review note for the team (optional)…"
            className="resize-none !bg-card !text-card-foreground"
            rows={2}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button onClick={() => handleResolve('approved')} disabled={resolve.isPending}>
            {resolve.isPending ? (
              <Spinner className="mr-2 h-4 w-4" />
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

ModificationReviewCard.propTypes = {
  project: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string,
    titleModificationRequest: PropTypes.shape({
      status: PropTypes.string,
      proposedTitle: PropTypes.string,
      justification: PropTypes.string,
    }),
  }).isRequired,
};
