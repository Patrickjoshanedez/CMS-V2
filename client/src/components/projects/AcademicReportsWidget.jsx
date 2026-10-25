import { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, Award, FileSearch, FolderArchive, Printer } from 'lucide-react';
import { useArchiveProject } from '@/hooks/useProjects';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';

export default function AcademicReportsWidget({ project, canManageArchive = false, onArchived }) {
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showPlagiarismModal, setShowPlagiarismModal] = useState(false);
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const archiveMutation = useArchiveProject({
    onSuccess: () => {
      toast.success('Capstone project successfully archived.');
      setIsArchiving(false);
      if (onArchived) onArchived();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to archive project.');
      setIsArchiving(false);
    },
  });

  const handleArchiveProject = () => {
    setIsArchiving(true);
    archiveMutation.mutate({
      projectId: project._id,
      reason: 'Archived via Instructor Academic Reports panel',
    });
  };

  const evaluations = project?.evaluations || [];
  const latestPlagiarism = project?.plagiarismResult || null;
  const similarityScore = latestPlagiarism?.overallSimilarityScore;
  const hasSimilarityScore = Number.isFinite(similarityScore);
  const requiresSimilarityReview = hasSimilarityScore && similarityScore > 25;

  return (
    <>
      <Card className="rounded-2xl border-border bg-card shadow-lg">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            Academic Reports (FRINS6)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-xs text-muted-foreground">
            Generate and export official synthesized academic assessment and plagiarism reports.
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between text-xs"
            onClick={() => setShowEvaluationModal(true)}
          >
            <span className="flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-warning" />
              Evaluation Report
            </span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {evaluations.length} Record{evaluations.length === 1 ? '' : 's'}
            </Badge>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between text-xs"
            onClick={() => setShowPlagiarismModal(true)}
          >
            <span className="flex items-center gap-2">
              <FileSearch className="h-3.5 w-3.5 text-info" />
              Plagiarism Report
            </span>
            <Badge
              variant={
                !hasSimilarityScore
                  ? 'secondary'
                  : requiresSimilarityReview
                    ? 'destructive'
                    : 'success'
              }
              className="h-5 px-1.5 text-[10px]"
            >
              {hasSimilarityScore ? `${similarityScore}% similarity` : 'Not checked'}
            </Badge>
          </Button>

          {canManageArchive && (
            <div className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start border-warning/30 text-warning hover:bg-warning/10"
                onClick={() => setShowArchiveConfirmation(true)}
                disabled={isArchiving || archiveMutation.isPending}
              >
                <FolderArchive className="mr-2 h-3.5 w-3.5" />
                {isArchiving ? 'Archiving...' : 'Archive Capstone (FRINS2)'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evaluation Report Modal */}
      <Dialog open={showEvaluationModal} onOpenChange={setShowEvaluationModal}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4 pr-16">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <Award className="h-5 w-5 text-warning" />
                  Official Defense Evaluation Report
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Defense evaluation scores and panel feedback for this capstone project.
                </DialogDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="h-8 shrink-0 gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" /> Print / Export
              </Button>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 text-sm">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="font-bold text-foreground">{project?.title || 'Capstone Project'}</p>
              <p className="text-xs text-muted-foreground">
                Academic Year: {project?.academicYear || 'N/A'} &bull; Department:{' '}
                {project?.courseId?.name || 'BSIT'}
              </p>
            </div>

            {evaluations.length > 0 ? (
              <div className="space-y-3">
                {evaluations.map((ev, i) => (
                  <div key={ev._id || i} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-foreground">
                        {ev.panelistId?.firstName
                          ? `${ev.panelistId.firstName} ${ev.panelistId.lastName || ''}`
                          : `Evaluator #${i + 1}`}
                      </span>
                      <Badge variant="default" className="shrink-0 font-mono text-xs font-bold">
                        Score: {ev.score || ev.totalScore || 0}%
                      </Badge>
                    </div>
                    {ev.remarks && (
                      <p className="border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground">
                        &ldquo;{ev.remarks}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No individual panel evaluations recorded yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPlagiarismModal} onOpenChange={setShowPlagiarismModal}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4 pr-16">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <FileSearch className="h-5 w-5 text-info" />
                  Academic Plagiarism &amp; Integrity Report
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Similarity score and institutional policy status for this capstone project.
                </DialogDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="h-8 shrink-0 gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" /> Print / Export
              </Button>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Overall Similarity
                </p>
                <p className="text-2xl font-bold text-primary">
                  {hasSimilarityScore ? `${similarityScore}%` : 'N/A'}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Institutional Status
                </p>
                <Badge
                  variant={
                    !hasSimilarityScore
                      ? 'secondary'
                      : requiresSimilarityReview
                        ? 'destructive'
                        : 'success'
                  }
                  className="mt-1 text-xs"
                >
                  {!hasSimilarityScore
                    ? 'No report available'
                    : requiresSimilarityReview
                      ? 'Review required (> 25%)'
                      : 'Within Policy (≤ 25%)'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Corpus &amp; Sidecar Matching Analysis
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Document text was indexed against institutional repositories using the Winnowing
                algorithm with noise-suppression windowing and semantic cosine embeddings.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showArchiveConfirmation} onOpenChange={setShowArchiveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this capstone project?</AlertDialogTitle>
            <AlertDialogDescription>
              All project data will be preserved in read-only archive mode (FRINS2). This action
              changes the project to archived status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving || archiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleArchiveProject}
              disabled={isArchiving || archiveMutation.isPending}
            >
              {isArchiving || archiveMutation.isPending ? 'Archiving…' : 'Archive project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

AcademicReportsWidget.propTypes = {
  project: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    academicYear: PropTypes.string,
    courseId: PropTypes.shape({ name: PropTypes.string }),
    evaluations: PropTypes.arrayOf(PropTypes.object),
    plagiarismResult: PropTypes.shape({ overallSimilarityScore: PropTypes.number }),
  }),
  canManageArchive: PropTypes.bool,
  onArchived: PropTypes.func,
};
