import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  CheckCircle2,
  RotateCw,
  Lock,
  ExternalLink,
} from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import PlagiarismChecker from '@/components/submissions/PlagiarismChecker';
import {
  useAddAnnotation,
  useAddAnnotationReply,
  useGoogleDocComments,
  useMarkSubmissionAccepted,
  usePlagiarismReport,
  useRequestRevisionRound,
  useReviewSubmission,
  useSubmissionReviewWorkspace,
  useViewUrl,
} from '@/hooks/useSubmissions';
import { ROLES, SUBMISSION_STATUSES } from '@cms/shared';
import { useAuthStore } from '@/stores/authStore';

/* ────────── Helpers ────────── */

function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function normalizeWorkspace(data) {
  return data?.data?.workspace || data?.workspace || data || null;
}

function formatCommentAuthor(author) {
  return author?.displayName || author?.emailAddress || 'Unknown reviewer';
}

function formatCommentTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

/* ────────── Threaded Comments ────────── */

function ThreadedComments({ round, canComment, onAddReply, replyMutationPending }) {
  const [replyByAnnotation, setReplyByAnnotation] = useState({});
  const annotations = round?.annotations || [];

  if (!round?.sourceSubmissionId) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Waiting for student upload. Comments will be available once a document is submitted.
      </div>
    );
  }

  if (annotations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No comments yet for this round.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {annotations.map((annotation) => (
        <div key={annotation._id} className="rounded-lg border bg-background p-3">
          <div className="text-xs text-muted-foreground">
            Page {annotation.page || 1}
            {annotation.selectedText ? ' · Highlighted text attached' : ''}
          </div>
          {annotation.selectedText && (
            <blockquote className="mt-2 border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground">
              {annotation.selectedText}
            </blockquote>
          )}
          <p className="mt-2 text-sm">{annotation.content}</p>

          <div className="mt-2 space-y-2">
            {(annotation.replies || []).map((reply) => (
              <div key={reply._id} className="rounded-md bg-muted/30 px-2 py-1 text-xs">
                {reply.content}
              </div>
            ))}
          </div>

          {canComment && (
            <div className="mt-3 space-y-2">
              <Textarea
                rows={2}
                placeholder="Reply to this comment"
                value={replyByAnnotation[annotation._id] || ''}
                onChange={(e) =>
                  setReplyByAnnotation((prev) => ({
                    ...prev,
                    [annotation._id]: e.target.value,
                  }))
                }
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
          )}
        </div>
      ))}
    </div>
  );
}

/* ────────── Google Doc Comments ────────── */

