import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import PageSkeleton from '@/components/ui/PageSkeleton';
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
  useChapterHistory,
  useReviewSubmission,
  useUnlockSubmission,
  useAddAnnotation,
  useRemoveAnnotation,
  useUpdateJustification,
  useScanSubmissionArchive,
} from '@/hooks/useSubmissions';
import { submissionService } from '@/services/submissionService';
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
  AlertCircle,
  Loader2,
  MessageSquare,
  Trash2,
  Lock,
  Unlock,
  User,
  Send,
  Eye,
  Download,
  Clock,
  Sparkles,
} from 'lucide-react';
import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

function formatFileType(fileType, fileName) {
  const lowerType = (fileType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();

  if (
    lowerType.includes('wordprocessingml') ||
    lowerType.includes('msword') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc')
  ) {
    return 'Word Document (.docx)';
  }
  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return 'PDF Manuscript (.pdf)';
  }
  if (lowerType.includes('sheet') || lowerType.includes('excel') || lowerName.endsWith('.xlsx')) {
    return 'Excel Spreadsheet (.xlsx)';
  }
  if (lowerType.includes('presentation') || lowerName.endsWith('.pptx')) {
    return 'Presentation (.pptx)';
  }
  return fileType || 'Document';
}

/* ────────── Sub-components ────────── */

/**
 * FileInfoCard — displays metadata about the uploaded file.
 */
