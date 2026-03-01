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
import { useMyProject } from '@/hooks/useProjects';
import { useUploadChapter } from '@/hooks/useSubmissions';
import { Upload, FileText, AlertTriangle, Loader2, CheckCircle2, X, ArrowLeft } from 'lucide-react';

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

/**
 * ChapterUploadPage — Allows a student to upload a chapter document.
 *
 * Query-string support: ?chapter=1 pre-selects the chapter number.
 */
export default function ChapterUploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedChapter = searchParams.get('chapter');

  // Local state
  const [chapter, setChapter] = useState(preselectedChapter || '');
  const [file, setFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clientError, setClientError] = useState('');

  // Server data
  const { data: project, isLoading: projectLoading, error: projectError } = useMyProject();
  const uploadMutation = useUploadChapter({
    onSuccess: () => {
      toast.success('Chapter uploaded successfully! It will now undergo review.');
      // Navigate to the submission overview after successful upload
      if (project?._id) {
        navigate('/project/submissions');
      }
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
  const validateFile = useCallback((selectedFile) => {
    if (!selectedFile) return 'Please select a file.';

    // Check MIME type
    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(selectedFile.type)) {
      return 'Invalid file type. Only PDF, DOCX, and TXT files are accepted.';
    }

    // Check size
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

    // Validate
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

    // Build FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chapter', chapter);
    if (remarks.trim()) {
      formData.append('remarks', remarks.trim());
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

  /* ────── Loading / Error ────── */
  if (projectLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (projectError || !project) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {projectError?.message || 'You need a project before uploading documents.'}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  /* ────── Success state ────── */
  if (uploadMutation.isSuccess) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg py-12 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="text-xl font-semibold">Upload Successful</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your {CHAPTER_LABELS[Number(chapter) - 1]} document has been submitted for review.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => uploadMutation.reset()}>
              Upload Another
            </Button>
            <Button onClick={() => navigate('/project/submissions')}>View Submissions</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ────── Upload Form ────── */
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => navigate('/project')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Upload Chapter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit a chapter document for your project&nbsp;
            <span className="font-medium">{project.title}</span>.
          </p>
        </div>

        {/* Errors */}
        {(clientError || serverError) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{clientError || serverError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Document Upload</CardTitle>
            <CardDescription>
              Accepted formats: PDF, DOCX, TXT &mdash; Max size: {MAX_FILE_SIZE_MB} MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Chapter selector */}
              <div className="space-y-2">
                <Label htmlFor="chapter">Chapter</Label>
                <select
                  id="chapter"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  disabled={isSubmitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select a chapter...</option>
                  {CHAPTER_LABELS.map((label, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* File dropzone / input */}
              <div className="space-y-2">
                <Label htmlFor="file">Document</Label>
                {!file ? (
                  <label
                    htmlFor="file"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 px-6 py-10 transition hover:border-primary/40 hover:bg-muted"
                  >
                    <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                    <span className="text-sm font-medium">Click to select a file</span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      PDF, DOCX, or TXT up to {MAX_FILE_SIZE_MB} MB
                    </span>
                    <Input
                      id="file"
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

              {/* Late-submission remarks (optional — backend enforces if past deadline) */}
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
                      Upload Chapter
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
