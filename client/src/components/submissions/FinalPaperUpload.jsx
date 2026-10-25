import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FileText, Lock, Globe, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { useUploadFinalAcademic, useUploadFinalJournal } from '@/hooks/useSubmissions';
import { cn } from '@/lib/utils';
import { getMilestoneDeadlineState } from '@/utils/milestoneDeadlines';

function UploadSection({
  icon: Icon,
  label,
  badge,
  badgeVariant = 'outline',
  badgeClass = '',
  description,
  mutation,
  projectId,
  isLocked = false,
  deadline,
  allowLateSubmission = true,
}) {
  const [file, setFile] = useState(null);
  const [lateRemarks, setLateRemarks] = useState('');
  const inputRef = useRef(null);
  const deadlineState = getMilestoneDeadlineState(deadline);
  const isLate = deadlineState === 'overdue';
  const lateSubmissionClosed = isLate && !allowLateSubmission;

  const acceptPdfFile = (selected) => {
    if (!selected) return;
    const isPdf =
      selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setFile(null);
      toast.error('Please select a PDF file.');
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      setFile(null);
      toast.error('File size exceeds the 50MB limit.');
      return;
    }
    setFile(selected);
  };

  const handleFileChange = (e) => {
    acceptPdfFile(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    acceptPdfFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    if (lateSubmissionClosed) {
      toast.error('The scheduled deadline has passed and late uploads are closed.');
      return;
    }
    if (isLate && !lateRemarks.trim()) {
      toast.error('Add a late-submission justification before uploading.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (lateRemarks.trim()) formData.append('remarks', lateRemarks.trim());
      await mutation.mutateAsync({ projectId, formData });
      toast.success(`${label} uploaded successfully.`);
      setFile(null);
      setLateRemarks('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to upload ${label.toLowerCase()}.`);
    }
  };

  const isPending = mutation.isPending;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{label}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge
          variant={badgeVariant}
          className={cn('shrink-0 text-[10px] font-semibold uppercase tracking-wider', badgeClass)}
        >
          {badge}
        </Badge>
      </div>

      <div
        className={cn(
          'rounded-md border px-3 py-2 text-xs',
          isLate
            ? 'border-destructive/40 bg-destructive/5 text-destructive-text'
            : 'border-border/60 bg-muted/30 text-muted-foreground',
        )}
        data-testid="final-paper-deadline"
        data-status={deadlineState}
      >
        {!deadline
          ? 'No deadline scheduled'
          : isLate
            ? lateSubmissionClosed
              ? `Deadline passed (${formatDeadline(deadline)}); late uploads are closed.`
              : `Overdue since ${formatDeadline(deadline)}; a justification is required.`
            : `Due ${formatDeadline(deadline)}`}
      </div>

      {isLate && allowLateSubmission && (
        <div className="space-y-1.5">
          <Label
            htmlFor={`${label.replace(/\W+/g, '-').toLowerCase()}-late-remarks`}
            className="text-xs font-medium"
          >
            Late-submission justification <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id={`${label.replace(/\W+/g, '-').toLowerCase()}-late-remarks`}
            value={lateRemarks}
            onChange={(event) => setLateRemarks(event.target.value)}
            maxLength={1000}
            rows={3}
            className="min-h-[88px] text-xs"
            placeholder="Explain why this deliverable is being submitted after its deadline."
            disabled={isLocked || isPending}
            required
            data-testid="late-paper-remarks"
          />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        disabled={isLocked || lateSubmissionClosed || isPending}
        className="hidden"
        onChange={handleFileChange}
        aria-label={`${label} PDF file`}
      />

      {/* Drop zone */}
      <Button
        type="button"
        variant="outline"
        disabled={isLocked || lateSubmissionClosed || isPending}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        aria-label={
          file ? `Selected file: ${file.name}. Choose another PDF` : `Choose ${label} PDF file`
        }
        className={cn(
          'h-auto min-h-[44px] w-full flex-col gap-2.5 whitespace-normal rounded-xl border-2 border-dashed p-6 text-center transition-colors',
          isLocked || lateSubmissionClosed
            ? 'border-border/60 bg-muted/30 opacity-60'
            : file
              ? 'border-success/50 bg-success/5 hover:bg-success/10'
              : 'border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-muted/40',
        )}
      >
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            isLocked
              ? 'bg-muted text-muted-foreground'
              : file
                ? 'bg-success/15 text-success-foreground'
                : 'bg-muted text-muted-foreground',
          )}
        >
          {isLocked || lateSubmissionClosed ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : file ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </span>
        {isLocked || lateSubmissionClosed ? (
          <span className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">
              {isLocked ? 'Submission Locked' : 'Late Uploads Closed'}
            </span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              {isLocked
                ? 'Available in the Final Capstone phase after prerequisite milestone completion'
                : 'The instructor has closed late submissions for this milestone.'}
            </span>
          </span>
        ) : file ? (
          <span className="flex flex-col space-y-1">
            <span className="max-w-[320px] truncate block text-sm font-semibold text-foreground">
              {file.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
            </span>
          </span>
        ) : (
          <span className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              Click to browse or drag PDF file here
            </span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              Maximum file size: 50MB (.pdf)
            </span>
          </span>
        )}
      </Button>

      {/* Upload button */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleUpload}
          disabled={
            isLocked ||
            lateSubmissionClosed ||
            !file ||
            isPending ||
            (isLate && !lateRemarks.trim())
          }
          className="gap-2"
        >
          {isPending ? (
            <>
              <Spinner className="h-4 w-4" />
              Uploading…
            </>
          ) : isLocked ? (
            <>
              <Lock className="h-4 w-4" />
              Upload Locked
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload {label}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

UploadSection.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  badge: PropTypes.string.isRequired,
  badgeVariant: PropTypes.string,
  badgeClass: PropTypes.string,
  description: PropTypes.string.isRequired,
  mutation: PropTypes.object.isRequired,
  projectId: PropTypes.string.isRequired,
  isLocked: PropTypes.bool,
  deadline: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  allowLateSubmission: PropTypes.bool,
};

function formatDeadline(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'No deadline set';
  return new Date(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function FinalPaperUpload({
  projectId,
  isLocked = false,
  lockMessage,
  deadlines = {},
  deadlinePolicies = {},
}) {
  const academicMutation = useUploadFinalAcademic();
  const journalMutation = useUploadFinalJournal();

  return (
    <Card className="border-border/70 shadow-xs">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            {isLocked ? <Lock className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-foreground">
                Final Paper Submission
              </CardTitle>
              {isLocked && (
                <Badge variant="warning" className="text-[10px] font-semibold uppercase">
                  Locked
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Upload both required versions of your final capstone paper for institutional
              archiving.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {/* Lock or Info notice */}
        {isLocked ? (
          <Alert role="status" variant="warning" className="p-3.5">
            <AlertDescription className="text-xs font-medium leading-relaxed">
              {lockMessage ||
                'Final Paper Submission unlocks after Chapters 4–5 and Capstone 3 Action Done Matrix (ADM v2) are approved by the committee.'}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert role="status" variant="info" className="p-3.5">
            <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
              The Final Capstone requires both the Complete Academic Manuscript
              (internal/restricted) and the Publishable Journal Version (public repository). Ensure
              all final revisions from defense hearings are incorporated.
            </AlertDescription>
          </Alert>
        )}

        <UploadSection
          icon={Lock}
          label="Full Academic Manuscript"
          badge="Restricted Access"
          badgeVariant="warning"
          description="Complete academic manuscript with all 5 chapters, appendices, and references for faculty committee archives."
          mutation={academicMutation}
          projectId={projectId}
          isLocked={isLocked}
          deadline={deadlines.finalAcademic}
          allowLateSubmission={deadlinePolicies.finalAcademic?.allowLateSubmission ?? true}
        />

        <div className="border-t border-border/50" />

        <UploadSection
          icon={Globe}
          label="Journal / Publishable Version"
          badge="Public Repository"
          badgeVariant="success"
          description="Condensed paper version adhering to IEEE/CHED formats, indexed for the BukSU Institutional Public Archive."
          mutation={journalMutation}
          projectId={projectId}
          isLocked={isLocked}
          deadline={deadlines.finalJournal}
          allowLateSubmission={deadlinePolicies.finalJournal?.allowLateSubmission ?? true}
        />
      </CardContent>
    </Card>
  );
}

FinalPaperUpload.propTypes = {
  projectId: PropTypes.string.isRequired,
  isLocked: PropTypes.bool,
  lockMessage: PropTypes.string,
  deadlines: PropTypes.object,
  deadlinePolicies: PropTypes.object,
};
