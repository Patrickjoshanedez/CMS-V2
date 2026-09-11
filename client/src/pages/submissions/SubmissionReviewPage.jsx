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
  BookOpen,
  Maximize2,
  Sparkles,
  RefreshCcw,
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
import {
  useAddAnnotation,
  useAddAnnotationReply,
  useGoogleDocComments,
  useMarkSubmissionAccepted,
  usePlagiarismReport,
  useRequestRevisionRound,
  useReviewSubmission,
  useScanSubmissionArchive,
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

  const rawAdviser =
    workspace.adviserId || workspace.project?.adviserId || workspace.project?.adviser;
  const adviserIdStr = rawAdviser?._id
    ? String(rawAdviser._id)
    : rawAdviser
      ? String(rawAdviser)
      : null;
  if (adviserIdStr && adviserIdStr === uid) return 'Adviser';

  const panelistIds = workspace.panelistIds || workspace.project?.panelistIds;
  if (Array.isArray(panelistIds)) {
    const isPanelist = panelistIds.some((pid) => {
      const pidStr = pid?._id ? String(pid._id) : String(pid);
      return pidStr === uid;
    });
    if (isPanelist) return 'Panelist';
  }

  const rawSecretary =
    workspace.secretaryId || workspace.project?.secretaryId || workspace.project?.secretary;
  const secretaryIdStr = rawSecretary?._id
    ? String(rawSecretary._id)
    : rawSecretary
      ? String(rawSecretary)
      : null;
  if (secretaryIdStr && secretaryIdStr === uid) return 'Secretary';

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

/* ────────── Originality Score Bar ────────── */

function OriginalityBar({ score }) {
  const num = Number(score);
  const valid = Number.isFinite(num) && num >= 0;
  const originality = valid ? Math.min(100, Math.max(0, num)) : 0;
  const similarity = Math.max(0, 100 - originality);

  // BukSU Capstone threshold: similarity < 25% (originality >= 75%) is compliant
  const isCompliant = originality >= 75;
  const isModerate = originality >= 50 && originality < 75;

  const barClass = isCompliant ? 'bg-emerald-500' : isModerate ? 'bg-amber-500' : 'bg-rose-500';
  const textClass = isCompliant
    ? 'text-emerald-600 dark:text-emerald-400'
    : isModerate
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Originality Score</span>
        <span className={`font-bold text-sm ${textClass}`}>{valid ? `${originality}%` : '—'}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${originality}%` }}
        />
      </div>
      {valid && (
        <div className="flex items-center justify-between text-[11px]">
          <span className={`font-semibold ${textClass}`}>
            {isCompliant
              ? 'Compliant — Passes BukSU Standard'
              : isModerate
                ? 'Moderate — Review for overlap'
                : 'High Overlap — Exceeds threshold'}
          </span>
          <span className="text-muted-foreground text-[10px]">
            {similarity.toFixed(0)}% similarity (&lt;25% target)
          </span>
        </div>
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

  const [activeRoundNumber, setActiveRoundNumber] = useState(null);
  const [overallNotes, setOverallNotes] = useState('');
  const [selectionDraft, setSelectionDraft] = useState(null);
  const [activeTab, setActiveTab] = useState('reader');
  const [viewerOpen, setViewerOpen] = useState(false);

  const workspaceQuery = useSubmissionReviewWorkspace(submissionId);
  const workspace = normalizeWorkspace(workspaceQuery.data);
  const rounds = useMemo(() => workspace?.rounds || [], [workspace]);

  // Default to the latest round number when rounds load and no user selection exists
  const effectiveRoundNumber = useMemo(() => {
    if (activeRoundNumber) return String(activeRoundNumber);
    if (rounds.length > 0) {
      return String(rounds[rounds.length - 1].roundNumber);
    }
    return '1';
  }, [rounds, activeRoundNumber]);

  const activeRound = useMemo(() => {
    const selected = rounds.find(
      (item) => String(item.roundNumber) === String(effectiveRoundNumber),
    );
    return selected || rounds[rounds.length - 1] || null;
  }, [rounds, effectiveRoundNumber]);

  const activeSubmissionId = activeRound?.sourceSubmissionId || null;

  // Derive team's working Google Doc URL from team resources or synced document
  const teamGoogleDocUrl =
    workspace?.teamResources?.googleDocUrl ||
    activeRound?.syncedGoogleDocUrl ||
    activeRound?.driveWebViewLink ||
    null;

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

  // Memoize unified submission payload for SophisticatedDocumentViewer
  const viewerSubmission = useMemo(() => {
    if (!activeRound && !workspace?.submission) return null;
    const base = workspace?.submission || {};
    const subId = activeSubmissionId || base._id;
    const versionNum = activeRound?.roundNumber || base.version || 1;
    const rawPlagScore =
      plagiarismQuery.data?.data?.overallScore ??
      activeRound?.plagiarismReport?.overallScore ??
      base.plagiarismReport?.overallScore ??
      null;
    const derivedOrigScore =
      typeof rawPlagScore === 'number'
        ? Math.round(100 - rawPlagScore)
        : (base.originalityScore ?? null);

    return {
      ...base,
      ...activeRound,
      _id: subId,
      version: versionNum,
      fileName: activeRound?.fileName || base.fileName || 'manuscript.docx',
      fileSize: activeRound?.fileSize || base.fileSize,
      fileType:
        activeRound?.fileType ||
        base.fileType ||
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      originalityScore: derivedOrigScore,
      chapter: activeRound?.chapter || base.chapter || workspace?.chapter || workspace?.title || 1,
    };
  }, [activeRound, workspace, activeSubmissionId, plagiarismQuery.data]);

  const scanArchive = useScanSubmissionArchive({
    onSuccess: () => {
      toast.success('Plagiarism archive scan initiated.');
      plagiarismQuery.refetch();
      workspaceQuery.refetch();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to initiate plagiarism scan.');
    },
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
  const originalityScore =
    activeRound?.originalityScore ?? plagiarismQuery.data?.originalityScore ?? null;

  const isRoundPendingUpload = activeRound?.status === SUBMISSION_STATUSES.PENDING_STUDENT_UPLOAD;
  const isArchived = workspace?.isArchived || false;

  const isAssignedAdviser =
    reviewerRole === 'Adviser' ||
    Boolean(
      workspace?.adviserId &&
      String(workspace.adviserId?._id || workspace.adviserId) === String(user?._id),
    ) ||
    Boolean(
      workspace?.project &&
      String(
        workspace.project.adviserId?._id ||
          workspace.project.adviserId ||
          workspace.project.adviser,
      ) === String(user?._id),
    ) ||
    user?.role === ROLES.ADVISER;

  const isInstructor = user?.role === ROLES.INSTRUCTOR;

  const isPanelistForProposal =
    workspace?.type === 'proposal' &&
    (reviewerRole === 'Panelist' ||
      (Array.isArray(workspace?.panelistIds) &&
        workspace.panelistIds.some((pid) => String(pid?._id || pid) === String(user?._id))));

  const canModerate = (isAssignedAdviser || isInstructor || isPanelistForProposal) && !isArchived;
  const canTakeDecision = Boolean(activeSubmissionId && !activeRound?.reviewClosed && canModerate);

  const annotationsCount = activeRound?.annotations?.length || 0;
  const tabs = [
    { id: 'reader', label: 'Manuscript Reader', icon: BookOpen },
    {
      id: 'comments',
      label: `Comments (${annotationsCount})`,
      icon: MessageSquare,
    },
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
              value={String(effectiveRoundNumber)}
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

                {/* Team Working Document Link */}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/60">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                    Team Google Doc
                  </span>
                  {teamGoogleDocUrl ? (
                    <a
                      href={teamGoogleDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                      title="Open Team Working Google Doc"
                    >
                      <span>Open Doc</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Not attached</span>
                  )}
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
                <div className="flex flex-col gap-2 pt-1">
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
                  {activeSubmissionId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      disabled={scanArchive.isPending}
                      onClick={() => scanArchive.mutate(activeSubmissionId)}
                    >
                      {scanArchive.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-3.5 w-3.5" />
                      )}
                      <span>{scanArchive.isPending ? 'Scanning...' : 'Re-scan Archive'}</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

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
                    Fullscreen Viewer
                  </Button>
                  {teamGoogleDocUrl && (
                    <Button asChild variant="outline" className="w-full gap-2 text-xs">
                      <a href={teamGoogleDocUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 text-blue-500" />
                        Open Team Google Doc
                      </a>
                    </Button>
                  )}
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
                    activeTab === id || (id === 'reader' && activeTab === 'text')
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                  ].join(' ')}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Manuscript Reader Tab — Canonical SophisticatedDocumentViewer embedded inline */}
            {(activeTab === 'reader' || activeTab === 'text') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    Institutional Manuscript Reader & Revision Diff Studio
                  </span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Tip: Highlight text on the manuscript to draft an inline comment.
                  </span>
                </div>

                {isRoundPendingUpload ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center bg-card">
                    <FileText className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">
                      Awaiting Student Submission
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The student has not yet uploaded the manuscript for this round.
                    </p>
                  </div>
                ) : (
                  <div
                    className="relative rounded-xl overflow-hidden shadow-sm"
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
                    <SophisticatedDocumentViewer
                      embedded={true}
                      submission={viewerSubmission}
                      fileUrl={
                        currentDocUrl ||
                        (activeSubmissionId ? `/api/submissions/${activeSubmissionId}/file` : null)
                      }
                    />
                  </div>
                )}
              </div>
            )}

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

            {/* Doc Comments Tab */}
            {activeTab === 'doc-comments' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-blue-500/5 border-blue-500/20 px-3 py-2 text-xs">
                  <p className="text-muted-foreground">
                    Live comments synced from the team&apos;s working document.
                  </p>
                  {teamGoogleDocUrl && (
                    <a
                      href={teamGoogleDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Open in Google Docs</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
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
              </div>
            </div>

            {!canModerate && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Decision actions are available to advisers and course instructors only.
              </p>
            )}
            {canModerate && activeRound?.reviewClosed && (
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
      {viewerOpen && viewerSubmission && (
        <SophisticatedDocumentViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          submission={viewerSubmission}
          fileUrl={
            currentDocUrl ||
            (activeSubmissionId ? `/api/submissions/${activeSubmissionId}/file` : null)
          }
        />
      )}
    </DashboardLayout>
  );
}
