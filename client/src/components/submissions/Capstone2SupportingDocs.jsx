import { useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Loader2,
  Code2,
  Calendar,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Upload,
} from 'lucide-react';
import { useProjectSubmissions, useUploadSystemDesign, useUploadTestResults, useViewUrl } from '@/hooks/useSubmissions';
import { SUBMISSION_STATUSES } from '@cms/shared';
import { toast } from 'sonner';

/* ── Status helpers ── */
function getStatusBadge(status) {
  const map = {
    [SUBMISSION_STATUSES.PENDING]:            { label: 'Pending Review', variant: 'secondary' },
    [SUBMISSION_STATUSES.UNDER_REVIEW]:       { label: 'Under Review',   variant: 'outline'   },
    [SUBMISSION_STATUSES.APPROVED]:           { label: 'Approved',       variant: 'default'   },
    [SUBMISSION_STATUSES.LOCKED]:             { label: 'Locked',         variant: 'default'   },
    [SUBMISSION_STATUSES.REVISIONS_REQUIRED]: { label: 'Needs Revision', variant: 'destructive'},
    [SUBMISSION_STATUSES.REJECTED]:           { label: 'Rejected',       variant: 'destructive'},
  };
  return map[status] ?? { label: 'Not Uploaded', variant: 'outline' };
}

function StatusIcon({ status }) {
  switch (status) {
    case SUBMISSION_STATUSES.LOCKED:
      return <Lock className="h-4 w-4 text-primary" />;
    case SUBMISSION_STATUSES.APPROVED:
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case SUBMISSION_STATUSES.PENDING:
    case SUBMISSION_STATUSES.UNDER_REVIEW:
      return <Clock className="h-4 w-4 text-amber-500" />;
    case SUBMISSION_STATUSES.REVISIONS_REQUIRED:
    case SUBMISSION_STATUSES.REJECTED:
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

/* ── View button (fetches pre-signed URL) ── */
function ViewButton({ submissionId }) {
  const { data: viewData, isFetching } = useViewUrl(submissionId, { enabled: !!submissionId });
  if (!submissionId) return null;
  if (isFetching) return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  if (!viewData?.url) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs h-7 px-2"
      onClick={() => window.open(viewData.url, '_blank', 'noopener,noreferrer')}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      View
    </Button>
  );
}

/* ── Upload form inline ── */
function UploadForm({ label, onSubmit, isPending }) {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast.error('File must be under 50 MB.');
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    onSubmit(fd, () => {
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <Label htmlFor={`file-${label}`} className="sr-only">{label}</Label>
      <Input
        id={`file-${label}`}
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        onChange={handleChange}
        className="flex-1 h-8 text-xs"
      />
      <Button
        type="submit"
        size="sm"
        disabled={!file || isPending}
        className="h-8 gap-1.5 text-xs shrink-0"
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Upload
      </Button>
    </form>
  );
}

/* ── Single document row ── */
function DocRow({ icon: Icon, iconColor, label, submission, projectId, uploadMutation, canUpload }) {
  const [uploading, setUploading] = useState(false);
  const { label: badgeLabel, variant } = getStatusBadge(submission?.status);

  const handleUpload = (formData, reset) => {
    setUploading(true);
    uploadMutation.mutate(
      { projectId, formData },
      {
        onSuccess: () => {
          toast.success(`${label} uploaded successfully.`);
          reset();
          setUploading(false);
        },
        onError: (err) => {
          toast.error(err?.response?.data?.error?.message || `Failed to upload ${label}.`);
          setUploading(false);
        },
      },
    );
  };

  const needsUpload = canUpload && (!submission || submission.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED);

  return (
    <div className="rounded-xl border border-border bg-card/60 px-4 py-3 transition-colors hover:bg-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {submission ? (
              <p className="text-xs text-muted-foreground">
                v{submission.version}
                {' · '}
                {new Date(submission.createdAt).toLocaleDateString('en-PH', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Not uploaded</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {submission && (
            <>
              <StatusIcon status={submission.status} />
              <Badge variant={variant} className="text-xs">{badgeLabel}</Badge>
              <ViewButton submissionId={submission._id} />
            </>
          )}

          {canUpload && !needsUpload && submission && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setUploading((v) => !v)}
            >
              <Upload className="h-3 w-3" />
              Re-upload
            </Button>
          )}
        </div>
      </div>

      {(needsUpload || uploading) && (
        <UploadForm
          label={label}
          onSubmit={handleUpload}
          isPending={uploadMutation.isPending}
        />
      )}
    </div>
  );
}

/**
 * Capstone2SupportingDocs
 *
 * Shows System Design and Gantt Chart (test_results) submissions.
 * - Students (canUpload=true): can upload / re-upload documents.
 * - Faculty (canUpload=false): read-only view with status and view link.
 *
 * @param {{ projectId: string, canUpload?: boolean }} props
 */
export default function Capstone2SupportingDocs({ projectId, canUpload = false }) {
  const { data: submissionsData, isLoading } = useProjectSubmissions(
    projectId,
    { limit: 200 },
    { enabled: !!projectId },
  );

  const submissions = submissionsData?.submissions ?? [];

  const latestByType = useMemo(() => {
    const byType = {};
    for (const s of submissions) {
      if (!['system_design', 'test_results'].includes(s.type)) continue;
      if (!byType[s.type] || s.version > byType[s.type].version) {
        byType[s.type] = s;
      }
    }
    return byType;
  }, [submissions]);

  const systemDesignMutation = useUploadSystemDesign();
  const ganttMutation = useUploadTestResults();

  return (
    <div className="rounded-2xl border border-border bg-card shadow-md p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Supporting Documents</h3>
      </div>

      {isLoading ? (
        <div className="flex h-16 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          <DocRow
            icon={Code2}
            iconColor="text-blue-500"
            label="System Design"
            submission={latestByType['system_design']}
            projectId={projectId}
            uploadMutation={systemDesignMutation}
            canUpload={canUpload}
          />
          <DocRow
            icon={Calendar}
            iconColor="text-violet-500"
            label="Gantt Chart"
            submission={latestByType['test_results']}
            projectId={projectId}
            uploadMutation={ganttMutation}
            canUpload={canUpload}
          />
        </div>
      )}
    </div>
  );
}
