import { useState } from 'react';
import { Loader2, ExternalLink, Maximize2, Minimize2, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';

/**
 * Common file viewer. Works natively for PDFs and images.
 * Uses Google Docs Viewer fallback for Office documents if on a public URL.
 */
export default function DocumentPreview({ fileUrl, fileName, fileType, className = '' }) {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);

  if (!fileUrl) return null;

  const isPdf = fileType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf');
  const isImage = fileType?.startsWith('image/');
  const isText = fileType?.includes('text') || fileName?.toLowerCase().endsWith('.txt');
  const isOffice =
    fileType?.includes('wordprocessingml') ||
    fileType?.includes('spreadsheetml') ||
    fileType?.includes('presentationml') ||
    fileName?.toLowerCase().endsWith('.docx') ||
    fileName?.toLowerCase().endsWith('.xlsx') ||
    fileName?.toLowerCase().endsWith('.pptx');

  const isLocalhost = fileUrl.includes('localhost') || fileUrl.includes('127.0.0.1');

  let viewSrc = fileUrl;
  let cannotPreview = false;

  if (isOffice) {
    if (isLocalhost) {
      cannotPreview = true;
    } else {
      viewSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    }
  } else if (!isPdf && !isImage && !isText) {
    cannotPreview = true;
  }

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (cannotPreview) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-muted/30 border border-border/60 rounded-md ${className}`}>
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Preview not available for this file type</p>
        <p className="text-xs text-muted-foreground mb-4">Please download the file to view its contents.</p>
        <Button asChild variant="outline" size="sm">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Download {fileName}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col border border-border/60 rounded-md overflow-hidden ${
        fullscreen ? 'fixed inset-0 z-50 bg-background' : 'relative'
      } ${className}`}
    >
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="font-medium text-foreground truncate">{fileName || 'Document'}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(fileUrl, '_blank')}
            title="Open in new tab / Download"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[500px] bg-muted/10">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading preview…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-8 bg-background">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load the preview. Please try opening it in a new tab.</AlertDescription>
            </Alert>
          </div>
        )}

        <iframe
          src={viewSrc}
          title={fileName || 'Document Preview'}
          className={`w-full h-full border-0 ${error ? 'hidden' : ''}`}
          onLoad={handleLoad}
          onError={handleError}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}

