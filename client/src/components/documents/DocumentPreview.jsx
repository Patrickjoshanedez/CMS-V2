import { useState } from 'react';
import {
  Loader2,
  ExternalLink,
  Maximize2,
  Minimize2,
  AlertCircle,
  FileText,
  MessageSquare,
} from 'lucide-react';

/**
 * Common file viewer with native PDF rendering, full-screen support,
 * and Google-Docs-style inline comments overlay (Louie Jay Labastida mandate).
 * Uses the CMS design-token system (var(--color-*)) for consistent theming.
 */
export default function DocumentPreview({
  fileUrl,
  fileName,
  fileType,
  comments = [],
  className = '',
}) {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);
  const [showComments, setShowComments] = useState(comments.length > 0);

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

  /* ── Cannot preview ─────────────────────────────────────── */
  if (cannotPreview) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-8 [font-family:var(--font-body)] ${className}`}
      >
        <FileText className="mb-3 h-10 w-10 text-[var(--color-text-secondary)]" />
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Preview not available for this file type
        </p>
        <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
          Please download the file to view its contents.
        </p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Download {fileName}
        </a>
      </div>
    );
  }

  /* ── Full viewer ────────────────────────────────────────── */
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] [font-family:var(--font-body)] ${
        fullscreen ? 'fixed inset-0 z-50 bg-[var(--color-surface)]' : 'relative'
      } ${className}`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
        <div className="flex items-center gap-2 overflow-hidden text-sm text-[var(--color-text-secondary)]">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate font-semibold text-[var(--color-text-primary)]">
            {fileName || 'Document'}
          </span>
          {comments.length > 0 && (
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">
              {comments.length} inline note{comments.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {comments.length > 0 && (
            <button
              type="button"
              onClick={() => setShowComments((prev) => !prev)}
              title="Toggle inline comments panel"
              className={[
                'inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors',
                showComments
                  ? 'bg-[var(--color-sidebar)] text-white'
                  : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]',
              ].join(' ')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Comments ({comments.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => window.open(fileUrl, '_blank')}
            title="Open in new tab / Download"
            className="rounded-md p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="rounded-md p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Viewer area */}
      <div className="relative flex min-h-[500px] flex-1 bg-[var(--color-bg)]">
        <div className="relative flex-1">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface)]/80">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-neutral)]" />
                <p className="text-sm text-[var(--color-text-secondary)]">Loading preview…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-8 bg-[var(--color-surface)]">
              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,white)] p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
                <p className="text-sm font-medium text-[var(--color-accent)]">
                  Failed to load the preview. Please try opening it in a new tab.
                </p>
              </div>
            </div>
          )}

          <iframe
            src={viewSrc}
            title={fileName || 'Document Preview'}
            className={`h-full w-full border-0 ${error ? 'hidden' : ''}`}
            onLoad={handleLoad}
            onError={handleError}
            allow="fullscreen"
          />
        </div>

        {/* Inline Comments Overlay Drawer */}
        {showComments && comments.length > 0 && (
          <aside className="flex w-80 shrink-0 flex-col space-y-3 overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                <MessageSquare className="h-3.5 w-3.5 text-[var(--color-neutral)]" />
                Inline Feedback ({comments.length})
              </h4>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                aria-label="Close comments"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col space-y-2.5">
              {comments.map((comment, idx) => (
                <div
                  key={comment._id || idx}
                  className="space-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 text-xs transition-colors hover:border-[var(--color-neutral)]/50"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-text-secondary)]">
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {comment.authorName || 'Faculty Panelist'}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 font-mono font-medium">
                      Page {comment.pageNumber || 1}
                    </span>
                  </div>
                  {comment.highlightText && (
                    <blockquote className="line-clamp-2 border-l-2 border-[var(--color-neutral)]/60 pl-2 text-[11px] italic text-[var(--color-text-secondary)]">
                      &ldquo;{comment.highlightText}&rdquo;
                    </blockquote>
                  )}
                  <p className="leading-relaxed text-[var(--color-text-primary)]">
                    {comment.commentText || comment.content}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
