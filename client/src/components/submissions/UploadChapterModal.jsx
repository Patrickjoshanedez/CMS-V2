import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Lock,
  MessageSquareQuote,
  Clock,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
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
  onUploadSuccess = null,
  isCap2ADMApproved = true,
}) {
  const [chapter, setChapter] = useState(initialChapter);
  const [file, setFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [clientError, setClientError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Sync initialChapter when modal opens
  useEffect(() => {
    if (isOpen) {
      const validInitial = !isCap2ADMApproved && initialChapter >= 4 ? 1 : initialChapter;
      setChapter(validInitial);
      setFile(null);
      setRemarks('');
      setClientError('');
      setUploadProgress(0);
    }
  }, [isOpen, initialChapter, isCap2ADMApproved]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const validateFile = useCallback((selectedFile) => {
    if (!selectedFile) return 'Please select a file.';
    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(selectedFile.type)) {
      return 'Invalid file type. Only PDF, DOCX, or TXT allowed.';
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      return `File exceeds maximum size (${MAX_FILE_SIZE_MB}MB)`;
    }
    return '';
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setClientError(selected ? validateFile(selected) : '');
    setUploadProgress(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0] || null;
    if (dropped) {
      setFile(dropped);
      setClientError(validateFile(dropped));
      setUploadProgress(0);
    }
  };

  const [currentTimestamp] = useState(() => Date.now());
  const selectedChapterNumber = Number(chapter);
  const selectedDeadlineField = `chapter${selectedChapterNumber}`;
  const selectedDeadline = deadlines?.[selectedDeadlineField];
  const isLateByDeadline = selectedDeadline
    ? currentTimestamp > new Date(selectedDeadline).getTime()
    : false;
  const requiresLateJustification = isLateByDeadline;

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
    const fileErr = validateFile(file);
    if (fileErr) {
      setClientError(fileErr);
      return;
    }
    if (requiresLateJustification && !remarks.trim()) {
      setClientError('Late submission detected. Please provide a late-justification note.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chapter', chapter);
    if (remarks.trim()) {
      formData.append('remarks', remarks.trim());
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

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const isSubmitting = uploadMutation.isPending;
  const nextRound = latestSubmission ? (latestSubmission.revisionRound || 0) + 1 : 1;
  const nextVersion = latestSubmission ? (latestSubmission.version || 1) + 1 : 1;
  const adviserFeedback = latestSubmission?.reviewNotes || latestSubmission?.remarks || '';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-chapter-modal-title"
    >
      <div className="relative flex flex-col w-full max-w-xl max-h-[92vh] rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                isLocked
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {isLocked ? <Lock className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="upload-chapter-modal-title" className="text-base font-bold text-foreground">
                  {isLocked
                    ? `Revise Chapter ${selectedChapterNumber}`
                    : 'Upload Chapter Manuscript'}
                </h3>
                {isLocked && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono uppercase"
                  >
                    Locked
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLocked
                  ? `Upload updated revision for Chapter ${selectedChapterNumber}: ${CHAPTER_TITLES[selectedChapterNumber] || ''}`
                  : 'Submit a new chapter manuscript for adviser evaluation and plagiarism check.'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1">
          {/* Adviser Remarks Callout (if revising and feedback is present) */}
          {isLocked && adviserFeedback && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <MessageSquareQuote className="h-4 w-4 shrink-0" />
                <span>Adviser Review Remarks (Required Revisions)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                &ldquo;{adviserFeedback}&rdquo;
              </p>
            </div>
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
                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-mono text-[11px]">
                    Round {nextRound} (v{nextVersion})
                  </span>
                </div>
              </div>
            ) : (
              <select
                id="modal-chapter"
                value={chapter}
                onChange={(e) => setChapter(Number(e.target.value))}
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[1, 2, 3, 4, 5].map((ch) => {
                  const isLockedCh = ch >= 4 && !isCap2ADMApproved;
                  return (
                    <option key={ch} value={ch} disabled={isLockedCh}>
                      Chapter {ch}: {CHAPTER_TITLES[ch]}
                      {isLockedCh ? ' (Locked — Requires Capstone 2 ADM Approval)' : ''}
                    </option>
                  );
                })}
              </select>
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
              <Badge
                variant="destructive"
                className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px]"
              >
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
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
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
                  disabled={isSubmitting}
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

          {/* Late Justification / Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-remarks" className="text-xs font-medium">
              {requiresLateJustification
                ? 'Late Justification Note (Required)'
                : isLocked
                  ? 'Revision Notes for Adviser (Optional)'
                  : 'Submission Remarks (Optional)'}
            </Label>
            <Textarea
              id="modal-remarks"
              rows={3}
              placeholder={
                requiresLateJustification
                  ? 'This submission is past the deadline. Please provide a clear justification for your committee.'
                  : isLocked
                    ? 'Summarize the changes made in response to adviser comments (e.g., expanded Section 1.2, revised problem statement).'
                    : 'Any additional notes for your adviser regarding this chapter.'
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isSubmitting}
              maxLength={1000}
              required={requiresLateJustification}
              className="text-xs resize-none"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>
                {requiresLateJustification && (
                  <span className="text-red-500 font-medium">Justification required.</span>
                )}
              </span>
              <span>{remarks.length}/1000 characters</span>
            </div>
          </div>

          {/* Client / Server Error */}
          {clientError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{clientError}</span>
            </div>
          )}

          {/* Upload Progress */}
          {isSubmitting && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
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
                isSubmitting || !file || !chapter || (requiresLateJustification && !remarks.trim())
              }
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
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
      </div>
    </div>,
    document.body,
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
  onUploadSuccess: PropTypes.func,
  isCap2ADMApproved: PropTypes.bool,
};
