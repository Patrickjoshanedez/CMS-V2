import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  GanttChartSquare,
  Loader2,
  Lock,
  MessageSquare,
  RotateCw,
  Send,
  Shield,
  ShieldCheck,
  User2,
  ExternalLink,
} from 'lucide-react';
import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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

/**
 * Derive the logged-in user's committee role for this project's workspace.
 * Compares userId against adviserId, panelistIds, and secretaryId from the workspace.
 */
function deriveReviewerRole(userId, workspace) {
  if (!userId || !workspace) return null;
  const uid = String(userId);

  if (workspace.adviserId && String(workspace.adviserId) === uid) return 'Adviser';
  if (
    Array.isArray(workspace.panelistIds) &&
    workspace.panelistIds.some((pid) => String(pid) === uid)
  )
    return 'Panelist';
  if (workspace.secretaryId && String(workspace.secretaryId) === uid) return 'Secretary';
  return null;
}

const ROLE_STYLE = {
  Adviser: {
    chip: 'bg-primary/10 text-primary border-primary/30',
    icon: ShieldCheck,
    accent: 'border-l-primary',
  },
  Panelist: {
    chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30',
    icon: ClipboardCheck,
    accent: 'border-l-violet-500',
  },
  Secretary: {
    chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    icon: GanttChartSquare,
    accent: 'border-l-amber-500',
  },
};

/* ────────── Role Context Banner ────────── */

