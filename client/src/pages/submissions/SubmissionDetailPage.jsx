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
  useProjectSubmissions,
  useReviewSubmission,
  useUnlockSubmission,
  useAddAnnotation,
  useRemoveAnnotation,
  useUpdateJustification,
  useScanSubmissionArchive,
  useUploadChapter,
  useCompileProposal,
  useUploadSystemDesign,
  useUploadTestResults,
  useUploadFinalAcademic,
  useUploadFinalJournal,
} from '@/hooks/useSubmissions';
import { submissionService } from '@/services/submissionService';
import DefenseScheduleBadge from '@/components/defense/DefenseScheduleBadge';
import { ROLES, SUBMISSION_STATUSES, PLAGIARISM_STATUSES } from '@cms/shared';
import {
  BarChart2,
  ClipboardCheck,
  FileText,
  FileUp,
  UploadCloud,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  X,
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
  ShieldCheck,
} from 'lucide-react';
import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';
import { Progress } from '@/components/ui/Progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSubmissionDocumentTitle, CHAPTER_LABELS } from '@/utils/submissionUtils';

/* ────────── Helpers ────────── */

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
function FileInfoCard({ submission, viewUrl, viewUrlLoading, canRevise, onRevise }) {
  const navigate = useNavigate();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const chapterLabel = getSubmissionDocumentTitle(submission);
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
            {canRevise && (
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
                onClick={onRevise}
              >
                <FileUp className="h-4 w-4" />
                Revise Submission
              </Button>
            )}
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
 * AdviserDefenseReadinessCard — specialized review and status card for Chapter 1-3
 * Proposal Manuscript submissions.
 *
 * Replaces generic review for proposal manuscripts with explicit institutional
 * defense readiness signaling:
 * - Adviser checks and endorses submission to signal "Ready for Defense"
 * - Automatically updates defense status to pending_scheduling and notifies instructors
 * - Students see clear institutional status of their defense endorsement
 */
function AdviserDefenseReadinessCard({
  submission,
  canEndorse,
  isStudent,
  isFaculty,
  isInstructor,
}) {
  const [reviewNote, setReviewNote] = useState('');
  const reviewMutation = useReviewSubmission({
    onSuccess: (data, variables) => {
      if (variables?.status === SUBMISSION_STATUSES.APPROVED) {
        toast.success('Manuscript endorsed! Team signaled as Ready for Defense.');
      } else {
        toast.success('Revision request submitted to the team.');
      }
    },
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Review action failed.'),
  });

  const status = submission?.status;
  const isPending =
    status === SUBMISSION_STATUSES.PENDING || status === SUBMISSION_STATUSES.UNDER_REVIEW;
  const isApproved =
    !isPending &&
    (status === SUBMISSION_STATUSES.APPROVED ||
      status === SUBMISSION_STATUSES.LOCKED ||
      Boolean(submission?.isDefenseReady));
  const isRevisionsRequired = !isPending && status === SUBMISSION_STATUSES.REVISIONS_REQUIRED;

  // 1. Approved state (Adviser or Instructor has endorsed the team)
  if (isApproved) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  Adviser Endorsement Confirmed: Ready for Defense
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[11px]"
                  >
                    Defense Ready
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  The project adviser has checked and endorsed this Chapter 1–3 Manuscript.
                </CardDescription>
              </div>
            </div>
            {submission.defenseSchedule && (
              <DefenseScheduleBadge
                defenseSchedule={submission.defenseSchedule}
                className="text-xs"
                showTime
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
            {isStudent
              ? 'Your team is officially signaled as Ready for Defense! Course Instructors have been notified and defense scheduling is now underway.'
              : 'This team has been signaled as Ready for Defense. Course Instructors have received the endorsement notice for defense scheduling.'}
          </p>
          {submission.reviewNote && (
            <div className="rounded-md border border-emerald-500/20 bg-background/80 p-3 text-xs text-foreground/80 space-y-1">
              <span className="font-semibold text-foreground">Adviser Endorsement Remarks:</span>
              <p className="italic text-muted-foreground">{submission.reviewNote}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // 2. Revisions Required state
  if (isRevisionsRequired) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  Manuscript Revisions Requested
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[11px]"
                  >
                    Needs Revision
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  The adviser has reviewed this compilation and requested revisions before defense
                  endorsement.
                </CardDescription>
              </div>
            </div>
            {submission.defenseSchedule && (
              <DefenseScheduleBadge
                defenseSchedule={submission.defenseSchedule}
                className="text-xs"
                showTime
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
            {isStudent
              ? 'Please address the adviser feedback below and upload a revised manuscript using the Revise button above to request endorsement again.'
              : 'Revisions have been requested from the team. Defense scheduling remains locked until a revised manuscript is endorsed.'}
          </p>
          {submission.reviewNote && (
            <div className="rounded-md border border-amber-500/20 bg-background/80 p-3 text-xs text-foreground/80 space-y-1">
              <span className="font-semibold text-foreground">Adviser Feedback:</span>
              <p className="italic text-muted-foreground">{submission.reviewNote}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // 3. Pending/Under Review — Adviser / Instructor Authority View
  if (canEndorse && isPending) {
    return (
      <Card className="border-primary/30 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base text-foreground">
                  {isInstructor
                    ? 'Instructor Defense Readiness Check'
                    : 'Adviser Defense Readiness Check'}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary bg-primary/5 text-[11px]"
                >
                  {isInstructor ? 'Instructor Authority' : 'Adviser Authority'}
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Evaluate this Chapter 1–3 Manuscript compilation. Approving and endorsing this
                manuscript signals to Course Instructors that the team is prepared and ready for
                Capstone 2 Defense Scheduling.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {reviewMutation.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {reviewMutation.error?.response?.data?.error?.message || 'Review failed.'}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="adviserReviewNote" className="text-xs font-semibold text-foreground">
              Endorsement Remarks / Feedback (optional)
            </Label>
            <Textarea
              id="adviserReviewNote"
              placeholder="Provide comments, observations, or instructions for the proponents and committee..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              disabled={reviewMutation.isPending}
              maxLength={2000}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() =>
                reviewMutation.mutate({
                  submissionId: submission._id,
                  status: SUBMISSION_STATUSES.APPROVED,
                  reviewNote: reviewNote.trim() || undefined,
                })
              }
              disabled={reviewMutation.isPending}
              className="gap-2 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {reviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Check &amp; Endorse: Ready for Defense
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                reviewMutation.mutate({
                  submissionId: submission._id,
                  status: SUBMISSION_STATUSES.REVISIONS_REQUIRED,
                  reviewNote: reviewNote.trim() || undefined,
                })
              }
              disabled={reviewMutation.isPending}
              className="gap-2 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
            >
              <AlertTriangle className="h-4 w-4" />
              Request Manuscript Revisions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 4. Pending/Under Review — Student View
  if (isStudent && isPending) {
    return (
      <Card className="border-primary/20 bg-primary/5 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">
                Awaiting Adviser Defense Endorsement
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Your Chapter 1–3 Manuscript compilation has been submitted for defense readiness
                evaluation.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Once your adviser or course instructor checks and endorses this submission, your team will
          be officially signaled as Ready for Defense, and Course Instructors will schedule your
          defense hearing.
        </CardContent>
      </Card>
    );
  }

  // 5. Pending/Under Review — Committee Member / Panelist / Non-Endorsing Faculty View (Read-Only Preview Mode)
  return (
    <Card className="border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base text-foreground">
                  Defense Hearing Pending — Committee Preview Mode
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-[11px]"
                >
                  Preview Mode
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                This Chapter 1–3 Manuscript is pending endorsement by the assigned Capstone Adviser
                or Course Instructor.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
        <p>
          Only the assigned Adviser and Course Instructor can endorse this manuscript for defense
          scheduling. Committee panelists and members may inspect the manuscript below in
          preparation for the oral defense hearing.
        </p>
        <p className="text-xs text-foreground/80 font-medium">
          Formal panel evaluations and rubric scoring will activate once the Course Instructor
          confirms the defense hearing schedule.
        </p>
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

/**
 * ReviseSubmissionModal — allows students to upload a replacement document
 * (e.g. wrong file scenario or revision request) across all submission types.
 */
function ReviseSubmissionModal({ open, onOpenChange, submission, onReviseSuccess }) {
  const [file, setFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localError, setLocalError] = useState(null);

  const uploadChapterMutation = useUploadChapter();
  const compileProposalMutation = useCompileProposal();
  const uploadSystemDesignMutation = useUploadSystemDesign();
  const uploadTestResultsMutation = useUploadTestResults();
  const uploadFinalAcademicMutation = useUploadFinalAcademic();
  const uploadFinalJournalMutation = useUploadFinalJournal();

  const isUploading =
    uploadChapterMutation.isPending ||
    compileProposalMutation.isPending ||
    uploadSystemDesignMutation.isPending ||
    uploadTestResultsMutation.isPending ||
    uploadFinalAcademicMutation.isPending ||
    uploadFinalJournalMutation.isPending;

  const title = getSubmissionDocumentTitle(submission);
  const nextVersion = (submission?.version || 1) + 1;
  const rawProjectId =
    typeof submission?.projectId === 'object' ? submission.projectId?._id : submission?.projectId;

  const handleFileChange = (selectedFile) => {
    setLocalError(null);
    if (!selectedFile) return;

    const allowedExtensions = ['.pdf', '.docx', '.doc'];
    const fileName = selectedFile.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));
    if (!isAllowed) {
      setLocalError('Invalid file format. Please upload a Word Document (.docx) or PDF (.pdf).');
      return;
    }

    const MAX_SIZE = 25 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setLocalError('File size exceeds the 25 MB institutional limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setLocalError('Please select a replacement manuscript file to upload.');
      return;
    }

    if (!rawProjectId) {
      toast.error('Project ID is missing.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (remarks.trim()) {
      formData.append('remarks', remarks.trim());
    }

    const onProgress = (evt) => {
      if (evt.total) {
        setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    };

    try {
      let result;
      if (submission.type === 'proposal') {
        result = await compileProposalMutation.mutateAsync({
          projectId: rawProjectId,
          formData,
          onUploadProgress: onProgress,
        });
      } else if (submission.type === 'system_design') {
        result = await uploadSystemDesignMutation.mutateAsync({
          projectId: rawProjectId,
          formData,
          onUploadProgress: onProgress,
        });
      } else if (submission.type === 'test_results') {
        result = await uploadTestResultsMutation.mutateAsync({
          projectId: rawProjectId,
          formData,
          onUploadProgress: onProgress,
        });
      } else if (submission.type === 'final_academic') {
        result = await uploadFinalAcademicMutation.mutateAsync({
          projectId: rawProjectId,
          formData,
          onUploadProgress: onProgress,
        });
      } else if (submission.type === 'final_journal') {
        result = await uploadFinalJournalMutation.mutateAsync({
          projectId: rawProjectId,
          formData,
          onUploadProgress: onProgress,
        });
      } else {
        // default chapter
        formData.append('chapter', submission.chapter || 1);
        result = await uploadChapterMutation.mutateAsync({
          projectId: rawProjectId,
          formData,
          onUploadProgress: onProgress,
        });
      }

      toast.success(`Revision submitted successfully! Version v${nextVersion} uploaded.`);
      setFile(null);
      setRemarks('');
      setUploadProgress(0);
      onOpenChange(false);
      onReviseSuccess?.(result);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to upload revised manuscript.';
      setLocalError(msg);
      toast.error(msg);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-full items-center justify-center overflow-y-auto bg-black/75 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revise-submission-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) {
          onOpenChange(false);
        }
      }}
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-border/70 bg-card p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <h2 id="revise-submission-title" className="text-lg font-bold text-foreground">
                Revise Submission
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload a replacement manuscript for{' '}
                <span className="font-semibold text-foreground">{title}</span> (creates v
                {nextVersion})
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Informational Guidance */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Institutional Revision Protocol
          </p>
          <p className="leading-relaxed">
            Uploading a replacement document creates revision{' '}
            <span className="font-semibold text-foreground">v{nextVersion}</span> while preserving
            previous versions. Use this if you uploaded an incorrect file or revised your work
            before committee sign-off.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Dropzone */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Replacement File (.docx, .pdf) <span className="text-destructive">*</span>
            </label>
            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border/70 hover:border-primary/50 hover:bg-muted/30 bg-muted/10',
                )}
              >
                <input
                  type="file"
                  accept=".docx,.doc,.pdf"
                  disabled={isUploading}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  <span className="text-primary font-semibold">Click to upload</span> or drag and
                  drop
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Word (.docx) or PDF manuscript up to 25 MB
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setFile(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Remarks Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Revision Remarks & Notes
            </label>
            <Textarea
              placeholder="e.g. Corrected file upload (replaced accidental draft), updated methodology section..."
              rows={3}
              value={remarks}
              disabled={isUploading}
              onChange={(e) => setRemarks(e.target.value)}
              className="text-xs resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Briefly describe why this revision is submitted so your adviser and panel can track
              changes.
            </p>
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between text-xs text-primary font-medium">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading revised manuscript...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}

          {/* Error display */}
          {localError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{localError}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={!file || isUploading}
              className="gap-2 shadow-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  Submit Revision (v{nextVersion})
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
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

  const [reviseModalOpen, setReviseModalOpen] = useState(false);
  const isFaculty = [ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST, ROLES.FACULTY].includes(
    user?.role,
  );
  const isStudent = user?.role === 'student' || user?.role === ROLES.STUDENT;

  const { data: submission, isLoading, error } = useSubmission(submissionId);

  const { data: viewUrl, isLoading: viewUrlLoading } = useViewUrl(submissionId, {
    enabled: !!submission,
  });

  const projectId = submission?.projectId?._id || submission?.projectId;
  const chapterNum = submission?.chapter;
  const { data: chapterHistory = [] } = useChapterHistory(projectId, chapterNum, {
    enabled: Boolean(projectId && chapterNum),
  });
  const { data: projectSubmissionsData } = useProjectSubmissions(
    projectId,
    { type: submission?.type },
    { enabled: Boolean(projectId && !chapterNum && submission?.type) },
  );

  const rawHistoryList = chapterNum
    ? chapterHistory
    : (projectSubmissionsData?.submissions || []).filter(
        (s) => (s.type || '') === (submission?.type || ''),
      );

  const sortedHistory = [...(Array.isArray(rawHistoryList) ? rawHistoryList : [])].sort(
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
  const isLocked = submission.status === SUBMISSION_STATUSES.LOCKED;
  const canRevise = isStudent && !isLocked && !isArchived && !isReadOnlyMode;
  const isProposal = submission?.type === 'proposal';
  const isAssignedAdviser = Boolean(
    submission?.isAssignedAdviser ||
    (user?._id &&
      (String(submission?.adviserId) === String(user._id) ||
        String(submission?.projectId?.adviserId) === String(user._id))),
  );
  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const canEndorse = !isArchived && (isAssignedAdviser || isInstructor);

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
                {getSubmissionDocumentTitle(submission)}
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
            {submission.defenseSchedule && (
              <DefenseScheduleBadge
                defenseSchedule={submission.defenseSchedule}
                className="text-xs"
                showTime
              />
            )}
            {canRevise && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setReviseModalOpen(true)}
                className="text-xs gap-1.5 shadow-xs"
              >
                <FileUp className="h-3.5 w-3.5" />
                Revise Submission
              </Button>
            )}
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

        {/* Proposal Manuscript: Adviser Defense Readiness Check & Institutional Endorsement */}
        {isProposal && (
          <AdviserDefenseReadinessCard
            submission={submission}
            canEndorse={canEndorse}
            isStudent={isStudent}
            isFaculty={isFaculty}
            isInstructor={isInstructor}
          />
        )}

        {/* File info */}
        <FileInfoCard
          submission={submission}
          viewUrl={viewUrl}
          viewUrlLoading={viewUrlLoading}
          canRevise={canRevise}
          onRevise={() => setReviseModalOpen(true)}
        />

        {/* Late Justification Card (FR-4.2) */}
        <JustificationCard submission={submission} isStudent={!isFaculty} />
        {/* Faculty: plagiarism checker */}
        {facultyCanReview && (
          <PlagiarismChecker
            submissionId={submission._id}
            submissionTitle={`${getSubmissionDocumentTitle(submission)} v${submission.version || 1}`}
            onCheckComplete={() => {}}
            showMatchDetails={true}
            disabled={submission.status === SUBMISSION_STATUSES.LOCKED}
          />
        )}
        {/* Faculty: review controls (standard chapters only; proposals use AdviserDefenseReadinessCard) */}
        {facultyCanReview && !isProposal && canEndorse && (
          <ReviewPanel submissionId={submission._id} currentStatus={submission.status} />
        )}
        {facultyCanReview && !isProposal && !canEndorse && (
          <Card className="border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base text-foreground">
                      Chapter Review — Committee Preview Mode
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-[11px]"
                    >
                      Preview Mode
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Formal chapter approvals and revision requests are conducted exclusively by the
                    assigned Capstone Adviser.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              As a committee panelist or member, you can inspect the manuscript and add inline
              annotations in the Annotations panel below.
            </CardContent>
          </Card>
        )}

        {/* Annotations — faculty always has annotation capabilities */}
        <AnnotationsPanel submission={submission} isFaculty={facultyCanReview} userId={user?._id} />

        {/* Revise Submission Modal (Students) */}
        <ReviseSubmissionModal
          open={reviseModalOpen}
          onOpenChange={setReviseModalOpen}
          submission={submission}
          onReviseSuccess={(res) => {
            const newSubId = res?.submission?._id || res?.data?.submission?._id;
            if (newSubId && String(newSubId) !== String(submission._id)) {
              navigate(
                `/submissions/${newSubId}${
                  isReadOnlyMode && sourceProjectId ? `?mode=view&projectId=${sourceProjectId}` : ''
                }`,
              );
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
}
