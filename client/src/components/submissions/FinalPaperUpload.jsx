import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FileText, Lock, Globe, Upload, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useUploadFinalAcademic, useUploadFinalJournal } from '@/hooks/useSubmissions';
import { cn } from '@/lib/utils';

function UploadSection({
  icon: Icon,
  label,
  badge,
  badgeVariant = 'outline',
  badgeClass = '',
  description,
  mutation,
  projectId,
}) {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

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
    try {
      await mutation.mutateAsync({ projectId, file });
      toast.success(`${label} uploaded successfully.`);
      setFile(null);
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

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-6 transition-all text-center',
          file
            ? 'border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10'
            : 'border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-muted/40',
        )}
      >
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            file
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {file ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        {file ? (
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
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Upload button */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || isPending}
          className="gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
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
};

export default function FinalPaperUpload({ projectId }) {
  const academicMutation = useUploadFinalAcademic();
  const journalMutation = useUploadFinalJournal();

  return (
    <Card className="border-border/70 shadow-xs">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Final Paper Submission
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Upload both required versions of your final capstone paper for institutional
              archiving.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {/* Info notice */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Capstone 4 requires both the Complete Academic Manuscript (internal/restricted) and the
            Publishable Journal Version (public repository). Ensure all final revisions from defense
            hearings are incorporated.
          </p>
        </div>

        <UploadSection
          icon={Lock}
          label="Full Academic Manuscript"
          badge="Restricted Access"
          badgeVariant="outline"
          badgeClass="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
          description="Complete academic manuscript with all 5 chapters, appendices, and references for faculty committee archives."
          mutation={academicMutation}
          projectId={projectId}
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
        />
      </CardContent>
    </Card>
  );
}

FinalPaperUpload.propTypes = {
  projectId: PropTypes.string.isRequired,
};
