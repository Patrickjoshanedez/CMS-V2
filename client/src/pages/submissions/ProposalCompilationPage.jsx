import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import WorkflowPhaseTracker from '@/components/projects/WorkflowPhaseTracker';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import { useMyProject } from '@/hooks/useProjects';
import { useLatestChapter, useCompileProposal } from '@/hooks/useSubmissions';
import { SUBMISSION_STATUSES, PROJECT_STATUSES } from '@cms/shared';
import {
  Upload,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Lock,
  BookOpen,
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

const CHAPTER_LABELS = ['Chapter 1', 'Chapter 2', 'Chapter 3'];

/**
 * Format bytes into a human-readable string.
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/* ────────── Sub-components ────────── */

/**
 * ChapterStatusRow — displays the approval/lock status of a single chapter.
 */
function ChapterStatusRow({ label, submission, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <span className="text-sm font-medium">{label}</span>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/25 px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Badge variant="secondary">Not Uploaded</Badge>
      </div>
    );
  }

  const isLocked = submission.status === SUBMISSION_STATUSES.LOCKED;
  const isApproved = submission.status === SUBMISSION_STATUSES.APPROVED;
  const isReady = isLocked || isApproved;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
        isReady ? 'border-primary/20 bg-primary/5' : 'bg-muted/30'
      }`}
    >
      <div className="flex items-center gap-2">
        {isReady ? (
          <Lock className="h-4 w-4 text-primary" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{label}</span>
        {submission.version > 1 && (
          <Badge variant="outline" className="text-xs">
            v{submission.version}
          </Badge>
        )}
      </div>
      <SubmissionStatusBadge status={submission.status} />
    </div>
  );
}

/* ────────── Main Page ────────── */

/**
 * ProposalCompilationPage — Allows a student to compile and upload the
 * full proposal (chapters 1-3 combined) once all three chapters are locked.
 *
 * Follows the same UX pattern as ChapterUploadPage.
 */
export default function ProposalCompilationPage() {
  const navigate = useNavigate();

  // Local state
  const [file, setFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clientError, setClientError] = useState('');

  // Server data
  const { data: project, isLoading: projectLoading, error: projectError } = useMyProject();
  const projectId = project?._id;

  // Fetch latest chapter submissions (1, 2, 3) to check lock status
  const ch1 = useLatestChapter(projectId, 1, { enabled: !!projectId });
  const ch2 = useLatestChapter(projectId, 2, { enabled: !!projectId });
  const ch3 = useLatestChapter(projectId, 3, { enabled: !!projectId });

  const chapters = [
    { label: CHAPTER_LABELS[0], data: ch1.data, isLoading: ch1.isLoading },
    { label: CHAPTER_LABELS[1], data: ch2.data, isLoading: ch2.isLoading },
    { label: CHAPTER_LABELS[2], data: ch3.data, isLoading: ch3.isLoading },
  ];

  // Check if all 3 chapters are locked (or approved — backend enforces locked specifically)
  const allChaptersReady = chapters.every((ch) => {
    const status = ch.data?.status;
    return status === SUBMISSION_STATUSES.LOCKED || status === SUBMISSION_STATUSES.APPROVED;
  });
  const chaptersLoading = chapters.some((ch) => ch.isLoading);

  // Check if proposal was already submitted or approved
  const proposalAlreadySubmitted =
    project?.status === PROJECT_STATUSES.PROPOSAL_SUBMITTED ||
    project?.status === PROJECT_STATUSES.PROPOSAL_APPROVED;

  const compileMutation = useCompileProposal({
    onSuccess: () => {
      toast.success('Proposal uploaded successfully! It will now undergo review.');
      if (projectId) {
        navigate('/project/submissions');
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message || err?.message || 'Failed to upload proposal.',
      );
    },
  });

  /**
   * Validate the selected file on the client side before sending.
   */
  const validateFile = useCallback((selectedFile) => {
    if (!selectedFile) return 'Please select a file.';

    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(selectedFile.type)) {
      return 'Invalid file type. Only PDF, DOCX, and TXT files are accepted.';
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
    }

    return '';
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setClientError(selectedFile ? validateFile(selectedFile) : '');
    setUploadProgress(0);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setClientError('');
    setUploadProgress(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError('');

    if (!file) {
      setClientError('Please select a file.');
      return;
    }
    const fileErr = validateFile(file);
    if (fileErr) {
      setClientError(fileErr);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (remarks.trim()) {
      formData.append('remarks', remarks.trim());
    }

    compileMutation.mutate({
      projectId,
      formData,
      onUploadProgress: (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        setUploadProgress(pct);
      },
    });
  };

  const isSubmitting = compileMutation.isPending;
  const serverError =
    compileMutation.error?.response?.data?.error?.message || compileMutation.error?.message;

  /* ────── Loading ────── */
  if (projectLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  /* ────── No project ────── */
  if (projectError || !project) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {projectError?.message || 'You need a project before compiling a proposal.'}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  /* ────── Success state ────── */
  if (compileMutation.isSuccess) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg py-12 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="text-xl font-semibold">Proposal Submitted!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your full proposal has been submitted for review. Your adviser will be notified.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/project')}>
              Back to Project
            </Button>
            <Button onClick={() => navigate('/project/submissions')}>View Submissions</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ────── Main Content ────── */
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compile Proposal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit your full proposal (Chapters 1–3 combined) for&nbsp;
            <span className="font-medium">{project.title}</span>.
          </p>
        </div>

        {/* Workflow progress */}
        <WorkflowPhaseTracker project={project} />

        {/* Errors */}
        {(clientError || serverError) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{clientError || serverError}</AlertDescription>
          </Alert>
        )}

        {/* Already submitted notice */}
        {proposalAlreadySubmitted && (
          <Alert>
            <BookOpen className="h-4 w-4" />
            <AlertDescription>
              A proposal has already been submitted for this project. Current status:{' '}
              <span className="font-medium capitalize">{project.status.replace(/_/g, ' ')}</span>.
            </AlertDescription>
          </Alert>
        )}

        {/* Chapter status overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Chapter Status
            </CardTitle>
            <CardDescription>
              All three chapters must be approved and locked before you can compile the full
              proposal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {chapters.map((ch) => (
              <ChapterStatusRow
                key={ch.label}
                label={ch.label}
                submission={ch.data}
                isLoading={ch.isLoading}
              />
            ))}

            {!chaptersLoading && !allChaptersReady && (
              <Alert variant="destructive" className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Not all chapters are locked/approved yet. Please ensure Chapters 1–3 are reviewed
                  and locked before submitting the full proposal.
                </AlertDescription>
              </Alert>
            )}

            {!chaptersLoading && allChaptersReady && !proposalAlreadySubmitted && (
              <Alert className="mt-3">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  All chapters are ready. You can now upload your compiled proposal below.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Upload form — only show if chapters are ready */}
        {allChaptersReady && !proposalAlreadySubmitted && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Proposal Document</CardTitle>
              <CardDescription>
                Accepted formats: PDF, DOCX, TXT &mdash; Max size: {MAX_FILE_SIZE_MB} MB
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* File dropzone / input */}
                <div className="space-y-2">
                  <Label htmlFor="proposal-file">Proposal Document</Label>
                  {!file ? (
                    <label
                      htmlFor="proposal-file"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 px-6 py-10 transition hover:border-primary/40 hover:bg-muted"
                    >
                      <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Click to select your proposal file
                      </span>
                      <span className="mt-1 text-xs text-muted-foreground">
                        PDF, DOCX, or TXT up to {MAX_FILE_SIZE_MB} MB
                      </span>
                      <Input
                        id="proposal-file"
                        type="file"
                        accept={ACCEPT_STRING}
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                        className="sr-only"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
                      <FileText className="h-8 w-8 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Upload progress bar */}
                {isSubmitting && uploadProgress > 0 && (
                  <div className="space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
                  </div>
                )}

                {/* Remarks */}
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (optional)</Label>
                  <Textarea
                    id="remarks"
                    placeholder="If submitting past the deadline, provide an explanation here..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={isSubmitting}
                    maxLength={1000}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">{remarks.length}/1000 characters</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !!clientError}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Submit Proposal
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
