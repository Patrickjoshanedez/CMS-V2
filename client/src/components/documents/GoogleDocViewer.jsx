import { useState } from 'react';
import { Loader2, ExternalLink, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';

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
      className={`flex flex-col ${
        fullscreen ? 'fixed inset-0 z-50 bg-background' : 'relative'
      } ${className}`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {title && <span className="font-medium text-foreground">{title}</span>}
          {canEdit ? (
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Edit Mode
            </span>
          ) : (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              View Only
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(embedUrl, '_blank')}
            title="Open in new tab"
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

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading document…</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-1 items-center justify-center p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load the document. Please try opening it in a new tab.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={embedUrl}
        title={title || 'Google Document'}
        className={`flex-1 border-0 ${error ? 'hidden' : ''}`}
        style={{ minHeight: fullscreen ? '100%' : '70vh', width: '100%' }}
        onLoad={handleLoad}
        onError={handleError}
        allow="clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
