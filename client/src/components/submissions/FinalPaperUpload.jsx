import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FileText, Lock, Globe, Upload, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped?.type === 'application/pdf') setFile(dropped);
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
            ? 'border-destructive/40 bg-destructive/5 text-destructive'
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
          <label htmlFor={`${label.replace(/\W+/g, '-').toLowerCase()}-late-remarks`} className="text-xs font-medium text-foreground">
            Late-submission justification <span className="text-destructive">*</span>
          </label>
          <textarea
            id={`${label.replace(/\W+/g, '-').toLowerCase()}-late-remarks`}
            value={lateRemarks}
            onChange={(event) => setLateRemarks(event.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            placeholder="Explain why this deliverable is being submitted after its deadline."
            disabled={isLocked || isPending}
            required
            data-testid="late-paper-remarks"
          />
        </div>
      )}

      {/* Drop zone */}
      <div
        role={isLocked || lateSubmissionClosed ? 'region' : 'button'}
        tabIndex={isLocked || lateSubmissionClosed ? -1 : 0}
        onClick={() => !isLocked && !lateSubmissionClosed && inputRef.current?.click()}
        onDrop={!isLocked && !lateSubmissionClosed ? handleDrop : undefined}
        onDragOver={(e) => !isLocked && !lateSubmissionClosed && e.preventDefault()}
        onKeyDown={(e) =>
          !isLocked && !lateSubmissionClosed && e.key === 'Enter' && inputRef.current?.click()
        }
        className={cn(
          'flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-6 transition-all text-center',
          isLocked || lateSubmissionClosed
            ? 'border-border/60 bg-muted/30 opacity-60 cursor-not-allowed'
            : file
              ? 'border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10 cursor-pointer'
              : 'border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-muted/40 cursor-pointer',
        )}
      >
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            isLocked
              ? 'bg-muted text-muted-foreground'
              : file
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
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
        </div>
        {isLocked || lateSubmissionClosed ? (
          <div>
            <span className="text-sm font-medium text-muted-foreground">
              {isLocked ? 'Submission Locked' : 'Late Uploads Closed'}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLocked
                ? 'Available in the Final Capstone phase after prerequisite milestone completion'
                : 'The instructor has closed late submissions for this milestone.'}
            </p>
          </div>
        ) : file ? (
          <div className="space-y-1">
            <span className="max-w-[320px] truncate block text-sm font-semibold text-foreground">
              {file.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
            </span>
          </div>
        ) : (
          <div>
            <span className="text-sm font-medium text-foreground">
              Click to browse or drag PDF file here
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">Maximum file size: 50MB (.pdf)</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          disabled={isLocked || lateSubmissionClosed}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

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
              <Loader2 className="h-4 w-4 animate-spin" />
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
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] uppercase font-semibold"
                >
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
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-800 dark:text-amber-300">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-relaxed font-medium">
              {lockMessage ||
                'Final Paper Submission unlocks after Chapters 4–5 and Capstone 3 Action Done Matrix (ADM v2) are approved by the committee.'}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Final Capstone requires both the Complete Academic Manuscript
              (internal/restricted) and the Publishable Journal Version (public repository). Ensure
              all final revisions from defense hearings are incorporated.
            </p>
          </div>
        )}

        <UploadSection
          icon={Lock}
          label="Full Academic Manuscript"
          badge="Restricted Access"
          badgeVariant="outline"
          badgeClass="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
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
          badgeVariant="outline"
          badgeClass="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
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
