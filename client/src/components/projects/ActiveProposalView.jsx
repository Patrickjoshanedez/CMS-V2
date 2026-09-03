import { useState } from 'react';
import { useAddTitleComment, useApproveTitle, useRejectTitle } from '@/hooks/useProjects';
import { TITLE_STATUSES } from '@cms/shared';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Award, CheckCircle2, Settings, Loader2 } from 'lucide-react';

function parseProposalMetadata(metadata, abstract) {
  return {
    problemStatement: metadata?.description || abstract || 'Problem statement not provided.',
    proposedSolution:
      'Detailed solution architecture and approach will be evaluated during defense.',
    uniqueInnovation: 'Key innovations and contributions to the field.',
    targetBeneficiaries: 'Primary users and stakeholders impacted by this research.',
  };
}

export default function ActiveProposalView({ project, proposal, index, canVote }) {
  const [vote, setVote] = useState('');
  const [remarks, setRemarks] = useState('');

  const commentMutation = useAddTitleComment();
  const approveMutation = useApproveTitle();
  const rejectMutation = useRejectTitle();

  const isSubmitting =
    commentMutation.isPending || approveMutation.isPending || rejectMutation.isPending;

  const metadata = project.titleProposalMetadata?.find((m) => m.title === proposal.title);
  const content = parseProposalMetadata(metadata, project.abstract);

  const handleSubmitVote = async () => {
    if (!vote) {
      toast.error('Please select a decision (Approve or Revise).');
      return;
    }
    try {
      if (remarks.trim()) {
        await commentMutation.mutateAsync({
          projectId: project._id,
          proposalId: String(index),
          text: `Vote: ${vote}\nRemarks: ${remarks.trim()}`,
        });
      }
      if (vote === 'Approve') {
        if (window.confirm('Set this proposal as the officially approved title?')) {
          await approveMutation.mutateAsync({ projectId: project._id, proposalId: index });
          toast.success('Title has been officially approved!');
        }
      } else if (vote === 'Revision') {
        if (
          window.confirm(
            'Send this proposal back for revision? The team will update the title and resubmit it for review.',
          )
        ) {
          await rejectMutation.mutateAsync({
            projectId: project._id,
            reason: `Decision: Revise. ${remarks.trim()}`,
          });
          toast.success('Title sent back for revision.');
        }
      }
    } catch {
      toast.error('An error occurred while submitting the decision.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="space-y-6 text-card-foreground">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 border-b border-border pb-2">
            Problem Statement
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {content.problemStatement}
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 border-b border-border pb-2">
            Proposed Solution
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {content.proposedSolution}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-indigo-600 dark:text-indigo-400">
              Unique Innovation
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {content.uniqueInnovation}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-amber-600 dark:text-amber-400">
              Target Beneficiaries
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {content.targetBeneficiaries}
            </p>
          </div>
        </div>
      </div>

      {canVote && project.titleStatus === TITLE_STATUSES.SUBMITTED && (
        <Card className="rounded-xl border-border bg-muted/50 p-5 mt-8 shadow-inner">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" /> Cast Your Vote
            </h4>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className={`flex-1 rounded-lg border-emerald-500/30 hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-300 ${vote === 'Approve' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-500' : 'text-muted-foreground bg-card'}`}
                onClick={() => setVote('Approve')}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
              <Button
                variant="outline"
                className={`flex-1 rounded-lg border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-300 ${vote === 'Revision' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 ring-2 ring-amber-500' : 'text-muted-foreground bg-card'}`}
                onClick={() => setVote('Revision')}
              >
                <Settings className="mr-2 h-4 w-4" /> Revise
              </Button>
            </div>
            <Textarea
              placeholder="Enter your remarks and feedback here (Optional)..."
              className="bg-card border-border text-foreground resize-none rounded-lg focus:ring-primary"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSubmitVote}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Decision
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
