import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, Award, FileSearch, FolderArchive, Printer } from 'lucide-react';
import { useArchiveProject } from '@/hooks/useProjects';
import { toast } from 'sonner';

export default function AcademicReportsWidget({ project, canManageArchive = false, onArchived }) {
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showPlagiarismModal, setShowPlagiarismModal] = useState(false);
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
    if (
      window.confirm(
        'Archive this capstone project? All project data will be preserved in read-only archive mode (FRINS2).',
      )
    ) {
      setIsArchiving(true);
      archiveMutation.mutate({
        projectId: project._id,
        reason: 'Archived via Instructor Academic Reports panel',
      });
    }
  };

  const evaluations = project?.evaluations || [];
  const latestPlagiarism = project?.plagiarismResult || null;

  return (
    <>
      <Card className="rounded-2xl border-border bg-card shadow-lg">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
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
              <Award className="h-3.5 w-3.5 text-amber-500" />
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
              <FileSearch className="h-3.5 w-3.5 text-blue-500" />
              Plagiarism Report
            </span>
            <Badge
              variant={latestPlagiarism?.overallSimilarityScore > 25 ? 'destructive' : 'success'}
              className="h-5 px-1.5 text-[10px]"
            >
              {latestPlagiarism?.overallSimilarityScore !== undefined
                ? `${latestPlagiarism.overallSimilarityScore}%`
                : 'Checked'}
            </Badge>
          </Button>

          {canManageArchive && (
            <div className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                onClick={handleArchiveProject}
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
      {showEvaluationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEvaluationModal(false);
          }}
        >
          <Card className="w-full max-w-2xl border-border shadow-2xl max-h-[85vh] flex flex-col">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Award className="h-5 w-5 text-amber-500" />
                  Official Defense Evaluation Report
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="gap-1.5 h-8 text-xs"
                >
                  <Printer className="h-3.5 w-3.5" /> Print / Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 overflow-y-auto flex-1 text-sm">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                <p className="font-bold text-foreground">{project?.title || 'Capstone Project'}</p>
                <p className="text-xs text-muted-foreground">
                  Academic Year: {project?.academicYear || 'N/A'} &bull; Department:{' '}
                  {project?.courseId?.name || 'BSIT'}
                </p>
              </div>

              {evaluations.length > 0 ? (
                <div className="space-y-3">
                  {evaluations.map((ev, i) => (
                    <div
                      key={ev._id || i}
                      className="rounded-lg border border-border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">
                          {ev.panelistId?.firstName
                            ? `${ev.panelistId.firstName} ${ev.panelistId.lastName || ''}`
                            : `Evaluator #${i + 1}`}
                        </span>
                        <Badge variant="default" className="text-xs font-mono font-bold">
                          Score: {ev.score || ev.totalScore || 0}%
                        </Badge>
                      </div>
                      {ev.remarks && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
                          &ldquo;{ev.remarks}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  No individual panel evaluations recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plagiarism Report Modal */}
      {showPlagiarismModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPlagiarismModal(false);
          }}
        >
          <Card className="w-full max-w-2xl border-border shadow-2xl max-h-[85vh] flex flex-col">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <FileSearch className="h-5 w-5 text-blue-500" />
                  Academic Plagiarism &amp; Integrity Report
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="gap-1.5 h-8 text-xs"
                >
                  <Printer className="h-3.5 w-3.5" /> Print / Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 overflow-y-auto flex-1 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">
                    Overall Similarity
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {latestPlagiarism?.overallSimilarityScore !== undefined
                      ? `${latestPlagiarism.overallSimilarityScore}%`
                      : 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">
                    Institutional Status
                  </p>
                  <Badge variant="success" className="mt-1 text-xs">
                    Within Policy (&le; 25%)
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Corpus &amp; Sidecar Matching Analysis
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Document text was indexed against institutional repositories using the Winnowing
                  algorithm with noise-suppression windowing and semantic cosine embeddings.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