function GoogleDocCommentsPanel({ query, data }) {
  const googleComments = Array.isArray(data?.comments) ? data.comments : [];
  const canShow = data?.status === 'ok';

  if (query.isLoading) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Loading document comments...
      </div>
    );
  }

  if (!canShow) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        {data?.message || 'Document comments are not available for this submission.'}
      </div>
    );
  }

  if (googleComments.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        No document comments found.
      </div>
    );
  }

  return (
    <div className="max-h-80 space-y-2 overflow-auto rounded-md border bg-card/60 p-2">
      {googleComments.map((comment) => {
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        return (
          <div key={comment.id} className="rounded-md border bg-background p-2">
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatCommentAuthor(comment.author)}
              </span>
              <span>
                {formatCommentTimestamp(comment.modifiedTime) ||
                  formatCommentTimestamp(comment.createdTime) ||
                  ''}
              </span>
            </div>
            {comment.quotedFileContent?.value && (
              <blockquote className="mt-1 border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground">
                {comment.quotedFileContent.value}
              </blockquote>
            )}
            <p className="mt-1 text-sm">{comment.content || 'No comment text'}</p>
            {replies.length > 0 && (
              <div className="mt-2 space-y-1">
                {replies.map((reply) => (
                  <div key={reply.id} className="rounded bg-muted/40 px-2 py-1 text-xs">
                    <p className="text-muted-foreground">
                      {formatCommentAuthor(reply.author)} ·{' '}
                      {formatCommentTimestamp(reply.modifiedTime) || ''}
                    </p>
                    <p>{reply.content || 'No reply text'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────── Main ────────── */

export default function SubmissionReviewPage() {
  const navigate = useNavigate();
  const { submissionId } = useParams();
  const user = useAuthStore((state) => state.user);

  const [activeRoundNumber, setActiveRoundNumber] = useState('1');
  const [overallNotes, setOverallNotes] = useState('');
  const [selectionDraft, setSelectionDraft] = useState(null);
  const [activeTab, setActiveTab] = useState('comments');

  const workspaceQuery = useSubmissionReviewWorkspace(submissionId);
  const workspace = normalizeWorkspace(workspaceQuery.data);
  const rounds = useMemo(() => workspace?.rounds || [], [workspace]);

  const activeRound = useMemo(() => {
    const selected = rounds.find((item) => String(item.roundNumber) === String(activeRoundNumber));
    return selected || rounds[rounds.length - 1] || null;
  }, [rounds, activeRoundNumber]);

  const activeSubmissionId = activeRound?.sourceSubmissionId || null;

  const googleDocCommentsQuery = useGoogleDocComments(activeSubmissionId, {
    enabled: !!activeSubmissionId,
  });
  const viewUrlQuery = useViewUrl(activeSubmissionId, { enabled: !!activeSubmissionId });
  const plagiarismQuery = usePlagiarismReport(activeSubmissionId, {
    enabled: !!activeSubmissionId,
  });

  const addAnnotation = useAddAnnotation({
    onSuccess: () => toast.success('Comment saved.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to add comment.'),
  });

  const addReply = useAddAnnotationReply({
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to add reply.'),
  });

  const requestRevisionRound = useRequestRevisionRound({
    onSuccess: () => toast.success('New revision round opened.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to request revision.'),
  });

  const approveAndClose = useReviewSubmission({
    onSuccess: () => toast.success('Round approved and closed.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to approve.'),
  });

  const markAccepted = useMarkSubmissionAccepted({
    onSuccess: () => toast.success('Submission accepted. Review thread is now locked.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to accept.'),
  });

  /* ────── Loading ────── */
  if (workspaceQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center">
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
        <Alert variant="destructive">
          <AlertDescription>
            {workspaceQuery.error?.response?.data?.error?.message ||
              'Failed to load review workspace.'}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const currentDocUrl = viewUrlQuery.data?.url || null;
  const viewUrlErrorCode = viewUrlQuery.error?.response?.data?.error?.code || null;
  const isSubmissionFileUnavailable = viewUrlErrorCode === 'SUBMISSION_FILE_UNAVAILABLE';
  const extractedText = plagiarismQuery.data?.extractedText || '';
  const originalityScore = activeRound?.originalityScore;

  const isRoundPendingUpload = activeRound?.status === SUBMISSION_STATUSES.PENDING_STUDENT_UPLOAD;
  const isArchived = workspace?.isArchived || false;
  const canModerate = [ROLES.ADVISER, ROLES.INSTRUCTOR].includes(user?.role) && !isArchived;
  const canTakeDecision = !!activeSubmissionId && !activeRound?.reviewClosed && canModerate;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/project/submissions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Submissions
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{workspace.teamName}</span>
            <Badge variant="outline">
              {workspace.type === 'chapter' ? `Chapter ${workspace.chapter || '?'}` : 'Submission'}
            </Badge>
          </div>
        </div>

        {isArchived && (
          <Alert className="border-amber-500/50 bg-amber-500/5 text-amber-600">
            <Lock className="h-4 w-4" />
            <AlertDescription className="font-medium">
              This project is archived. This review workspace is in read-only mode.
            </AlertDescription>
          </Alert>
        )}

        {/* Round Tabs */}
        <Card>
          <CardContent className="p-3">
            <Tabs
              value={String(activeRound?.roundNumber || '')}
              onValueChange={(value) => setActiveRoundNumber(value)}
            >
              <TabsList className="w-full justify-start overflow-x-auto">
                {rounds.map((round) => (
                  <TabsTrigger
                    key={round.roundNumber}
                    value={String(round.roundNumber)}
                    className="gap-1.5"
                  >
                    {round.roundNumber === 1 ? 'Original' : `Revision ${round.roundNumber - 1}`}
                    {round.reviewClosed && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                    {round.isPlaceholder && (
                      <span className="text-[10px] text-muted-foreground">(pending)</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Main Content — 2-col: info sidebar + document area */}
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left: Submission Info */}
          <div className="space-y-4">
            {/* Status card */}
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <SubmissionStatusBadge status={activeRound?.status || 'pending'} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Document</span>
                  <span
                    className="max-w-[160px] truncate text-xs font-medium"
                    title={activeRound?.fileName || ''}
                  >
                    {activeRound?.fileName || 'Awaiting upload'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Size</span>
                  <span className="text-xs">{formatBytes(activeRound?.fileSize)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Originality */}
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Originality</span>
                  <span className="text-sm font-semibold">
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
                  size="sm"
                  className="w-full"
                  disabled={!activeSubmissionId}
                  onClick={() =>
                    navigate(`/project/submissions/${activeSubmissionId}/plagiarism-report`)
                  }
                >
                  View Report
                </Button>
              </CardContent>
            </Card>

            {/* Plagiarism check */}
            {!!activeSubmissionId && !isRoundPendingUpload && (
              <PlagiarismChecker
                submissionId={activeSubmissionId}
                submissionTitle={activeRound?.fileName || `Round ${activeRound?.roundNumber || ''}`}
                showMatchDetails={true}
                onCheckComplete={() => {
                  plagiarismQuery.refetch();
                  workspaceQuery.refetch();
                }}
              />
            )}

            {/* File action */}
            {!isRoundPendingUpload && currentDocUrl && (
              <Button asChild variant="outline" className="w-full gap-2">
                <a href={currentDocUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open File
                </a>
              </Button>
            )}
          </div>

          {/* Right: Tabbed content area */}
          <div className="space-y-4">
            {/* Content tabs */}
            <div className="flex gap-1 border-b">
              {['comments', 'text', 'doc-comments'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                    activeTab === tab
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {tab === 'comments' && 'Comments'}
                  {tab === 'text' && 'Text Annotation'}
                  {tab === 'doc-comments' && 'Doc Comments'}
                </button>
              ))}
            </div>

            {/* Comments tab */}
            {activeTab === 'comments' && (
              <ThreadedComments
                round={activeRound}
                canComment={canModerate}
                replyMutationPending={addReply.isPending}
                onAddReply={(annotationId, content, done) => {
                  addReply.mutate(
                    { submissionId: activeSubmissionId, annotationId, content },
                    {
                      onSuccess: () => {
                        toast.success('Reply added.');
                        done?.();
                      },
                    },
                  );
                }}
              />
            )}

            {/* Text annotation tab */}
            {activeTab === 'text' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Select text below to leave inline comments.
                </p>
                {isRoundPendingUpload ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    Waiting for student upload.
                  </div>
                ) : (
                  <div
                    className="max-h-[500px] overflow-auto rounded-lg border bg-card p-4 text-sm leading-7"
                    onMouseUp={(e) => {
                      const selection = window.getSelection();
                      const selectedText = selection?.toString().trim();
                      if (!selectedText || !activeSubmissionId) return;
                      setSelectionDraft({
                        selectedText,
                        x: e.clientX,
                        y: e.clientY,
                        content: '',
                      });
                    }}
                  >
                    {extractedText ||
                      'No extracted text available yet. Run plagiarism extraction first.'}
                  </div>
                )}
              </div>
            )}

            {/* Doc comments tab */}
            {activeTab === 'doc-comments' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Comments from MS Word / Google Docs.
                </p>
                {!activeSubmissionId ? (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Select a submission round to load comments.
                  </div>
                ) : (
                  <GoogleDocCommentsPanel
                    query={googleDocCommentsQuery}
                    data={googleDocCommentsQuery.data || {}}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Decision Toolbar — sticky at bottom */}
        <Card className="sticky bottom-4 border-2 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="overallNotes" className="text-sm">
                  Overall Feedback
                </Label>
                <Textarea
                  id="overallNotes"
                  rows={2}
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  placeholder="Write guidance before making a decision..."
                  disabled={!canModerate}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!canTakeDecision || approveAndClose.isPending}
                  onClick={() => {
                    approveAndClose.mutate({
                      submissionId: activeSubmissionId,
                      status: SUBMISSION_STATUSES.APPROVED,
                      reviewNote: overallNotes.trim() || undefined,
                    });
                  }}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
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
                  className="gap-1.5"
                >
                  <RotateCw className="h-4 w-4" />
                  Request Revision
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
                  className="gap-1.5"
                >
                  <Lock className="h-4 w-4" />
                  Accept & Lock
                </Button>
              </div>
            </div>
            {!canModerate && (
              <p className="mt-2 text-xs text-muted-foreground">
                Decision actions are available to advisers and instructors.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Selection popover for text annotation */}
        {selectionDraft && (
          <div
            className="fixed z-50 w-80 rounded-lg border bg-card p-3 shadow-xl"
            style={{
              left: Math.max(16, selectionDraft.x - 140),
              top: Math.max(16, selectionDraft.y + 12),
            }}
          >
            <p className="text-xs font-semibold text-muted-foreground">Selected text</p>
            <p className="mt-1 max-h-20 overflow-auto text-xs italic">
              {selectionDraft.selectedText}
            </p>
            <Textarea
              className="mt-2"
              rows={3}
              placeholder="Type your comment"
              value={selectionDraft.content}
              onChange={(e) => setSelectionDraft((prev) => ({ ...prev, content: e.target.value }))}
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
                    { onSuccess: () => setSelectionDraft(null) },
                  );
                }}
              >
                Save Comment
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
