import { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

/**
 * GoogleDocViewer — Embeds a Google Document inside an iframe.
 *
 * Accepts the full embed URL (ending with /edit or /preview)
 * returned by the documents API, and renders it full-width
 * with a toolbar for open-in-new-tab and fullscreen toggle.
 *
 * @param {Object} props
 * @param {string} props.embedUrl   - Google Docs embed URL.
 * @param {string} [props.title]    - Document display title.
 * @param {boolean} [props.canEdit] - Whether the current user can edit (visual hint only).
 * @param {string} [props.className] - Additional wrapper classes.
 */
export default function GoogleDocViewer({ embedUrl, title, canEdit = false, className = '' }) {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);

  if (!embedUrl) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No document URL provided.</AlertDescription>
      </Alert>
    );
  }

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col',
        fullscreen ? 'fixed inset-0 z-50 bg-background' : 'relative',
        className,
      )}
    >
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="Document controls"
        className="flex min-w-0 items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2"
      >
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          {title && <span className="truncate font-medium text-foreground">{title}</span>}
          <Badge variant={canEdit ? 'success' : 'secondary'} className="shrink-0">
            {canEdit ? 'Edit mode' : 'View only'}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(embedUrl, '_blank', 'noopener,noreferrer')}
            aria-label="Open document in new tab"
            title="Open in new tab"
            className="min-h-11 min-w-11"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-pressed={fullscreen}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            size="icon"
            className="min-h-11 min-w-11"
          >
            {fullscreen ? (
              <Minimize2 aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Maximize2 aria-hidden="true" className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        style={{ minHeight: fullscreen ? '100vh' : '70vh' }}
      >
        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 p-4"
          >
            <span className="sr-only">Loading document</span>
            <div aria-hidden="true" className="w-full max-w-3xl space-y-4">
              <Skeleton className="h-6 w-2/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-[50vh] w-full rounded-md" />
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background p-4 sm:p-8">
            <Alert variant="destructive" role="alert">
              <AlertCircle aria-hidden="true" className="h-4 w-4" />
              <AlertDescription>
                Failed to load the document. Please try opening it in a new tab.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <iframe
          src={embedUrl}
          title={title || 'Google Document'}
          className={cn(
            'block h-[70vh] w-full border-0',
            fullscreen && 'h-full',
            error && 'hidden',
          )}
          onLoad={handleLoad}
          onErrorCapture={handleError}
          allow="clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
}
