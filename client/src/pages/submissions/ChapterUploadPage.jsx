import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useMyProject } from '@/hooks/useProjects';
import { useProjectSubmissions, useUploadChapter } from '@/hooks/useSubmissions';
import { SUBMISSION_STATUSES } from '@cms/shared';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  ArrowLeft,
  Lock,
  ShieldCheck,
  Clock,
  Paperclip,
  Info,
} from 'lucide-react';

/** Maximum file size in MB (must match server config) */
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Accepted MIME types (must match server fileValidation middleware) */
const ACCEPTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

const ACCEPT_STRING = Object.values(ACCEPTED_FILE_TYPES).join(',');
const CHAPTER_LABELS = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];
const CHAPTER_DESCRIPTIONS = {
  1: 'The Problem and Its Background',
  2: 'Review of Related Literature & Technical Framework',
  3: 'Research Methodology & System Architecture',
  4: 'Results, Evaluation and Discussion',
  5: 'Summary, Conclusions & Institutional Recommendations',
};

const APPROVED_CHAPTER_STATUSES = [
  SUBMISSION_STATUSES.LOCKED,
  SUBMISSION_STATUSES.APPROVED,
  SUBMISSION_STATUSES.ACCEPTED,
];

function toChapterLabel(chapter) {
  if (!chapter || chapter < 1 || chapter > CHAPTER_LABELS.length) return `Chapter ${chapter}`;
  return CHAPTER_LABELS[chapter - 1];
}

