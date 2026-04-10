import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Loader2, MessageSquare, Plus, Send } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import {
  useAddAnnotation,
  useAddAnnotationReply,
  useMarkSubmissionAccepted,
  usePlagiarismReport,
  useRequestRevisionRound,
  useReviewSubmission,
  useSubmissionReviewWorkspace,
  useViewUrl,
} from '@/hooks/useSubmissions';
import { ROLES, SUBMISSION_STATUSES } from '@cms/shared';
import { useAuthStore } from '@/stores/authStore';

function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function normalizeWorkspace(data) {
  return data?.data?.workspace || data?.workspace || data || null;
}

function ThreadedComments({ round, canComment, onAddReply, replyMutationPending }) {
  const [replyByAnnotation, setReplyByAnnotation] = useState({});

  const annotations = round?.annotations || [];

  if (!round?.sourceSubmissionId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        This round is waiting for student upload. Comments will be available once a document is
        submitted.
      </div>
    );
  }

  if (annotations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No comments yet for this round.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {annotations.map((annotation) => (
        <div key={annotation._id} className="rounded-lg border border-border/70 bg-background p-3">
          <div className="text-xs text-muted-foreground">
            Page {annotation.page || 1}
            {annotation.selectedText ? ' · Highlighted text attached' : ''}
          </div>
          {annotation.selectedText ? (
            <blockquote className="mt-2 border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground">
              {annotation.selectedText}
            </blockquote>
          ) : null}
          <p className="mt-2 text-sm text-foreground">{annotation.content}</p>

          <div className="mt-2 space-y-2">
            {(annotation.replies || []).map((reply) => (
              <div
                key={reply._id}
                className="rounded-md bg-muted/30 px-2 py-1 text-xs text-foreground"
              >
                {reply.content}
              </div>
            ))}
          </div>

          {canComment ? (
            <div className="mt-3 space-y-2">
              <Textarea
                rows={2}
                placeholder="Reply to this comment"
                value={replyByAnnotation[annotation._id] || ''}
                onChange={(event) => {
                  setReplyByAnnotation((prev) => ({
                    ...prev,
                    [annotation._id]: event.target.value,
                  }));
                }}
              />
              <Button
                size="sm"
                disabled={replyMutationPending || !(replyByAnnotation[annotation._id] || '').trim()}
                onClick={() => {
                  const content = (replyByAnnotation[annotation._id] || '').trim();
                  if (!content) return;
                  onAddReply(annotation._id, content, () => {
                    setReplyByAnnotation((prev) => ({ ...prev, [annotation._id]: '' }));
                  });
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Reply
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function SubmissionReviewPage() {
  const navigate = useNavigate();
  const { submissionId } = useParams();
  const user = useAuthStore((state) => state.user);

  const [activeRoundNumber, setActiveRoundNumber] = useState('1');
  const [overallNotes, setOverallNotes] = useState('');
  const [selectionDraft, setSelectionDraft] = useState(null);

  const workspaceQuery = useSubmissionReviewWorkspace(submissionId);
  const workspace = normalizeWorkspace(workspaceQuery.data);

  const rounds = useMemo(() => workspace?.rounds || [], [workspace]);

  const activeRound = useMemo(() => {
    const selected = rounds.find((item) => String(item.roundNumber) === String(activeRoundNumber));
    return selected || rounds[rounds.length - 1] || null;
  }, [rounds, activeRoundNumber]);

  const activeSubmissionId = activeRound?.sourceSubmissionId || null;

  const viewUrlQuery = useViewUrl(activeSubmissionId, {
    enabled: !!activeSubmissionId,
  });

  const plagiarismQuery = usePlagiarismReport(activeSubmissionId, {
    enabled: !!activeSubmissionId,
  });

  const addAnnotation = useAddAnnotation({
    onSuccess: () => toast.success('Comment saved for this selection.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to add comment.'),
  });

  const addReply = useAddAnnotationReply({
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to add reply.'),
  });

  const requestRevisionRound = useRequestRevisionRound({
    onSuccess: () => toast.success('New revision round opened for student upload.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to request revision.'),
  });

  const approveAndClose = useReviewSubmission({
    onSuccess: () => toast.success('Round approved and closed.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to approve round.'),
  });

  const markAccepted = useMarkSubmissionAccepted({
    onSuccess: () => toast.success('Submission accepted. Review thread is now locked.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to accept round.'),
  });

  if (workspaceQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center rounded-2xl border border-border bg-card/80">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Loading review workspace...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (workspaceQuery.error || !workspace) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-border bg-card/80 p-4">
          <Alert variant="destructive">
            <AlertDescription>
              {workspaceQuery.error?.response?.data?.error?.message ||
                'Failed to load review workspace.'}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const currentDocUrl = viewUrlQuery.data?.url || null;
  const viewUrlErrorCode = viewUrlQuery.error?.response?.data?.error?.code || null;
  const isSubmissionFileUnavailable = viewUrlErrorCode === 'SUBMISSION_FILE_UNAVAILABLE';
  const extractedText = plagiarismQuery.data?.extractedText || '';
  const originalityScore = activeRound?.originalityScore;

  const isRoundPendingUpload = activeRound?.status === SUBMISSION_STATUSES.PENDING_STUDENT_UPLOAD;
  const canModerate = [ROLES.ADVISER, ROLES.INSTRUCTOR].includes(user?.role);
  const canTakeDecision = !!activeSubmissionId && !activeRound?.reviewClosed && canModerate;

  return (
    <DashboardLayout>
      <div className="space-y-4 rounded-2xl border border-border bg-card/70 p-4 pb-28 shadow-sm backdrop-blur-sm md:p-6">
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Button variant="outline" onClick={() => navigate('/project/submissions')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Submissions
            </Button>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{workspace.teamName}</CardTitle>
                <CardDescription>
                  {workspace.type === 'chapter'
                    ? `Chapter ${workspace.chapter || 'N/A'} Submission`
                    : 'Submission Review'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Round</span>
                  <span className="font-medium">{activeRound?.roundNumber || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Document</span>
                  <span
                    className="max-w-[180px] truncate font-medium"
                    title={activeRound?.fileName || ''}
                  >
                    {activeRound?.fileName || 'Awaiting upload'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">File size</span>
                  <span className="font-medium">{formatBytes(activeRound?.fileSize)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <SubmissionStatusBadge status={activeRound?.status || 'pending'} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Originality Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-semibold">
                    {Number.isFinite(originalityScore) ? `${originalityScore}%` : '—'}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, Number(originalityScore) || 0))}%`,
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!activeSubmissionId}
                  onClick={() =>
                    navigate(`/project/submissions/${activeSubmissionId}/plagiarism-report`)
                  }
                >
                  View Plagiarism Report
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">Review & Annotation</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!activeSubmissionId) return;
                      requestRevisionRound.mutate({
                        submissionId: activeSubmissionId,
                        overallFeedback: overallNotes.trim() || undefined,
                      });
                    }}
                    disabled={!canTakeDecision || requestRevisionRound.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />+ New Round
                  </Button>
                </div>

                <Tabs
                  value={String(activeRound?.roundNumber || '')}
                  onValueChange={(value) => setActiveRoundNumber(value)}
                >
                  <TabsList>
                    {rounds.map((round) => (
                      <TabsTrigger key={round.roundNumber} value={String(round.roundNumber)}>
                        {round.roundNumber === 1
                          ? 'Round 1 (Original)'
                          : `Round ${round.roundNumber} (${round.isPlaceholder ? 'Pending' : 'Revision'})`}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardHeader>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Document Viewer
                  </CardTitle>
                  <CardDescription>
                    Open/download the file to inspect native document comments, then use Text
                    Annotation Mode for in-app feedback.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isRoundPendingUpload ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                      This round is waiting for a student upload.
                    </div>
                  ) : (
                    <>
                      {currentDocUrl ? (
                        <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-foreground">
                              Open the submitted file to view attached comments in your PDF/Docx
                              tool.
                            </p>
                            <Button asChild variant="outline">
                              <a href={currentDocUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="mr-2 h-4 w-4" />
                                Open / Download File
                              </a>
                            </Button>
                          </div>
                        </div>
                      ) : isSubmissionFileUnavailable ? (
                        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-warning">
                              Submission file is unavailable. Ask the student to upload a new
                              revision.
                            </p>
                            <Button variant="outline" disabled title="Submission file unavailable">
                              <FileText className="mr-2 h-4 w-4" />
                              Open / Download File
                            </Button>
                          </div>
                        </div>
                      ) : viewUrlQuery.isError ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-destructive">
                              Unable to load secure document URL right now. Please try again.
                            </p>
                            <Button variant="outline" onClick={() => viewUrlQuery.refetch()}>
                              Retry
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                          Loading secure document URL...
                        </div>
                      )}

                      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Text Annotation Mode (in-app)
                        </p>
                        <div
                          className="mt-2 max-h-72 overflow-auto rounded border border-border bg-card p-3 text-sm leading-6"
                          onMouseUp={(event) => {
                            const selection = window.getSelection();
                            const selectedText = selection?.toString().trim();
                            if (!selectedText || !activeSubmissionId) return;
                            setSelectionDraft({
                              selectedText,
                              x: event.clientX,
                              y: event.clientY,
                              content: '',
                            });
                          }}
                        >
                          {extractedText ||
                            'No extracted text available yet. Run plagiarism extraction first.'}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4" />
                    Threaded Comments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ThreadedComments
                    round={activeRound}
                    canComment={canModerate}
                    replyMutationPending={addReply.isPending}
                    onAddReply={(annotationId, content, done) => {
                      addReply.mutate(
                        {
                          submissionId: activeSubmissionId,
                          annotationId,
                          content,
                        },
                        {
                          onSuccess: () => {
                            toast.success('Reply added.');
                            done?.();
                          },
                        },
                      );
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/90">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 p-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="overallNotes">Overall notes for this round</Label>
              <Textarea
                id="overallNotes"
                rows={3}
                value={overallNotes}
                onChange={(event) => setOverallNotes(event.target.value)}
                placeholder="Write overall guidance before approving, requesting revision, or accepting."
                disabled={!canModerate}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                disabled={!canTakeDecision || approveAndClose.isPending}
                onClick={() => {
                  approveAndClose.mutate({
                    submissionId: activeSubmissionId,
                    status: SUBMISSION_STATUSES.APPROVED,
                    reviewNote: overallNotes.trim() || undefined,
                  });
                }}
              >
                [ Approve and Close ]
              </Button>
              <Button
                variant="outline"
                disabled={!canTakeDecision || requestRevisionRound.isPending}
                onClick={() => {
                  requestRevisionRound.mutate({
                    submissionId: activeSubmissionId,
                    overallFeedback: overallNotes.trim() || undefined,
                  });
                }}
              >
                [ Request Another Revision ]
              </Button>
              <Button
                variant="secondary"
                disabled={!canTakeDecision || markAccepted.isPending}
                onClick={() => {
                  markAccepted.mutate({
                    submissionId: activeSubmissionId,
                    overallFeedback: overallNotes.trim() || undefined,
                  });
                }}
              >
                [ Mark as Accepted ]
              </Button>
            </div>
          </div>
          {!canModerate ? (
            <p className="px-4 pb-3 text-xs text-muted-foreground lg:px-6">
              Decision actions are available to advisers and instructors.
            </p>
          ) : null}
        </div>

        {selectionDraft ? (
          <div
            className="fixed z-50 w-80 rounded-lg border border-border bg-card p-3 shadow-xl"
            style={{
              left: Math.max(16, selectionDraft.x - 140),
              top: Math.max(16, selectionDraft.y + 12),
            }}
          >
            <p className="text-xs font-semibold text-muted-foreground">Selected text</p>
            <p className="mt-1 max-h-20 overflow-auto text-xs italic text-foreground">
              {selectionDraft.selectedText}
            </p>
            <Textarea
              className="mt-2"
              rows={3}
              placeholder="Type your comment"
              value={selectionDraft.content}
              onChange={(event) =>
                setSelectionDraft((prev) => ({
                  ...prev,
                  content: event.target.value,
                }))
              }
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectionDraft(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={
                  addAnnotation.isPending ||
                  !selectionDraft.content.trim() ||
                  !activeSubmissionId ||
                  !canModerate
                }
                onClick={() => {
                  addAnnotation.mutate(
                    {
                      submissionId: activeSubmissionId,
                      content: selectionDraft.content.trim(),
                      selectedText: selectionDraft.selectedText,
                      highlightCoords: { mode: 'text-selection' },
                    },
                    {
                      onSuccess: () => {
                        setSelectionDraft(null);
                      },
                    },
                  );
                }}
              >
                Save Comment
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
