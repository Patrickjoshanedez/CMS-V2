import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import PlagiarismChecker from '@/components/submissions/PlagiarismChecker';
import { useAuthStore } from '@/stores/authStore';
import {
  useSubmission,
  useViewUrl,
  useReviewSubmission,
  useUnlockSubmission,
  useAddAnnotation,
  useRemoveAnnotation,
} from '@/hooks/useSubmissions';
import { ROLES, SUBMISSION_STATUSES, PLAGIARISM_STATUSES } from '@cms/shared';
import {
  BarChart2,
  ClipboardCheck,
  FileText,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Trash2,
  Unlock,
  Lock,
  User,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

/* ────────── Helpers ────────── */

const CHAPTER_LABELS = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/* ────────── Sub-components ────────── */

/**
 * FileInfoCard — displays metadata about the uploaded file.
 */
function FileInfoCard({ submission, viewUrl, viewUrlLoading }) {
  const navigate = useNavigate();
  const chapterLabel = CHAPTER_LABELS[submission.chapter - 1] || `Chapter ${submission.chapter}`;
  const documentUrl = viewUrl?.url || null;

  return (
    <Card className="overflow-hidden border-border/70 bg-card/70 shadow-sm">
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle className="flex flex-wrap items-center gap-2 text-xl sm:text-2xl">
          <FileText className="h-5 w-5 text-primary" />
          <span>{chapterLabel}</span>
          <Badge variant="outline" className="font-medium">
            v{submission.version}
          </Badge>
        </CardTitle>
        <CardDescription>Uploaded {formatDate(submission.createdAt)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/25 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoRow label="File" value={submission.fileName} />
          <InfoRow label="Size" value={formatBytes(submission.fileSize)} />
          <InfoRow label="Type" value={submission.fileType} />
          <InfoRow label="Status">
            <SubmissionStatusBadge status={submission.status} />
          </InfoRow>
          <InfoRow label="Deadline" value={formatDate(submission.deadlineAt)} />
          {submission.isLate && (
            <InfoRow label="Late Submission">
              <Badge variant="warning" className="font-medium">
                Late
              </Badge>
            </InfoRow>
          )}
          {submission.originalityScore !== null && submission.originalityScore !== undefined && (
            <InfoRow label="Originality" value={`${submission.originalityScore}%`} />
          )}
        </div>

        {submission.originalityScore !== null && submission.originalityScore !== undefined && (
          <div className="space-y-2 rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Originality Score</p>
              <p className="text-sm font-semibold text-foreground">
                {submission.originalityScore}%
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, submission.originalityScore))}%` }}
              />
            </div>
          </div>
        )}

        {submission.remarks && (
          <div className="space-y-1 rounded-lg border border-border/60 bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              {submission.isLate ? 'Late Justification Note' : 'Remarks'}
            </p>
            <p className="text-sm text-foreground">{submission.remarks}</p>
          </div>
        )}

        {submission.reviewNote && (
          <div className="space-y-1 rounded-lg border border-border/60 bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">Review Note</p>
            <p className="text-sm text-foreground">{submission.reviewNote}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {documentUrl && (
            <Button asChild variant="outline" className="sm:w-auto">
              <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open / Download Document
              </a>
            </Button>
          )}
          {submission.teamResources?.googleDocUrl && (
            <Button asChild variant="secondary" className="sm:w-auto">
              <a
                href={submission.teamResources.googleDocUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Open Team Google Doc
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate('/plagiarism-checker')}
            className="sm:w-auto"
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Open Archive Checker
          </Button>
          {submission.plagiarismResult?.status === PLAGIARISM_STATUSES.COMPLETED && (
            <Button
              variant="outline"
              onClick={() => navigate(`/project/submissions/${submission._id}/plagiarism-report`)}
              className="sm:w-auto"
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              View Plagiarism Report
            </Button>
          )}
          {viewUrlLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating view link...
            </p>
          )}
        </div>

        {documentUrl && (
          <p className="text-xs text-muted-foreground">
            Open or download this file to read attached document comments in your PDF/Docx reader.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, children }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children || <p className="text-sm font-medium break-all text-foreground">{value}</p>}
    </div>
  );
}

/**
 * ReviewPanel — lets faculty approve, request revisions, or reject a submission.
 */
function ReviewPanel({ submissionId, currentStatus }) {
  const [reviewNote, setReviewNote] = useState('');
  const reviewMutation = useReviewSubmission({
    onSuccess: () => toast.success('Submission reviewed successfully.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Review failed.'),
  });

  const canReview =
    currentStatus === SUBMISSION_STATUSES.PENDING ||
    currentStatus === SUBMISSION_STATUSES.UNDER_REVIEW;

  if (!canReview) return null;

  const handleReview = (status) => {
    reviewMutation.mutate({ submissionId, status, reviewNote: reviewNote.trim() || undefined });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Review Submission</CardTitle>
        <CardDescription>Approve, request revisions, or reject this document.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviewMutation.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {reviewMutation.error?.response?.data?.error?.message || 'Review failed.'}
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="reviewNote">Review Note (optional)</Label>
          <Textarea
            id="reviewNote"
            placeholder="Provide feedback or reason for your decision..."
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            disabled={reviewMutation.isPending}
            maxLength={2000}
            rows={3}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={() => handleReview(SUBMISSION_STATUSES.APPROVED)}
            disabled={reviewMutation.isPending}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={() => handleReview(SUBMISSION_STATUSES.REVISIONS_REQUIRED)}
            disabled={reviewMutation.isPending}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Request Revisions
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleReview(SUBMISSION_STATUSES.REJECTED)}
            disabled={reviewMutation.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
          {reviewMutation.isPending && <Loader2 className="h-5 w-5 animate-spin self-center" />}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * UnlockPanel — lets faculty unlock a locked submission.
 */
function UnlockPanel({ submissionId, currentStatus }) {
  const [reason, setReason] = useState('');
  const unlockMutation = useUnlockSubmission({
    onSuccess: () => toast.success('Submission unlocked.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Unlock failed.'),
  });

  if (currentStatus !== SUBMISSION_STATUSES.LOCKED) return null;

  const handleUnlock = () => {
    if (!reason.trim()) return;
    unlockMutation.mutate({ submissionId, reason: reason.trim() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" />
          Document Locked
        </CardTitle>
        <CardDescription>
          This submission is locked. You can unlock it to allow the student to re-upload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unlockMutation.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {unlockMutation.error?.response?.data?.error?.message || 'Unlock failed.'}
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="unlockReason">Reason for unlocking</Label>
          <Textarea
            id="unlockReason"
            placeholder="Explain why the student can re-upload..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={unlockMutation.isPending}
            maxLength={2000}
            rows={2}
          />
        </div>
        <Button onClick={handleUnlock} disabled={unlockMutation.isPending || !reason.trim()}>
          {unlockMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Unlock className="mr-2 h-4 w-4" />
          )}
          Unlock Submission
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * AnnotationsPanel — view existing annotations and add new ones (faculty).
 */
function AnnotationsPanel({ submission, isFaculty, userId }) {
  const [content, setContent] = useState('');
  const [page, setPage] = useState('1');
  const [lineStart, setLineStart] = useState('');
  const [lineEnd, setLineEnd] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [commentFilter, setCommentFilter] = useState('all');

  const addMutation = useAddAnnotation({
    onSuccess: () => toast.success('Annotation added.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to add annotation.'),
  });
  const removeMutation = useRemoveAnnotation({
    onSuccess: () => toast.success('Annotation removed.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to remove annotation.'),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    const normalizedLineStart = Number(lineStart);
    const normalizedLineEnd = Number(lineEnd);

    if (lineStart && lineEnd && normalizedLineEnd < normalizedLineStart) {
      toast.error('Line end must be greater than or equal to line start.');
      return;
    }

    addMutation.mutate(
      {
        submissionId: submission._id,
        content: content.trim(),
        page: Number(page) || 1,
        ...(lineStart ? { lineStart: normalizedLineStart } : {}),
        ...(lineEnd ? { lineEnd: normalizedLineEnd } : {}),
        ...(selectedText.trim() ? { selectedText: selectedText.trim() } : {}),
      },
      {
        onSuccess: () => {
          setContent('');
          setLineStart('');
          setLineEnd('');
          setSelectedText('');
        },
      },
    );
  };

  const handleRemove = (annotationId) => {
    removeMutation.mutate({ submissionId: submission._id, annotationId });
  };

  const annotations = submission.annotations || [];
  const openCommentsCount = annotations.filter((ann) => !ann?.resolved).length;
  const resolvedCommentsCount = annotations.filter((ann) => !!ann?.resolved).length;
  const filteredAnnotations = annotations.filter((ann) => {
    if (commentFilter === 'open') return !ann?.resolved;
    if (commentFilter === 'resolved') return !!ann?.resolved;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Annotations
          {annotations.length > 0 && <Badge variant="secondary">{annotations.length}</Badge>}
        </CardTitle>
        <CardDescription>Highlight &amp; comment feedback on the document.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-foreground">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>File Comments</span>
              <Badge variant="outline" className="font-medium">
                {annotations.length}
              </Badge>
            </div>
            <div className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/60 p-1">
              <Button
                type="button"
                size="sm"
                variant={commentFilter === 'all' ? 'secondary' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setCommentFilter('all')}
              >
                All ({annotations.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={commentFilter === 'open' ? 'secondary' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setCommentFilter('open')}
              >
                Open ({openCommentsCount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={commentFilter === 'resolved' ? 'secondary' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setCommentFilter('resolved')}
              >
                Resolved ({resolvedCommentsCount})
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Review comments embedded in this submission and filter them by status.
          </p>
        </div>

        {annotations.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            No file comments yet.
          </div>
        )}
        {annotations.length > 0 && filteredAnnotations.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            No comments in the selected filter.
          </div>
        )}
        {filteredAnnotations.map((ann) => (
          <div
            key={ann._id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/70 p-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Page {ann.page}</span>
                {(ann.lineStart || ann.lineEnd) && (
                  <>
                    <span>&middot;</span>
                    <span>
                      Line {ann.lineStart || ann.lineEnd}
                      {ann.lineEnd && ann.lineStart && ann.lineEnd !== ann.lineStart
                        ? `-${ann.lineEnd}`
                        : ''}
                    </span>
                  </>
                )}
                <span>&middot;</span>
                <span>{formatDate(ann.createdAt)}</span>
                <span>&middot;</span>
                <span className={ann.resolved ? 'text-success' : 'text-warning'}>
                  {ann.resolved ? 'Resolved' : 'Open'}
                </span>
              </div>
              {ann.selectedText && (
                <blockquote className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2 italic">
                  {ann.selectedText}
                </blockquote>
              )}
              <p className="text-sm leading-relaxed text-foreground">{ann.content}</p>
            </div>
            {/* Only annotation author or instructor can remove */}
            {(ann.userId === userId || ann.userId?._id === userId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(ann._id)}
                disabled={removeMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}

        {/* Add annotation form (faculty only) */}
        {isFaculty && (
          <form onSubmit={handleAdd} className="space-y-3 rounded-md border p-3">
            {addMutation.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {addMutation.error?.response?.data?.error?.message || 'Failed to add.'}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <div className="w-20 space-y-1">
                <Label htmlFor="annPage" className="text-xs">
                  Page
                </Label>
                <input
                  id="annPage"
                  type="number"
                  min={1}
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  disabled={addMutation.isPending}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="w-24 space-y-1">
                <Label htmlFor="annLineStart" className="text-xs">
                  Line Start
                </Label>
                <input
                  id="annLineStart"
                  type="number"
                  min={1}
                  value={lineStart}
                  onChange={(e) => setLineStart(e.target.value)}
                  disabled={addMutation.isPending}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="w-24 space-y-1">
                <Label htmlFor="annLineEnd" className="text-xs">
                  Line End
                </Label>
                <input
                  id="annLineEnd"
                  type="number"
                  min={1}
                  value={lineEnd}
                  onChange={(e) => setLineEnd(e.target.value)}
                  disabled={addMutation.isPending}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="annContent" className="text-xs">
                  Comment
                </Label>
                <Textarea
                  id="annContent"
                  placeholder="Add a comment or highlight note..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={addMutation.isPending}
                  maxLength={2000}
                  rows={2}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="annSelectedText" className="text-xs">
                Highlighted Text (optional)
              </Label>
              <Textarea
                id="annSelectedText"
                placeholder="Paste the exact highlighted text snippet here..."
                value={selectedText}
                onChange={(e) => setSelectedText(e.target.value)}
                disabled={addMutation.isPending}
                maxLength={2000}
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={addMutation.isPending || !content.trim()}>
                {addMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Add Annotation
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────── Main Page ────────── */

/**
 * SubmissionDetailPage — full view of a single submission.
 *
 * Shows file metadata, review controls (faculty), unlock controls,
 * and annotation panel.
 */
export default function SubmissionDetailPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isReadOnlyMode = searchParams.get('mode') === 'view';
  const sourceProjectId = searchParams.get('projectId') || '';

  const isFaculty = [ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST].includes(user?.role);

  const { data: submission, isLoading, error } = useSubmission(submissionId);

  const { data: viewUrl, isLoading: viewUrlLoading } = useViewUrl(submissionId, {
    enabled: !!submission,
  });

  /* ────── Loading ────── */
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  /* ────── Error ────── */
  if (error || !submission) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error?.message || 'Submission not found.'}</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  // Faculty should always have review capabilities, even when navigating from the read-only list
  const isArchived = submission.isArchived || false;
  const facultyCanReview = isFaculty && !isArchived;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back + header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Submission Detail</h1>
          {isFaculty && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/project/submissions/${submission._id}/review`)}
            >
              Open Review Workspace
            </Button>
          )}
          {isReadOnlyMode && sourceProjectId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/project/submissions?mode=view&projectId=${sourceProjectId}`)
              }
            >
              Back to Submissions List
            </Button>
          )}
        </div>

        {isArchived && (
          <Alert className="border-amber-500/50 bg-amber-500/5 text-amber-600">
            <Lock className="h-4 w-4" />
            <AlertDescription className="font-medium">
              This project is archived. This submission is in read-only mode.
            </AlertDescription>
          </Alert>
        )}

        {/* File info */}
        <FileInfoCard submission={submission} viewUrl={viewUrl} viewUrlLoading={viewUrlLoading} />
        {/* Faculty: plagiarism checker */}
        {facultyCanReview && (
          <PlagiarismChecker
            submissionId={submission._id}
            submissionTitle={`${CHAPTER_LABELS[submission.chapter - 1] || `Chapter ${submission.chapter}`} v${submission.version}`}
            onCheckComplete={() => {}}
            showMatchDetails={true}
            disabled={submission.status === SUBMISSION_STATUSES.LOCKED}
          />
        )}
        {/* Faculty: review controls */}
        {facultyCanReview && (
          <ReviewPanel submissionId={submission._id} currentStatus={submission.status} />
        )}

        {/* Faculty: unlock locked submissions */}
        {facultyCanReview && (
          <UnlockPanel submissionId={submission._id} currentStatus={submission.status} />
        )}

        {/* Annotations — faculty always has annotation capabilities */}
        <AnnotationsPanel submission={submission} isFaculty={facultyCanReview} userId={user?._id} />
      </div>
    </DashboardLayout>
  );
}
