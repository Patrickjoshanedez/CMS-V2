import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import { getMilestoneDeadlineState } from '@/utils/milestoneDeadlines';
import {
  Upload,
  FileText,
  CheckCircle2,
  X,
  Lock,
  MessageSquareQuote,
  Clock,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { Spinner } from '@/components/ui/Spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useUploadChapter } from '@/hooks/useSubmissions';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ACCEPTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

const ACCEPT_STRING = Object.values(ACCEPTED_FILE_TYPES).join(',');

const CHAPTER_TITLES = {
  1: 'The Problem and Its Background',
  2: 'Review of Related Literature & System Development',
  3: 'Research Methodology',
  4: 'Results and Discussion',
  5: 'Summary, Conclusions & Recommendations',
};

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDeadline(dateStr) {
  if (!dateStr) return 'No deadline set';
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * UploadChapterModal
 *
 * Dedicated modal for in-place chapter submissions and targeted revisions.
 * When `isLocked === true`, the chapter selection is strictly locked to prevent
 * accidental uploads across different chapters or phases.
 */
export default function UploadChapterModal({
  isOpen,
  onClose,
  initialChapter = 1,
  isLocked = false,
  projectId,
  latestSubmission = null,
  deadlines = {},
  deadlinePolicies = {},
  onUploadSuccess = null,
  isCap2ADMApproved = true,
}) {
  const [chapter, setChapter] = useState(initialChapter);
  const [file, setFile] = useState(null);
  const [justificationLetter, setJustificationLetter] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [clientError, setClientError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const letterInputRef = useRef(null);

  // Sync initialChapter when modal opens
  useEffect(() => {
    if (isOpen) {
      const validInitial = !isCap2ADMApproved && initialChapter >= 4 ? 1 : initialChapter;
      setChapter(validInitial);
      setFile(null);
      setJustificationLetter(null);
      setRemarks('');
      setClientError('');
      setUploadProgress(0);
    }
  }, [isOpen, initialChapter, isCap2ADMApproved]);

  const uploadMutation = useUploadChapter({
    onSuccess: () => {
      toast.success(
        isLocked
          ? `Chapter ${chapter} revision submitted successfully! Plagiarism scan queued.`
          : `Chapter ${chapter} uploaded successfully! Plagiarism scan queued.`,
      );
      onUploadSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message || err?.message || 'Failed to upload chapter.',
      );
    },
  });

  const validateFile = useCallback((selectedFile, label = 'File') => {
    if (!selectedFile) return `Please select a ${label.toLowerCase()}.`;
    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(selectedFile.type)) {
      return `Invalid ${label.toLowerCase()} type. Only PDF, DOCX, or TXT allowed.`;
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      return `${label} exceeds maximum size (${MAX_FILE_SIZE_MB}MB)`;
    }
    return '';
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setClientError(selected ? validateFile(selected, 'Manuscript file') : '');
    setUploadProgress(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0] || null;
    if (dropped) {
      setFile(dropped);
      setClientError(validateFile(dropped, 'Manuscript file'));
      setUploadProgress(0);
    }
  };

  const handleLetterChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setJustificationLetter(selected);
    setClientError(selected ? validateFile(selected, 'Justification letter') : '');
  };

  const handleLetterDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0] || null;
    if (dropped) {
      setJustificationLetter(dropped);
      setClientError(validateFile(dropped, 'Justification letter'));
    }
  };

  const selectedChapterNumber = Number(chapter);
  const selectedDeadlineField = `chapter${selectedChapterNumber}`;
  const selectedDeadline = deadlines?.[selectedDeadlineField];
  const allowLateSubmission =
    deadlinePolicies?.[selectedDeadlineField]?.allowLateSubmission !== false;
  const isLateByDeadline = getMilestoneDeadlineState(selectedDeadline) === 'overdue';
  const isLateSubmissionClosed = isLateByDeadline && !allowLateSubmission;
  const requiresLateJustification = isLateByDeadline && allowLateSubmission;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError('');

    if (!chapter) {
      setClientError('Please select a chapter.');
      return;
    }
    if (!file) {
      setClientError('Please select a file.');
      return;
    }
    const fileErr = validateFile(file, 'Manuscript file');
    if (fileErr) {
      setClientError(fileErr);
      return;
    }
    const isLateAtSubmit = selectedDeadline
      ? Date.now() > new Date(selectedDeadline).getTime()
      : false;
    if (isLateAtSubmit && !allowLateSubmission) {
      setClientError(
        'The submission deadline has passed and late uploads are closed for this milestone.',
      );
      return;
    }
    const requiresJustificationAtSubmit = isLateAtSubmit && allowLateSubmission;
    if (requiresJustificationAtSubmit) {
      if (!remarks.trim()) {
        setClientError('Late submission detected. Please provide a late-justification note.');
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
    if (requiresJustificationAtSubmit && justificationLetter) {
      formData.append('justificationLetter', justificationLetter);
    }

    uploadMutation.mutate({
      projectId,
      formData,
      onUploadProgress: (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        setUploadProgress(pct);
      },
    });
  };

  const isSubmitting = uploadMutation.isPending;
  const nextRound = latestSubmission ? (latestSubmission.revisionRound || 0) + 1 : 1;
  const nextVersion = latestSubmission ? (latestSubmission.version || 1) + 1 : 1;
  const adviserFeedback = latestSubmission?.reviewNotes || latestSubmission?.remarks || '';

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0"
        showClose={false}
        onInteractOutside={(event) => event.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="flex shrink-0 flex-row items-start justify-between border-b border-border/60 p-5 pb-4 text-left sm:p-6 sm:pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                isLocked ? 'bg-warning/10 text-warning-foreground' : 'bg-primary/10 text-primary'
              }`}
            >
              {isLocked ? <Lock className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold">
                  {isLocked
                    ? `Revise Chapter ${selectedChapterNumber}`
                    : 'Upload Chapter Manuscript'}
                </DialogTitle>
                {isLocked && (
                  <Badge variant="warning" className="text-[10px] font-mono uppercase">
                    Locked
                  </Badge>
                )}
              </div>
              <DialogDescription className="mt-0.5 text-xs">
                {isLocked
                  ? `Upload updated revision for Chapter ${selectedChapterNumber}: ${CHAPTER_TITLES[selectedChapterNumber] || ''}`
                  : 'Submit a new chapter manuscript for adviser evaluation and plagiarism check.'}
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 min-h-9 min-w-9 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close upload dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6"
        >
          {/* Adviser Remarks Callout (if revising and feedback is present) */}
          {isLocked && adviserFeedback && (
            <Alert variant="warning" className="space-y-1.5 p-3.5 pl-10">
              <AlertTitle className="flex items-center gap-2 text-xs font-semibold">
                <MessageSquareQuote className="h-4 w-4 shrink-0" />
                <span>Adviser Review Remarks (Required Revisions)</span>
              </AlertTitle>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                &ldquo;{adviserFeedback}&rdquo;
              </p>
            </Alert>
          )}

          {/* Chapter Selector or Locked State */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-chapter" className="text-xs font-medium">
              Target Chapter
            </Label>
            {isLocked ? (
              <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20"
                  >
                    Chapter {selectedChapterNumber}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">
                    {CHAPTER_TITLES[selectedChapterNumber]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-warning-foreground" />
                  <span className="font-mono text-[11px]">
                    Round {nextRound} (v{nextVersion})
                  </span>
                </div>
              </div>
            ) : (
              <Select
                value={String(chapter)}
                onValueChange={(value) => setChapter(Number(value))}
                disabled={isSubmitting}
              >
                <SelectTrigger id="modal-chapter" aria-label="Target Chapter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((ch) => {
                    const isLockedCh = ch >= 4 && !isCap2ADMApproved;
                    return (
                      <SelectItem key={ch} value={String(ch)} disabled={isLockedCh}>
                        Chapter {ch}: {CHAPTER_TITLES[ch]}
                        {isLockedCh ? ' (Locked — Requires Capstone 2 ADM Approval)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Deadline / Revision Context */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/60 px-3.5 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>Deadline:</span>
              <span className="font-medium text-foreground">
                {formatDeadline(selectedDeadline)}
              </span>
            </div>
            {requiresLateJustification && (
              <Badge variant="destructive" className="text-[10px]">
                Late Submission
              </Badge>
            )}
          </div>

          {/* File Upload Zone */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Manuscript Document</Label>
            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => !isLateSubmissionClosed && fileInputRef.current?.click()}
                onDrop={isLateSubmissionClosed ? undefined : handleDrop}
                onDragOver={isLateSubmissionClosed ? undefined : (e) => e.preventDefault()}
                onKeyDown={(e) =>
                  !isLateSubmissionClosed && e.key === 'Enter' && fileInputRef.current?.click()
                }
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/70 bg-muted/20 p-6 text-center transition hover:border-primary/50 hover:bg-muted/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                  <Upload className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  Click to select or drag manuscript here
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  PDF, DOCX, or TXT up to {MAX_FILE_SIZE_MB} MB
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_STRING}
                  onChange={handleFileChange}
                  disabled={isSubmitting || isLateSubmissionClosed}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate max-w-[280px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setFile(null)}
                  disabled={isSubmitting}
                  aria-label="Remove selected file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {isLateSubmissionClosed && (
            <Alert variant="destructive" className="p-4" data-testid="late-submission-closed">
              <AlertDescription>
                The scheduled deadline ({formatDeadline(selectedDeadline)}) has passed. Late uploads
                are closed for this milestone.
              </AlertDescription>
            </Alert>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* LATE SUBMISSION JUSTIFICATION (Visible ONLY when late)   */}
          {/* ──────────────────────────────────────────────────────── */}
          {requiresLateJustification ? (
            <Alert
              variant="destructive"
              className="space-y-3.5 p-4 pl-10 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-2.5">
                <div>
                  <AlertTitle className="text-xs font-bold">
                    Late Submission Compliance Gate
                  </AlertTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    The deadline for Chapter {selectedChapterNumber} (
                    {formatDeadline(selectedDeadline)}) has elapsed. Institutional policy requires
                    both a written justification statement and an official signed justification
                    letter (PDF/DOCX).
                  </p>
                </div>
              </div>

              {/* Required Written Justification Note */}
              <div className="space-y-1.5">
                <Label htmlFor="modal-remarks" className="text-xs font-semibold text-foreground">
                  Justification Statement <span className="text-destructive-text">*</span>
                </Label>
                <Textarea
                  id="modal-remarks"
                  rows={3}
                  placeholder="Provide a comprehensive explanation for the delay in deliverable submission..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={1000}
                  required
                  className="text-xs resize-none"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span className="text-destructive-text font-medium">
                    Justification statement is mandatory.
                  </span>
                  <span>{remarks.length}/1000 characters</span>
                </div>
              </div>

              {/* Required Signed Justification Letter Document */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="modal-justification-letter"
                  className="text-xs font-semibold text-foreground"
                >
                  Official Justification Letter Document{' '}
                  <span className="text-destructive-text">*</span>
                </Label>
                {!justificationLetter ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => letterInputRef.current?.click()}
                    onDrop={handleLetterDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onKeyDown={(e) => e.key === 'Enter' && letterInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-destructive/40 bg-background/50 p-3.5 text-center transition hover:bg-background/80"
                  >
                    <Paperclip className="h-4 w-4 text-destructive-text mb-1" />
                    <span className="text-xs font-semibold text-foreground">
                      Click to attach signed justification letter
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Signed document (PDF or DOCX format, up to {MAX_FILE_SIZE_MB} MB)
                    </span>
                    <input
                      ref={letterInputRef}
                      id="modal-justification-letter"
                      type="file"
                      accept={ACCEPT_STRING}
                      onChange={handleLetterChange}
                      disabled={isSubmitting}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-background p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-4 w-4 text-destructive-text shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[240px]">
                          {justificationLetter.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatBytes(justificationLetter.size)} &bull; Signed Justification Letter
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setJustificationLetter(null)}
                      disabled={isSubmitting}
                      aria-label="Remove justification letter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Alert>
          ) : (
            /* Standard Remarks (Optional when not late) */
            <div className="space-y-1.5">
              <Label htmlFor="modal-remarks" className="text-xs font-medium">
                {isLocked
                  ? 'Revision Notes for Adviser (Optional)'
                  : 'Submission Remarks (Optional)'}
              </Label>
              <Textarea
                id="modal-remarks"
                rows={3}
                placeholder={
                  isLocked
                    ? 'Summarize the changes made in response to adviser comments (e.g., expanded Section 1.2, revised problem statement).'
                    : 'Any additional notes for your adviser regarding this chapter.'
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={isSubmitting}
                maxLength={1000}
                className="text-xs resize-none"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span />
                <span>{remarks.length}/1000 characters</span>
              </div>
            </div>
          )}

          {/* Client / Server Error */}
          {clientError && (
            <Alert variant="destructive" className="p-3 pl-10 text-xs">
              <AlertDescription>{clientError}</AlertDescription>
            </Alert>
          )}

          {/* Upload Progress */}
          {isSubmitting && uploadProgress > 0 && (
            <div className="space-y-1">
              <Progress
                value={uploadProgress}
                aria-label="Chapter upload progress"
                aria-valuetext={`${uploadProgress}% uploaded`}
              />
              <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isSubmitting ||
                !file ||
                !chapter ||
                isLateSubmissionClosed ||
                (requiresLateJustification && (!remarks.trim() || !justificationLetter))
              }
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  <span>Uploading &amp; Scanning…</span>
                </>
              ) : (
                <>
                  {isLocked ? <Upload className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>{isLocked ? 'Submit Revision' : 'Upload Chapter'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

UploadChapterModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialChapter: PropTypes.number,
  isLocked: PropTypes.bool,
  projectId: PropTypes.string.isRequired,
  latestSubmission: PropTypes.object,
  deadlines: PropTypes.object,
  deadlinePolicies: PropTypes.object,
  onUploadSuccess: PropTypes.func,
  isCap2ADMApproved: PropTypes.bool,
};
