import { useRef, useState } from 'react';
import { FileText, UploadCloud } from 'lucide-react';

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '0 MB';
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
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (scanning) return;
    const droppedFile = event.dataTransfer.files?.[0] || null;
    onFileSelected(droppedFile);
  };

  const stateClass = errorMessage
    ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,white)]'
    : file
      ? 'border-[var(--color-ok)] bg-[color-mix(in_srgb,var(--color-ok)_7%,white)]'
      : 'border-[var(--color-border)] bg-white';

  return (
    <section className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!scanning) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={[
          'group rounded-xl border-2 border-dashed p-6 transition-all duration-200',
          'outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neutral)]/40',
          scanning
            ? 'cursor-wait opacity-80'
            : 'cursor-pointer hover:shadow-[0_0_0_1px_var(--color-neutral)]',
          stateClass,
          isDragging ? 'shadow-[0_0_0_2px_var(--color-neutral)]' : '',
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

        <div className="flex flex-col items-center justify-center gap-3 text-center [font-family:var(--font-body)]">
          {file ? (
            <>
              <FileText className="h-9 w-9 text-[var(--color-ok)]" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {file.name}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </>
          ) : (
            <>
              <UploadCloud
                className={[
                  'h-10 w-10 transition-colors',
                  isDragging ? 'text-[var(--color-neutral)]' : 'text-[var(--color-text-secondary)]',
                ].join(' ')}
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Drag and drop your PDF here
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  or click to choose a file (PDF only, up to 25 MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {errorMessage ? (
        <p className="text-sm font-medium text-[var(--color-accent)] [font-family:var(--font-body)]">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
