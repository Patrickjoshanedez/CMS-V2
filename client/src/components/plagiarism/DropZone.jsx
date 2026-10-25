import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FileText, UploadCloud, X, CheckCircle2, FileCheck2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '0 MB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DropZone({
  file = null,
  scanning = false,
  errorMessage = '',
  onFileSelected,
}) {
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        disabled={scanning}
        className="hidden"
        onChange={handleInputChange}
      />

      {file ? (
        /* File selected state - semantic card without nested button role */
        <Card
          className={[
            'relative rounded-xl p-5 text-center',
            errorMessage
              ? 'border-destructive/50 bg-destructive/5'
              : 'border-success/40 bg-success/5',
          ].join(' ')}
        >
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-success/20 bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="space-y-1 max-w-full px-2">
              <p className="text-sm font-semibold text-foreground truncate max-w-xs">{file.name}</p>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                  {isDocx ? 'DOCX' : 'PDF'}
                </Badge>
                <span aria-hidden="true">&bull;</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>

            {scanning ? (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary mt-1">
                <Spinner className="h-3.5 w-3.5" />
                <span>Preparing document…</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openPicker}
                  className="gap-1.5 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Change file
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onFileSelected(null)}
                  className="gap-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove file
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* Empty dropzone state */
        <Button
          type="button"
          variant="outline"
          disabled={scanning}
          aria-disabled={scanning}
          aria-label={isDragging ? 'Drop your document here' : 'Choose a manuscript file'}
          onClick={openPicker}
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
            'group relative h-auto min-h-40 w-full flex-col whitespace-normal rounded-xl border-2 border-dashed p-6 text-center shadow-none',
            'transition-colors duration-200',
            scanning ? 'cursor-wait opacity-80' : 'cursor-pointer',
            errorMessage
              ? 'border-destructive/50 bg-destructive/5'
              : isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/40',
          ].join(' ')}
        >
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
                or <span className="text-primary font-medium">browse files</span>
              </p>
            </div>
          </div>
        </Button>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="py-3">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}

DropZone.propTypes = {
  file: PropTypes.object,
  scanning: PropTypes.bool,
  errorMessage: PropTypes.string,
  onFileSelected: PropTypes.func.isRequired,
};