function ReviewerRoleBanner({ role, workspace }) {
  if (!role) return null;
  const style = ROLE_STYLE[role] || ROLE_STYLE.Adviser;
  const Icon = style.icon;
  const chapterLabel = workspace?.chapter ? `Chapter ${workspace.chapter}` : 'Submission';

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm border-l-4 ${style.accent}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${style.chip}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">
          Reviewing as{' '}
          <span
            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-bold ${style.chip}`}
          >
            {role}
          </span>
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">
          {workspace?.teamName} · {chapterLabel} · {workspace?.projectTitle || 'Capstone Project'}
        </span>
      </div>
    </div>
  );
}

/* ────────── Originiality Score Bar ────────── */

function OriginalityBar({ score }) {
  const num = Number(score);
  const valid = Number.isFinite(num) && num >= 0;
  const pct = valid ? Math.min(100, num) : 0;

  // Color thresholds: green < 25%, amber 25–50%, red > 50%
  const barClass = pct <= 25 ? 'bg-emerald-500' : pct <= 50 ? 'bg-amber-500' : 'bg-rose-500';
  const textClass =
    pct <= 25
      ? 'text-emerald-600 dark:text-emerald-400'
      : pct <= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Originality Score</span>
        <span className={`font-bold text-sm ${textClass}`}>{valid ? `${num}%` : '—'}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {valid && (
        <p className={`text-[10px] font-medium ${textClass}`}>
          {pct <= 25
            ? 'Excellent — Meets the <25% threshold'
            : pct <= 50
              ? 'Moderate — Review for significant overlap'
              : 'High — Exceeds acceptable threshold'}
        </p>
      )}
    </div>
  );
}

/* ────────── Threaded Comments ────────── */

function ThreadedComments({ round, canComment, onAddReply, replyMutationPending }) {
  const [replyByAnnotation, setReplyByAnnotation] = useState({});
  const annotations = round?.annotations || [];

  if (!round?.sourceSubmissionId) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Waiting for student upload. Comments will be available once a document is submitted.
        </p>
      </div>
    );
  }

  if (annotations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No comments yet</p>
        <p className="text-xs text-muted-foreground/70">
          Use the text annotation tab to highlight and comment on specific passages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {annotations.map((annotation) => (
        <div
          key={annotation._id}
          className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <User2 className="h-3 w-3" />
            <span className="font-semibold text-foreground">
              {annotation.userId?.firstName || 'Reviewer'}
            </span>
            <span>·</span>
            <span>Page {annotation.page || 1}</span>
            {annotation.selectedText && (
              <>
                <span>·</span>
                <span className="italic">Highlighted text</span>
              </>
            )}
          </div>

          {annotation.selectedText && (
            <blockquote className="mt-2 rounded-r-md border-l-4 border-primary/40 bg-primary/5 py-1.5 pl-3 pr-2 text-xs italic text-muted-foreground">
              {annotation.selectedText}
            </blockquote>
          )}

          <p className="mt-2 text-sm leading-relaxed">{annotation.content}</p>

          {(annotation.replies || []).length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-muted pl-3">
              {(annotation.replies || []).map((reply) => (
                <div key={reply._id} className="rounded-lg bg-muted/40 px-3 py-2 text-xs">
                  <p className="font-semibold text-foreground/80">
                    {reply.userId?.firstName || 'Respondent'}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{reply.content}</p>
                </div>
              ))}
            </div>
          )}

          {canComment && (
            <div className="mt-3 space-y-2 pt-3 border-t">
              <Textarea
                rows={2}
                placeholder="Reply to this comment..."
                className="text-sm"
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
                className="gap-1.5"
                disabled={replyMutationPending || !(replyByAnnotation[annotation._id] || '').trim()}
                onClick={() => {
                  const content = (replyByAnnotation[annotation._id] || '').trim();
                  if (!content) return;
                  onAddReply(annotation._id, content, () => {
                    setReplyByAnnotation((prev) => ({ ...prev, [annotation._id]: '' }));
                  });
                }}
              >
                <Send className="h-3.5 w-3.5" />
                Send Reply
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
      <div className="flex items-center gap-3 rounded-xl border border-dashed p-6 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading document comments...
      </div>
    );
  }

  if (!canShow) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">
          {data?.message || 'Document comments are not available for this submission.'}
        </p>
      </div>
    );
  }

  if (googleComments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No document comments found.</p>
      </div>
    );
  }

  return (
    <div className="max-h-80 space-y-2 overflow-auto rounded-xl border bg-card/60 p-2">
      {googleComments.map((comment) => {
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        return (
          <div key={comment.id} className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                {formatCommentAuthor(comment.author)}
              </span>
              <span>
                {formatCommentTimestamp(comment.modifiedTime) ||
                  formatCommentTimestamp(comment.createdTime) ||
                  ''}
              </span>
            </div>
            {comment.quotedFileContent?.value && (
              <blockquote className="mt-1.5 rounded-r-md border-l-4 border-primary/40 bg-primary/5 py-1 pl-2.5 pr-2 text-xs italic text-muted-foreground">
                {comment.quotedFileContent.value}
              </blockquote>
            )}
            <p className="mt-1.5 text-sm">{comment.content || 'No comment text'}</p>
            {replies.length > 0 && (
              <div className="mt-2 space-y-1 border-l-2 border-muted pl-3">
                {replies.map((reply) => (
                  <div key={reply.id} className="rounded-lg bg-muted/40 px-2 py-1 text-xs">
                    <p className="font-medium text-foreground/80">
                      {formatCommentAuthor(reply.author)}
                    </p>
                    <p className="text-muted-foreground">{reply.content || 'No reply text'}</p>
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
  const location = useLocation();
  const { submissionId } = useParams();
  const user = useAuthStore((state) => state.user);

  const [activeRoundNumber, setActiveRoundNumber] = useState('1');
  const [overallNotes, setOverallNotes] = useState('');
  const [selectionDraft, setSelectionDraft] = useState(null);
  const [activeTab, setActiveTab] = useState('comments');
  const [viewerOpen, setViewerOpen] = useState(false);

  const workspaceQuery = useSubmissionReviewWorkspace(submissionId);
  const workspace = normalizeWorkspace(workspaceQuery.data);
  const rounds = useMemo(() => workspace?.rounds || [], [workspace]);

  const activeRound = useMemo(() => {
    const selected = rounds.find((item) => String(item.roundNumber) === String(activeRoundNumber));
    return selected || rounds[rounds.length - 1] || null;
  }, [rounds, activeRoundNumber]);

  const activeSubmissionId = activeRound?.sourceSubmissionId || null;

  // Derive reviewer's committee role client-side
  const reviewerRole = useMemo(
    () => deriveReviewerRole(user?._id, workspace),
    [user?._id, workspace],
  );

  // Build context-aware back navigation
  const backDestination =
    location.state?.from ||
    (workspace?.projectId ? `/projects/${workspace.projectId}?tab=capstone_2` : '/dashboard');

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
        <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading review workspace…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (workspaceQuery.error || !workspace) {
    return (
      <DashboardLayout>
        <Alert variant="destructive" className="m-4">
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

  const tabs = [
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'text', label: 'Text Annotation', icon: FileText },
    { id: 'doc-comments', label: 'Doc Comments', icon: ExternalLink },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* ── Top Navigation Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(backDestination)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 font-mono text-xs">
              <Shield className="h-3 w-3" />
              Review Studio
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {workspace.type === 'chapter'
                ? `Chapter ${workspace.chapter || '?'}`
                : workspace.type || 'Submission'}
            </Badge>
          </div>
        </div>

        {/* ── Reviewer Identity Banner ── */}
        <ReviewerRoleBanner role={reviewerRole} workspace={workspace} />

        {/* ── Archived Warning ── */}
        {isArchived && (
          <Alert className="border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-400">
            <Lock className="h-4 w-4" />
            <AlertDescription className="font-medium">
              This project is archived. The review workspace is in read-only mode.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Round Selector Tabs ── */}
        <Card className="shadow-sm">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <RotateCw className="h-4 w-4 text-muted-foreground" />
              Review Rounds
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <Tabs
              value={String(activeRound?.roundNumber || '')}
              onValueChange={(value) => setActiveRoundNumber(value)}
            >
              <TabsList className="w-full justify-start overflow-x-auto flex-wrap gap-1 h-auto p-1">
                {rounds.map((round) => (
                  <TabsTrigger
                    key={round.roundNumber}
                    value={String(round.roundNumber)}
                    className="gap-1.5 text-xs"
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

        {/* ── Main Content: Sidebar + Content Area ── */}
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* ── Left Sidebar ── */}
          <div className="space-y-3">
            {/* Submission Metadata Card */}
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Submission Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <SubmissionStatusBadge status={activeRound?.status || 'pending'} />
                </div>
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="shrink-0 text-muted-foreground">Document</span>
                  <span
                    className="max-w-[170px] truncate text-right text-xs font-medium"
                    title={activeRound?.fileName || ''}
                  >
                    {activeRound?.fileName || 'Awaiting upload'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">File Size</span>
                  <span className="text-xs font-medium">{formatBytes(activeRound?.fileSize)}</span>
                </div>
                {activeRound?.reviewNote && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                    <p className="font-semibold mb-1">Faculty Feedback</p>
                    <p className="leading-relaxed">{activeRound.reviewNote}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Originality Card */}
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Plagiarism & Originality
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <OriginalityBar score={originalityScore} />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  disabled={!activeSubmissionId}
                  onClick={() =>
                    navigate(`/project/submissions/${activeSubmissionId}/plagiarism-report`)
                  }
                >
                  View Full Report
                </Button>
              </CardContent>
            </Card>

            {/* Plagiarism Check Trigger */}
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

            {/* File Actions */}
            {!isRoundPendingUpload && (
              <Card className="shadow-sm">
                <CardHeader className="px-4 py-3 border-b">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    File Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4">
                  <Button
                    type="button"
                    variant="default"
                    className="w-full gap-2 shadow-xs"
                    onClick={() => setViewerOpen(true)}
                    disabled={!activeRound}
                  >
                    <Eye className="h-4 w-4" />
                    View Manuscript
                  </Button>
                  {activeSubmissionId && (
                    <Button asChild variant="outline" className="w-full gap-2">
                      <a
                        href={`/api/submissions/${activeSubmissionId}/file?download=true`}
                        download={activeRound?.fileName || 'manuscript.docx'}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                        Download Original
                      </a>
                    </Button>
                  )}
                  {isSubmissionFileUnavailable && (
                    <p className="text-[11px] text-muted-foreground text-center">
                      File preview unavailable — use download.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right Content Area ── */}
          <div className="space-y-4">
            {/* Custom Pill Tab Bar */}
            <div className="flex gap-1 rounded-xl bg-muted/30 p-1 border">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={[
                    'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200',
                    activeTab === id
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                  ].join(' ')}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Comments Tab */}
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

            {/* Text Annotation Tab */}
            {activeTab === 'text' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Select text below to leave inline highlight comments.
                </p>
                {isRoundPendingUpload ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Waiting for student upload.</p>
                  </div>
                ) : (
                  <div
                    className="max-h-[520px] cursor-text overflow-auto rounded-xl border bg-card p-4 text-sm leading-7 shadow-sm selection:bg-primary/20"
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
                      'No extracted text available yet. Run a plagiarism check first to extract document text.'}
                  </div>
                )}
              </div>
            )}

            {/* Doc Comments Tab */}
            {activeTab === 'doc-comments' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Live comments from the synced MS Word / Google Docs document.
                </p>
                {!activeSubmissionId ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
                    <ExternalLink className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">
                      Select a submission round to load document comments.
                    </p>
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

        {/* ── Decision Toolbar ── */}
        <Card
          className={`border-2 shadow-lg transition-all ${
            canTakeDecision ? 'border-primary/20 bg-primary/5' : 'border-border/60 bg-muted/20'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="overallNotes" className="text-sm font-semibold">
                  Overall Feedback / Decision Notes
                </Label>
                <Textarea
                  id="overallNotes"
                  rows={2}
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  placeholder={
                    canModerate
                      ? 'Write your feedback or decision rationale before making a decision…'
                      : 'You do not have decision-making authority for this project.'
                  }
                  disabled={!canModerate}
                  className="resize-none text-sm"
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
                  {approveAndClose.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve Round
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
                  {requestRevisionRound.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="h-4 w-4" />
                  )}
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
                  {markAccepted.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Accept & Lock
                </Button>
              </div>
            </div>

            {!canModerate && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Decision actions are available to advisers and course instructors only.
              </p>
            )}
            {canTakeDecision && activeRound?.reviewClosed && (
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ This round has been closed. Open a new revision round to continue.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Text Selection Popover ── */}
        {selectionDraft && (
          <div
            className="fixed z-50 w-80 rounded-xl border bg-card p-4 shadow-2xl"
            style={{
              left: Math.max(16, selectionDraft.x - 140),
              top: Math.max(16, selectionDraft.y + 12),
            }}
          >
            <p className="text-xs font-semibold text-muted-foreground">Selected Passage</p>
            <p className="mt-1 max-h-20 overflow-auto rounded border-l-2 border-primary/40 bg-primary/5 pl-2 py-1 text-xs italic text-muted-foreground">
              {selectionDraft.selectedText}
            </p>
            <Textarea
              className="mt-2 text-sm"
              rows={3}
              placeholder="Type your annotation comment…"
              value={selectionDraft.content}
              onChange={(e) => setSelectionDraft((prev) => ({ ...prev, content: e.target.value }))}
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectionDraft(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
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
                <MessageSquare className="h-3.5 w-3.5" />
                Save Comment
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {activeRound && (
        <SophisticatedDocumentViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          submission={{
            ...activeRound,
            _id: activeSubmissionId || activeRound._id,
          }}
          fileUrl={currentDocUrl}
        />
      )}
    </DashboardLayout>
  );
}
