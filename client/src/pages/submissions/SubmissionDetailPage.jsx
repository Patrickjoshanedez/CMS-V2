import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import { useAuthStore } from '@/stores/authStore';
import {
  useSubmission,
  useViewUrl,
  useReviewSubmission,
  useUnlockSubmission,
  useAddAnnotation,
  useRemoveAnnotation,
} from '@/hooks/useSubmissions';
import { ROLES, SUBMISSION_STATUSES } from '@cms/shared';
import {
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {CHAPTER_LABELS[submission.chapter - 1] || `Chapter ${submission.chapter}`}
          <Badge variant="outline">v{submission.version}</Badge>
        </CardTitle>
        <CardDescription>Uploaded {formatDate(submission.createdAt)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="File" value={submission.fileName} />
          <InfoRow label="Size" value={formatBytes(submission.fileSize)} />
          <InfoRow label="Type" value={submission.fileType} />
          <InfoRow label="Status">
            <SubmissionStatusBadge status={submission.status} />
          </InfoRow>
          {submission.isLate && (
            <InfoRow label="Late Submission">
              <Badge variant="warning">Late</Badge>
            </InfoRow>
          )}
          {submission.originalityScore !== null && submission.originalityScore !== undefined && (
            <InfoRow label="Originality" value={`${submission.originalityScore}%`} />
          )}
        </div>

        {submission.remarks && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Remarks</p>
            <p className="mt-1 text-sm">{submission.remarks}</p>
          </div>
        )}

        {submission.reviewNote && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Review Note</p>
            <p className="mt-1 text-sm">{submission.reviewNote}</p>
          </div>
        )}

        {/* View document link */}
        {viewUrl && (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href={viewUrl.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Document
            </a>
          </Button>
        )}
        {viewUrlLoading && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Generating view link…
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children || <p className="mt-0.5 text-sm">{value}</p>}
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
    addMutation.mutate(
      { submissionId: submission._id, content: content.trim(), page: Number(page) || 1 },
      { onSuccess: () => setContent('') },
    );
  };

  const handleRemove = (annotationId) => {
    removeMutation.mutate({ submissionId: submission._id, annotationId });
  };

  const annotations = submission.annotations || [];

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
        {/* Existing annotations */}
        {annotations.length === 0 && (
          <p className="text-sm text-muted-foreground">No annotations yet.</p>
        )}
        {annotations.map((ann) => (
          <div
            key={ann._id}
            className="flex items-start justify-between rounded-md border bg-muted/50 p-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Page {ann.page}</span>
                <span>&middot;</span>
                <span>{formatDate(ann.createdAt)}</span>
              </div>
              <p className="text-sm">{ann.content}</p>
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
  const user = useAuthStore((s) => s.user);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Submission Detail</h1>
        </div>

        {/* File info */}
        <FileInfoCard submission={submission} viewUrl={viewUrl} viewUrlLoading={viewUrlLoading} />

        {/* Faculty: review controls */}
        {isFaculty && (
          <ReviewPanel submissionId={submission._id} currentStatus={submission.status} />
        )}

        {/* Faculty: unlock locked submissions */}
        {isFaculty && (
          <UnlockPanel submissionId={submission._id} currentStatus={submission.status} />
        )}

        {/* Annotations */}
        <AnnotationsPanel submission={submission} isFaculty={isFaculty} userId={user?._id} />
      </div>
    </DashboardLayout>
  );
}
