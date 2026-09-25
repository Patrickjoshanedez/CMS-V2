import { useRef, useState } from 'react';
import { FileText, UploadCloud, X, CheckCircle2, Loader2, FileCheck2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '0 MB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DropZone({ file, scanning, errorMessage, onFileSelected }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = () => {
    if (scanning) return;
    fileInputRef.current?.click();
  };

  const handleInputChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    onFileSelected(nextFile);
    // Reset so same file can be re-selected
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (scanning) return;
    const droppedFile = event.dataTransfer.files?.[0] || null;
    onFileSelected(droppedFile);
  };

  const isDocx =
    file?.name?.toLowerCase().endsWith('.docx') ||
    file?.name?.toLowerCase().endsWith('.doc') ||
    file?.type?.includes('word');

  return (
    <section className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!scanning) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return;
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={[
          'group relative rounded-xl border-2 border-dashed p-6 text-center',
          'transition-colors duration-200 outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
          scanning ? 'cursor-wait opacity-80' : 'cursor-pointer',
          errorMessage
            ? 'border-destructive/50 bg-destructive/5'
            : file
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/40',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          disabled={scanning}
          className="hidden"
          onChange={handleInputChange}
        />

        {file ? (
          /* File selected state */
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-1 max-w-full px-2">
              <p className="text-sm font-semibold text-foreground truncate max-w-xs">{file.name}</p>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                  {isDocx ? 'DOCX' : 'PDF'}
                </Badge>
                <span>&bull;</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>

            {scanning ? (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary mt-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Preparing document…</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelected(null);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive mt-0.5"
              >
                <X className="h-3 w-3" />
                Remove file
              </button>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-2.5">
            <div
              className={[
                'flex h-11 w-11 items-center justify-center rounded-full border transition-colors',
                isDragging ? 'border-primary/60 bg-primary/15' : 'border-border/80 bg-muted/50',
              ].join(' ')}
            >
              <UploadCloud
                className={[
                  'h-5 w-5 transition-colors',
                  isDragging ? 'text-primary' : 'text-muted-foreground',
                ].join(' ')}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {isDragging ? 'Drop your document here' : 'Drag & drop manuscript here'}
              </p>
              <p className="text-xs text-muted-foreground">
                or <span className="text-primary font-medium">browse files</span> · PDF or Word
                (.docx), max 25 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          {errorMessage}
        </p>
      )}
    </section>
  );
}