function FileInfoCard({ submission, viewUrl, viewUrlLoading }) {
  const navigate = useNavigate();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const chapterLabel = CHAPTER_LABELS[submission.chapter - 1] || `Chapter ${submission.chapter}`;
  const documentUrl = viewUrl?.url || `/api/submissions/${submission._id}/file`;

  const scanArchiveMutation = useScanSubmissionArchive({
    onSuccess: (res) => {
      const score = res?.data?.originalityScore ?? 100;
      const match = res?.data?.overallScore ?? 0;
      toast.success(`Archive scan complete! Originality: ${score}% (${match}% match)`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Archive scan failed.');
    },
  });

  const isScanning =
    scanArchiveMutation.isPending ||
    submission.plagiarismResult?.status === PLAGIARISM_STATUSES.PROCESSING ||
    submission.plagiarismResult?.status === PLAGIARISM_STATUSES.QUEUED;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await submissionService.downloadFile(submission._id, submission.fileName);
      toast.success('Download started.');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-border/70 bg-card shadow-xs rounded-2xl">
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {chapterLabel}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="font-mono text-xs px-2 py-0.5 border-primary/30 text-primary bg-primary/5"
                  >
                    v{submission.version || 1}
                  </Badge>
                  {!submission.isLate ? (
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs px-2.5 py-0.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      On-Time Submission
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs px-2.5 py-0.5"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Late Submission
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Uploaded {formatDate(submission.createdAt)}</span>
                  {submission.deadlineAt && (
                    <>
                      <span>&middot;</span>
                      <span>Milestone Due: {formatDate(submission.deadlineAt)}</span>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              <SubmissionStatusBadge status={submission.status} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-5 sm:p-6">
          {/* Executive Metrics Ribbon */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Document File
              </p>
              <p
                className="text-sm font-semibold text-foreground truncate"
                title={submission.fileName}
              >
                {submission.fileName}
              </p>
              <p className="text-xs text-primary font-medium">
                {formatFileType(submission.fileType, submission.fileName)}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                File Size
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatBytes(submission.fileSize)}
              </p>
              <p className="text-xs text-muted-foreground">Original Manuscript</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Originality Score
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">
                  {submission.originalityScore !== null && submission.originalityScore !== undefined
                    ? `${submission.originalityScore}%`
                    : 'Pending'}
                </p>
                {submission.originalityScore !== null &&
                  submission.originalityScore !== undefined && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-sm',
                        submission.originalityScore >= 75
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                      )}
                    >
                      {submission.originalityScore >= 75 ? 'Compliant' : 'Review Needed'}
                    </span>
                  )}
              </div>
              <p className="text-xs text-muted-foreground">Target: &gt; 75% Original</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Milestone Status
              </p>
              <p className="text-sm font-semibold text-foreground">
                {!submission.isLate ? 'On-Time Delivery' : 'Delivered Past Deadline'}
              </p>
              <p className="text-xs text-muted-foreground">
                {!submission.isLate ? 'Exempt from justification' : 'Requires justification note'}
              </p>
            </div>
          </div>

          {/* Originality Progress Meter */}
          {submission.originalityScore !== null && submission.originalityScore !== undefined && (
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>BukSU Originality &amp; Similarity Verification</span>
                </div>
                <span className="text-muted-foreground font-mono">
                  {submission.originalityScore}% Originality ·{' '}
                  {Math.max(0, 100 - submission.originalityScore)}% Similarity Match
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    submission.originalityScore >= 75 ? 'bg-emerald-500' : 'bg-amber-500',
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, submission.originalityScore))}%` }}
                />
              </div>
            </div>
          )}

          {isScanning && (
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>
                Scanning manuscript directly against institutional capstone archive and vector
                embeddings...
              </span>
            </div>
          )}

          {submission.remarks && (
            <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {submission.isLate ? 'Late Justification Note' : 'Student Submission Remarks'}
              </p>
              <p className="text-sm text-foreground leading-relaxed">{submission.remarks}</p>
            </div>
          )}

          {submission.reviewNote && (
            <div className="space-y-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Committee Review Note</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{submission.reviewNote}</p>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="default"
              className="gap-2 shadow-xs"
              onClick={() => setViewerOpen(true)}
            >
              <Eye className="h-4 w-4" />
              View Document
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={downloading}
              onClick={handleDownload}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download Original
            </Button>
            {submission.teamResources?.googleDocUrl && (
              <Button asChild variant="secondary" className="gap-2">
                <a
                  href={submission.teamResources.googleDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="h-4 w-4 text-blue-500" />
                  Open Team Google Doc
                  <ExternalLink className="h-3 w-3 opacity-70 ml-0.5" />
                </a>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => scanArchiveMutation.mutate(submission._id)}
              disabled={isScanning}
              className="gap-2"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning Archive...
                </>
              ) : (
                <>
                  <ClipboardCheck className="mr-2 h-4 w-4 text-primary" />
                  Scan Against Archive
                </>
              )}
            </Button>
            {(submission.plagiarismResult?.status === PLAGIARISM_STATUSES.COMPLETED ||
              submission.plagiarismStatus === 'completed' ||
              submission.originalityScore !== undefined ||
              Array.isArray(submission.plagiarismResult?.matchedSources)) && (
              <Button
                variant="outline"
                onClick={() => navigate(`/project/submissions/${submission._id}/plagiarism-report`)}
                className="gap-2"
              >
                <BarChart2 className="mr-2 h-4 w-4 text-primary" />
                View Plagiarism Report
              </Button>
            )}
            {viewUrlLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                <Loader2 className="h-3 w-3 animate-spin" /> Generating view link...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <SophisticatedDocumentViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        submission={submission}
        fileUrl={documentUrl}
      />
    </>
  );
}

/**
 * JustificationCard — manages late justification note editing and on-time locking (FR-4.2).
 */
function JustificationCard({ submission, isStudent }) {
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(submission.justification || submission.remarks || '');
  const updateMutation = useUpdateJustification({
    onSuccess: () => {
      toast.success('Justification updated successfully.');
      setIsEditing(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update justification.');
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!note.trim()) {
      toast.error('Please provide a justification note.');
      return;
    }
    updateMutation.mutate({
      submissionId: submission._id,
      justification: note.trim(),
    });
  };

  if (!submission.isLate) {
    return null;
  }

  return (
    <Card className="border-amber-500/30 bg-amber-50/10 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base font-semibold">Late Justification Note</CardTitle>
          </div>
          <Badge variant="warning" className="text-xs">
            Late Submission
          </Badge>
        </div>
        <CardDescription className="text-xs">
          This submission was delivered past the milestone deadline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain the reason for delay..."
              maxLength={1000}
              rows={3}
              disabled={updateMutation.isPending}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending || !note.trim()}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Justification'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-relaxed text-foreground">
              {submission.justification || submission.remarks || 'No justification provided yet.'}
            </p>
            {isStudent && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit Justification
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
        <CardDescription>Approve or request revisions on this document.</CardDescription>
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
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                <User className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {ann.authorName ||
                    (ann.userId?.firstName
                      ? `${ann.userId.firstName} ${ann.userId.lastName || ''}`.trim()
                      : 'Faculty Panelist')}
                </span>
                <span>&middot;</span>
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

  const projectId = submission?.projectId?._id || submission?.projectId;
  const chapterNum = submission?.chapter;
  const { data: chapterHistory = [] } = useChapterHistory(projectId, chapterNum, {
    enabled: Boolean(projectId && chapterNum),
  });

  const sortedHistory = [...(Array.isArray(chapterHistory) ? chapterHistory : [])].sort(
    (a, b) => (b.version || 1) - (a.version || 1),
  );
  const latestInHistory = sortedHistory[0];
  const isViewingOlderVersion = Boolean(
    latestInHistory &&
    submission?._id &&
    String(latestInHistory._id) !== String(submission._id) &&
    (latestInHistory.version || 1) > (submission.version || 1),
  );

  /* ────── Loading ────── */
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
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
        {/* Back + actions contextual header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-4 w-px bg-border/60" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {submission.chapter
                  ? `Chapter ${submission.chapter} Manuscript`
                  : submission.type || 'Submission'}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 h-4">
                v{submission.version || 1}
              </Badge>
              {!submission.isLate ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[10px] px-1.5 py-0 h-4"
                >
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                  On-Time
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-[10px] px-1.5 py-0 h-4"
                >
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                  Late
                </Badge>
              )}
              {sortedHistory.length > 1 && (
                <div className="flex items-center gap-1 ml-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium">Revisions:</span>
                  {sortedHistory.map((h) => {
                    const isCurrent = String(h._id) === String(submission._id);
                    return (
                      <Button
                        key={h._id}
                        variant={isCurrent ? 'default' : 'outline'}
                        size="sm"
                        className={`h-5 px-1.5 text-[10px] font-mono transition-colors ${
                          isCurrent ? 'font-bold' : 'hover:bg-muted text-muted-foreground'
                        }`}
                        onClick={() => {
                          if (!isCurrent) {
                            navigate(
                              `/submissions/${h._id}${
                                isReadOnlyMode && sourceProjectId
                                  ? `?mode=view&projectId=${sourceProjectId}`
                                  : ''
                              }`,
                            );
                          }
                        }}
                      >
                        v{h.version || 1}
                        {h.status === SUBMISSION_STATUSES.ACCEPTED && (
                          <span className="ml-0.5 text-[9px] text-emerald-500 font-bold">✓</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFaculty && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/project/submissions/${submission._id}/review`)}
                className="text-xs"
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
                className="text-xs"
              >
                Back to Submissions List
              </Button>
            )}
          </div>
        </div>

        {/* Outdated Version Alert Banner */}
        {isViewingOlderVersion && (
          <Alert className="border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/20 text-blue-950 dark:text-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Viewing Earlier Revision (v{submission.version || 1})
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A newer revision (
                  <span className="font-semibold text-foreground">v{latestInHistory.version}</span>)
                  is available with status:{' '}
                  <span className="font-medium text-foreground uppercase text-[11px]">
                    {latestInHistory.status?.replace(/_/g, ' ')}
                  </span>
                  .
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 text-xs gap-1.5"
              onClick={() =>
                navigate(
                  `/submissions/${latestInHistory._id}${
                    isReadOnlyMode && sourceProjectId
                      ? `?mode=view&projectId=${sourceProjectId}`
                      : ''
                  }`,
                )
              }
            >
              <span>View Latest Revision (v{latestInHistory.version})</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Alert>
        )}

        {isArchived && (
          <Alert className="border-amber-500/50 bg-amber-500/5 text-amber-600">
            <Lock className="h-4 w-4" />
            <AlertDescription className="font-medium">
              This project is archived. This submission is in read-only mode.
            </AlertDescription>
          </Alert>
        )}

        {/* Flagged Incomplete Proposal Warning (FR-4.3) */}
        {submission.isFlagged && (
          <Alert
            variant="destructive"
            className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200"
          >
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="space-y-1">
              <p className="font-semibold text-sm">
                Flagged for Panel Review: Incomplete Institutional Metadata
              </p>
              {submission.flagReasons && submission.flagReasons.length > 0 && (
                <ul className="list-disc list-inside text-xs space-y-0.5 mt-1">
                  {submission.flagReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* File info */}
        <FileInfoCard submission={submission} viewUrl={viewUrl} viewUrlLoading={viewUrlLoading} />

        {/* Late Justification Card (FR-4.2) */}
        <JustificationCard submission={submission} isStudent={!isFaculty} />
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

        {/* Annotations — faculty always has annotation capabilities */}
        <AnnotationsPanel submission={submission} isFaculty={facultyCanReview} userId={user?._id} />
      </div>
    </DashboardLayout>
  );
}