/**
 * Format bytes into a human-readable string.
 */
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDeadline(dateStr) {
  if (!dateStr) return 'No deadline set';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'No deadline set';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * ChapterUploadPage — Unified, deslopified chapter submission workspace.
 * Follows frontend-mythos responsive 12-column layout.
 */
export default function ChapterUploadPage() {
  const [now] = useState(() => Date.now());
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedChapter = searchParams.get('chapter');
  const isLocked = searchParams.get('locked') === 'true' || searchParams.get('mode') === 'revise';

  // Local state
  const [chapter, setChapter] = useState(preselectedChapter || '');
  const [file, setFile] = useState(null);
  const [justificationLetter, setJustificationLetter] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clientError, setClientError] = useState('');

  // Server data
  const { data: project, isLoading: projectLoading, error: projectError } = useMyProject();
  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    error: submissionsError,
  } = useProjectSubmissions(project?._id, {}, { enabled: Boolean(project?._id) });

  const uploadMutation = useUploadChapter({
    onSuccess: () => {
      toast.success('Chapter manuscript uploaded successfully! Similarity check queued.');
      navigate('/project/submissions');
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message || err?.message || 'Failed to upload chapter.',
      );
    },
  });

  /**
   * Validate the selected file on the client side before sending.
   */
  const validateFile = useCallback((selectedFile, label = 'File') => {
    if (!selectedFile) return `Please select a ${label.toLowerCase()}.`;

    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(selectedFile.type)) {
      return `Invalid ${label.toLowerCase()} type. Only PDF, DOCX, or TXT are allowed.`;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      return `${label} exceeds maximum size limit (${MAX_FILE_SIZE_MB} MB).`;
    }

    return '';
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setClientError(selectedFile ? validateFile(selectedFile, 'Manuscript file') : '');
    setUploadProgress(0);
  };

  const handleLetterChange = (e) => {
    const selectedLetter = e.target.files?.[0] || null;
    setJustificationLetter(selectedLetter);
    setClientError(selectedLetter ? validateFile(selectedLetter, 'Justification letter') : '');
  };

  const handleRemoveFile = () => {
    setFile(null);
    setClientError('');
    setUploadProgress(0);
  };

  const handleRemoveLetter = () => {
    setJustificationLetter(null);
    setClientError('');
  };

  const latestChapterSubmissions = (() => {
    const map = new Map();
    const list = submissionsData?.submissions || [];

    for (const item of list) {
      if (item?.type !== 'chapter' || !item?.chapter) continue;
      const existing = map.get(item.chapter);
      const itemVersion = Number(item.version || 1);
      const existingVersion = Number(existing?.version || 0);
      const itemTs = new Date(item.updatedAt || item.createdAt || 0).getTime();
      const existingTs = existing
        ? new Date(existing.updatedAt || existing.createdAt || 0).getTime()
        : 0;
      if (
        !existing ||
        itemVersion > existingVersion ||
        (itemVersion === existingVersion && itemTs > existingTs)
      ) {
        map.set(item.chapter, item);
      }
    }

    return map;
  })();

  const selectedChapterNumber = Number(chapter);
  const selectedLatestSubmission = latestChapterSubmissions.get(selectedChapterNumber);
  const selectedNextRound = selectedLatestSubmission
    ? (selectedLatestSubmission.revisionRound || 0) + 1
    : 1;
  const nextVersion = selectedLatestSubmission ? (selectedLatestSubmission.version || 1) + 1 : 1;

  const nextAllowedChapter = (() => {
    for (let candidate = 2; candidate <= 5; candidate += 1) {
      const previous = latestChapterSubmissions.get(candidate - 1);
      if (!APPROVED_CHAPTER_STATUSES.includes(previous?.status)) return candidate - 1;
    }
    return 5;
  })();

  const previousChapter =
    selectedChapterNumber > 1 ? latestChapterSubmissions.get(selectedChapterNumber - 1) : null;
  const isPreviousChapterUnapproved =
    selectedChapterNumber > 1 && !APPROVED_CHAPTER_STATUSES.includes(previousChapter?.status);

  const canSubmitSelectedChapter = (() => {
    if (!selectedChapterNumber) return false;
    if (selectedChapterNumber > 1) {
      if (!APPROVED_CHAPTER_STATUSES.includes(previousChapter?.status)) return false;
    }
    if (!selectedLatestSubmission) return true;
    return (
      selectedLatestSubmission.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED ||
      selectedLatestSubmission.status === SUBMISSION_STATUSES.PENDING
    );
  })();

  const selectedDeadlineField =
    selectedChapterNumber >= 1 && selectedChapterNumber <= 5
      ? `chapter${selectedChapterNumber}`
      : null;
  const selectedDeadline = selectedDeadlineField
    ? project?.deadlines?.[selectedDeadlineField]
    : null;
  const isLateByDeadline = selectedDeadline ? now > new Date(selectedDeadline).getTime() : false;
  const requiresLateJustification = Boolean(selectedChapterNumber) && isLateByDeadline;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError('');

    if (!chapter) {
      setClientError('Please select a chapter deliverable.');
      return;
    }
    if (!canSubmitSelectedChapter) {
      setClientError(
        `Chapter ${selectedChapterNumber} submission is blocked by sequential progression prerequisites.`,
      );
      return;
    }
    if (!file) {
      setClientError('Please select a chapter manuscript file to upload.');
      return;
    }
    const fileErr = validateFile(file, 'Manuscript file');
    if (fileErr) {
      setClientError(fileErr);
      return;
    }

    if (requiresLateJustification) {
      if (!remarks.trim()) {
        setClientError(
          'Late submission detected. A written justification statement is strictly required.',
        );
        return;
      }
      if (!justificationLetter) {
        setClientError(
          'Late submission detected. An official signed justification letter (PDF/DOCX) must be uploaded.',
        );
        return;
      }
      const letterErr = validateFile(justificationLetter, 'Justification letter');
      if (letterErr) {
        setClientError(letterErr);
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chapter', chapter);
    if (remarks.trim()) {
      formData.append('remarks', remarks.trim());
    }
    if (requiresLateJustification && justificationLetter) {
      formData.append('justificationLetter', justificationLetter);
    }

    uploadMutation.mutate({
      projectId: project._id,
      formData,
      onUploadProgress: (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        setUploadProgress(pct);
      },
    });
  };

  const isSubmitting = uploadMutation.isPending;
  const serverError =
    uploadMutation.error?.response?.data?.error?.message || uploadMutation.error?.message;

  /* ────── Loading / Error States ────── */
  if (projectLoading || submissionsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (projectError || !project) {
    const errorCode = projectError?.response?.data?.error?.code;
    const isNoTeam = errorCode === 'NO_TEAM';
    const isNoProject = errorCode === 'PROJECT_NOT_FOUND';

    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl py-16 text-center">
          <div className="rounded-xl border border-dashed border-border bg-card p-10 shadow-xs">
            {isNoTeam ? (
              <>
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
                <h3 className="text-lg font-bold text-foreground">No Team Yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  You must join or create a capstone team before uploading chapter documents.
                </p>
                <Button className="mt-5" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </>
            ) : isNoProject ? (
              <>
                <FileText className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Create Proposal First</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your team does not have an approved proposal yet. Head to My Capstone to pitch
                  your title.
                </p>
                <Button className="mt-5" onClick={() => navigate('/project')}>
                  Proceed to My Capstone
                </Button>
              </>
            ) : (
              <>
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />
                <h3 className="text-lg font-bold text-foreground">Unable to Load Project</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {projectError?.message || 'Failed to retrieve capstone project record.'}
                </p>
                <Button className="mt-5" variant="outline" onClick={() => navigate('/project')}>
                  Back to Project
                </Button>
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (submissionsError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl py-10">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {submissionsError?.response?.data?.error?.message ||
                'Failed to load chapter workflow progression status.'}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  /* ────── Main Workspace ────── */
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => navigate('/project/submissions')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Submissions
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Upload Chapter Manuscript
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Submit deliverables for review on&nbsp;
              <span className="font-semibold text-foreground">{project.title}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono uppercase bg-muted/40">
              Capstone Phase {project?.capstonePhase || 1}
            </Badge>
            {selectedChapterNumber ? (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                {toChapterLabel(selectedChapterNumber)}
              </Badge>
            ) : null}
          </div>
        </div>

        {/* 12-Column Unified Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Submission Form (8 Columns) */}
          <div className="lg:col-span-8 space-y-5">
            <Card className="border-border/80 bg-card shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold text-foreground">
                  Deliverable Manuscript Submission
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Accepted file formats: PDF, DOCX, or TXT &mdash; Maximum allowed file size:{' '}
                  {MAX_FILE_SIZE_MB} MB.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Target Chapter Selection */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="chapter" className="text-xs font-semibold text-foreground">
                        Target Chapter <span className="text-destructive">*</span>
                      </Label>
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <Lock className="h-3 w-3" />
                          Locked to Chapter {chapter} (Revision)
                        </span>
                      )}
                    </div>

                    {isLocked ? (
                      <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20"
                          >
                            {toChapterLabel(selectedChapterNumber)}
                          </Badge>
                          <span className="text-xs font-medium text-foreground">
                            {CHAPTER_DESCRIPTIONS[selectedChapterNumber]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Lock className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-mono text-[11px]">
                            Round {selectedNextRound} (v{nextVersion})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <select
                        id="chapter"
                        value={chapter}
                        onChange={(e) => setChapter(e.target.value)}
                        disabled={isSubmitting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select target chapter...</option>
                        {CHAPTER_LABELS.map((label, idx) => {
                          const val = idx + 1;
                          const prev = latestChapterSubmissions.get(val - 1);
                          const isAllowed =
                            val === 1 || APPROVED_CHAPTER_STATUSES.includes(prev?.status);
                          return (
                            <option key={val} value={val} disabled={!isAllowed}>
                              {label}: {CHAPTER_DESCRIPTIONS[val]}
                              {!isAllowed ? ` (Locked — Chapter ${val - 1} Pending Approval)` : ''}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  {/* Sequential Prerequisite Alert */}
                  {isPreviousChapterUnapproved && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Sequential Prerequisite Incomplete</p>
                        <p className="mt-0.5 text-destructive/90 leading-relaxed">
                          {previousChapter?.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED
                            ? `Chapter ${selectedChapterNumber - 1} currently requires revisions from your adviser. Upload and obtain approval for Chapter ${selectedChapterNumber - 1} before Chapter ${selectedChapterNumber} can be submitted.`
                            : `Chapter ${selectedChapterNumber - 1} must be submitted, reviewed, and approved before Chapter ${selectedChapterNumber} can be unlocked.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Main Manuscript File Upload */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="manuscript-file"
                      className="text-xs font-semibold text-foreground"
                    >
                      Chapter Manuscript Document <span className="text-destructive">*</span>
                    </Label>
                    {!file ? (
                      <label
                        htmlFor="manuscript-file"
                        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 px-6 py-8 transition hover:border-primary/50 hover:bg-muted/40"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                          <Upload className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          Click to select or drag manuscript here
                        </span>
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          PDF, DOCX, or TXT format &mdash; up to {MAX_FILE_SIZE_MB} MB
                        </span>
                        <Input
                          id="manuscript-file"
                          type="file"
                          accept={ACCEPT_STRING}
                          onChange={handleFileChange}
                          disabled={isSubmitting}
                          className="sr-only"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 p-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate max-w-sm sm:max-w-md">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(file.size)} &bull; {file.type || 'Document'}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={handleRemoveFile}
                          disabled={isSubmitting}
                          aria-label="Remove selected file"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* LATE SUBMISSION JUSTIFICATION (Visible ONLY when late)   */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {requiresLateJustification && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-destructive">
                            Late Submission Compliance Gate
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            The deadline for {toChapterLabel(selectedChapterNumber)} (
                            {formatDeadline(selectedDeadline)}) has elapsed. Institutional
                            department policy strictly requires both a written justification
                            statement and an official signed justification letter (PDF/DOCX) before
                            submission can be accepted.
                          </p>
                        </div>
                      </div>

                      {/* Required Written Justification Note */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="late-statement"
                          className="text-xs font-semibold text-foreground"
                        >
                          Justification Statement <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="late-statement"
                          placeholder="Provide a comprehensive explanation for the delay in deliverable submission..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          disabled={isSubmitting}
                          maxLength={1000}
                          rows={3}
                          required
                          className="text-xs resize-none"
                        />
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span className="text-destructive font-medium">
                            Justification statement is mandatory.
                          </span>
                          <span>{remarks.length}/1000 characters</span>
                        </div>
                      </div>

                      {/* Required Signed Justification Letter Document */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="justification-letter"
                          className="text-xs font-semibold text-foreground"
                        >
                          Official Justification Letter Document{' '}
                          <span className="text-destructive">*</span>
                        </Label>
                        {!justificationLetter ? (
                          <label
                            htmlFor="justification-letter"
                            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-destructive/40 bg-background/50 p-4 transition hover:bg-background/80"
                          >
                            <Paperclip className="h-5 w-5 text-destructive mb-1" />
                            <span className="text-xs font-semibold text-foreground">
                              Click to attach signed justification letter
                            </span>
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              Signed document (PDF or DOCX format, up to {MAX_FILE_SIZE_MB} MB)
                            </span>
                            <Input
                              id="justification-letter"
                              type="file"
                              accept={ACCEPT_STRING}
                              onChange={handleLetterChange}
                              disabled={isSubmitting}
                              className="sr-only"
                            />
                          </label>
                        ) : (
                          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-background p-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Paperclip className="h-4 w-4 text-destructive shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                                  {justificationLetter.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {formatBytes(justificationLetter.size)} &bull; Signed
                                  Justification Letter
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={handleRemoveLetter}
                              disabled={isSubmitting}
                              aria-label="Remove justification letter"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* ON-TIME REMARKS (Visible ONLY when NOT late)             */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {!requiresLateJustification && (
                    <div className="space-y-1.5">
                      <Label htmlFor="remarks" className="text-xs font-medium text-foreground">
                        {isLocked
                          ? 'Revision Summary for Adviser (Optional)'
                          : 'Submission Remarks for Adviser (Optional)'}
                      </Label>
                      <Textarea
                        id="remarks"
                        placeholder={
                          isLocked
                            ? 'Summarize the key revisions made in response to adviser recommendations...'
                            : 'Any notes, highlights, or questions for your adviser regarding this chapter draft...'
                        }
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        disabled={isSubmitting}
                        maxLength={1000}
                        rows={3}
                        className="text-xs resize-none"
                      />
                      <div className="flex justify-end text-[11px] text-muted-foreground">
                        <span>{remarks.length}/1000 characters</span>
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {(clientError || serverError) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{clientError || serverError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Upload Progress Bar */}
                  {isSubmitting && uploadProgress > 0 && (
                    <div className="space-y-1">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground text-right">
                        {uploadProgress}% uploaded
                      </p>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border/60">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/project/submissions')}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !file ||
                        !chapter ||
                        !canSubmitSelectedChapter ||
                        (requiresLateJustification && (!remarks.trim() || !justificationLetter))
                      }
                      className="gap-2 font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading Manuscript...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Submit Chapter Manuscript
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Academic Workflow Gate Inspector (4 Columns) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-border/80 bg-card shadow-xs sticky top-6">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      Academic Workflow Gate
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Institutional progression &amp; compliance status
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                {/* Target Deliverable Info */}
                <div className="space-y-1.5 pb-3 border-b border-border/50">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Target Deliverable
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {selectedChapterNumber
                        ? toChapterLabel(selectedChapterNumber)
                        : 'None selected'}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Round {selectedNextRound} (v{nextVersion})
                    </Badge>
                  </div>
                  {selectedChapterNumber ? (
                    <p className="text-[11px] text-muted-foreground">
                      {CHAPTER_DESCRIPTIONS[selectedChapterNumber]}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Select a chapter to inspect specific prerequisites.
                    </p>
                  )}
                </div>

                {/* Sequential Prerequisite Status */}
                <div className="space-y-1.5 pb-3 border-b border-border/50">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Prerequisite Status
                  </span>
                  {selectedChapterNumber === 1 ? (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="font-medium">Initial phase deliverable (Unlocked)</span>
                    </div>
                  ) : isPreviousChapterUnapproved ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="font-medium">
                        Blocked: Chapter {selectedChapterNumber - 1} unapproved
                      </span>
                    </div>
                  ) : selectedChapterNumber ? (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="font-medium">
                        Prerequisites cleared: Chapter {selectedChapterNumber - 1} approved
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>Next recommended: {toChapterLabel(nextAllowedChapter)}</span>
                    </div>
                  )}
                </div>

                {/* Applicable Milestone Deadline */}
                <div className="space-y-1.5 pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Milestone Deadline
                    </span>
                    {requiresLateJustification && (
                      <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{formatDeadline(selectedDeadline)}</span>
                  </div>
                  {requiresLateJustification ? (
                    <p className="text-[11px] text-destructive font-medium">
                      Submission is past deadline. Justification letter &amp; note mandatory.
                    </p>
                  ) : selectedDeadline ? (
                    <p className="text-[11px] text-muted-foreground">
                      Submit prior to scheduled cutoff to avoid late gating.
                    </p>
                  ) : null}
                </div>

                {/* Document Verification Standards */}
                <div className="space-y-2 pt-1 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[10px] block">
                    Institutional Pipeline Checks
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>Client-side OOXML / PDF format verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>Winnowing Fingerprinting &amp; BAAI/bge-m3 Vector Scoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>Automated Adviser Evaluation Notification Dispatch</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
