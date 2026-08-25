import { useRef, useState } from 'react';
import { FileText, UploadCloud, X, CheckCircle2 } from 'lucide-react';

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
          'group relative rounded-2xl border-2 border-dashed p-8 text-center',
          'transition-all duration-200 outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
          scanning ? 'cursor-wait opacity-70' : 'cursor-pointer',
          errorMessage
            ? 'border-destructive/50 bg-destructive/5'
            : file
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : isDragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          disabled={scanning}
          className="hidden"
          onChange={handleInputChange}
        />

        {file ? (
          /* File selected state */
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} · PDF</p>
            </div>
            {!scanning && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelected(null);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-3">
            <div
              className={[
                'flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed transition-colors',
                isDragging ? 'border-primary bg-primary/10' : 'border-border bg-muted/50',
              ].join(' ')}
            >
              <UploadCloud
                className={[
                  'h-7 w-7 transition-colors',
                  isDragging ? 'text-primary' : 'text-muted-foreground',
                ].join(' ')}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {isDragging ? 'Drop your PDF here' : 'Drag & drop your PDF'}
              </p>
              <p className="text-xs text-muted-foreground">
                or <span className="text-primary font-medium">click to browse</span> · PDF only, max
                25 MB
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
