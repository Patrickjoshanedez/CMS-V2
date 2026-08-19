import { useState, useRef } from 'react';
import { FileText, Lock, Globe, Upload, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadFinalAcademic, useUploadFinalJournal } from '@/hooks/useSubmissions';

function UploadSection({
  icon: Icon,
  iconColor,
  label,
  badge,
  badgeStyle,
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
    <div className="space-y-3 [font-family:var(--font-body)]">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{label}</h3>
        <span
          className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
          style={badgeStyle}
        >
          {badge}
        </span>
      </div>

      <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all',
          file
            ? 'border-[var(--color-ok)] bg-[color-mix(in_srgb,var(--color-ok)_7%,white)]'
            : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-neutral)]/50 hover:bg-[color-mix(in_srgb,var(--color-neutral)_5%,white)]',
        ].join(' ')}
      >
        <FileText
          className="h-8 w-8"
          style={{ color: file ? 'var(--color-ok)' : 'var(--color-text-secondary)' }}
        />
        {file ? (
          <span className="max-w-[280px] truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {file.name}
          </span>
        ) : (
          <span className="text-sm text-[var(--color-text-secondary)]">
            Click or drag a PDF file here
          </span>
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
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || isPending}
        className={[
          'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
          !file || isPending
            ? 'cursor-not-allowed bg-[color-mix(in_srgb,var(--color-sidebar)_70%,black)] text-white/80'
            : 'bg-[var(--color-sidebar)] text-white hover:bg-[color-mix(in_srgb,var(--color-sidebar)_85%,black)]',
        ].join(' ')}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload
          </>
        )}
      </button>
    </div>
  );
}

export default function FinalPaperUpload({ projectId }) {
  const academicMutation = useUploadFinalAcademic();
  const journalMutation = useUploadFinalJournal();

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm [font-family:var(--font-body)]">
      {/* Card header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] [font-family:var(--font-display)]">
          Final Paper Submission
        </h2>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          Upload both required versions of your final capstone paper for archiving.
        </p>
      </div>

      <div className="space-y-6 p-5">
        {/* Info notice */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-neutral)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Capstone 4 requires two final paper versions for archiving.
          </p>
        </div>

        <UploadSection
          icon={Lock}
          iconColor="var(--color-warn)"
          label="Full Academic Version"
          badge="Restricted"
          badgeStyle={{
            background: 'color-mix(in srgb, var(--color-warn) 14%, white)',
            color: 'var(--color-text-secondary)',
            border: '1px solid color-mix(in srgb, var(--color-warn) 30%, white)',
          }}
          description="The complete academic manuscript with all chapters and references. This will be restricted to faculty access only."
          mutation={academicMutation}
          projectId={projectId}
        />

        <div className="border-t border-[var(--color-border)]" />

        <UploadSection
          icon={Globe}
          iconColor="var(--color-neutral)"
          label="Journal / Publishable Version"
          badge="Public"
          badgeStyle={{
            background: 'color-mix(in srgb, var(--color-neutral) 12%, white)',
            color: 'var(--color-neutral)',
            border: '1px solid color-mix(in srgb, var(--color-neutral) 30%, white)',
          }}
          description="A condensed version suitable for publication. This will be publicly searchable in the archive."
          mutation={journalMutation}
          projectId={projectId}
        />
      </div>
    </div>
  );
}
